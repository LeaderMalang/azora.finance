import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function createNeonClient() {
  const url = process.env.NEON_DATABASE_URL;
  if (!url) return null;
  const pool = new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 8000 });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// GET — returns record counts from local DB and Neon
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;
  const hasNeon = !!process.env.NEON_DATABASE_URL;

  const [localUsers, localDeposits, localStakes, localWithdrawals, localClaims, localEarnings] =
    await Promise.all([
      prisma.user.count(),
      prisma.deposit.count(),
      prisma.virtualStake.count(),
      prisma.virtualWithdrawal.count(),
      prisma.claimHistory.count(),
      prisma.referralEarning.count(),
    ]);

  const local = { users: localUsers, deposits: localDeposits, virtualStakes: localStakes, virtualWithdrawals: localWithdrawals, claimHistory: localClaims, referralEarnings: localEarnings };

  if (!hasNeon) {
    return NextResponse.json({ local, neon: null, hasNeonUrl: false });
  }

  const neon = createNeonClient();
  if (!neon) return NextResponse.json({ local, neon: null, hasNeonUrl: false });

  try {
    const [neonUsers, neonDeposits, neonStakes, neonWithdrawals, neonClaims, neonEarnings] =
      await Promise.all([
        neon.user.count(),
        neon.deposit.count(),
        neon.virtualStake.count(),
        neon.virtualWithdrawal.count(),
        neon.claimHistory.count(),
        neon.referralEarning.count(),
      ]);
    return NextResponse.json({
      local,
      neon: { users: neonUsers, deposits: neonDeposits, virtualStakes: neonStakes, virtualWithdrawals: neonWithdrawals, claimHistory: neonClaims, referralEarnings: neonEarnings },
      hasNeonUrl: true,
    });
  } catch (e) {
    return NextResponse.json({ local, neon: null, hasNeonUrl: true, neonError: e instanceof Error ? e.message : String(e) });
  } finally {
    await neon.$disconnect().catch(() => {});
  }
}

// POST — sync all data from Neon into local DB
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;
  const neonUrl = process.env.NEON_DATABASE_URL;
  if (!neonUrl) {
    return NextResponse.json({ error: "NEON_DATABASE_URL is not set. Add it to your environment variables." }, { status: 400 });
  }

  const neon = createNeonClient()!;
  const synced: Record<string, number> = {};

  try {
    // 1. Sync Users (upsert by walletAddress)
    const neonUsers = await neon.user.findMany({ include: { referredByUser: { select: { walletAddress: true } } } });
    const neonIdToLocalId: Record<string, string> = {};

    // First pass: create/update users without referredById (to avoid FK issues)
    for (const u of neonUsers) {
      const local = await prisma.user.upsert({
        where: { walletAddress: u.walletAddress },
        create: { username: u.username, walletAddress: u.walletAddress, seqId: u.seqId, createdAt: u.createdAt, updatedAt: u.updatedAt },
        update: { username: u.username, updatedAt: u.updatedAt },
      });
      neonIdToLocalId[u.id] = local.id;
    }

    // Second pass: wire up referral relationships
    for (const u of neonUsers) {
      if (u.referredByUser?.walletAddress) {
        const localUser = await prisma.user.findFirst({ where: { walletAddress: u.walletAddress } });
        const localReferrer = await prisma.user.findFirst({ where: { walletAddress: u.referredByUser.walletAddress } });
        if (localUser && localReferrer) {
          await prisma.user.update({ where: { id: localUser.id }, data: { referredById: localReferrer.id } });
        }
      }
    }
    synced.users = neonUsers.length;

    // 2. Sync UserBalance (upsert by userId)
    const neonBalances = await neon.userBalance.findMany();
    for (const b of neonBalances) {
      const localUserId = neonIdToLocalId[b.userId];
      if (!localUserId) continue;
      await prisma.userBalance.upsert({
        where: { userId: localUserId },
        create: { userId: localUserId, usdtBalance: b.usdtBalance, azrBalance: b.azrBalance },
        update: { usdtBalance: b.usdtBalance, azrBalance: b.azrBalance },
      });
    }
    synced.userBalances = neonBalances.length;

    // 4. Sync Deposits (upsert by txHash)
    const neonDeposits = await neon.deposit.findMany();
    for (const d of neonDeposits) {
      const localUserId = neonIdToLocalId[d.userId];
      if (!localUserId) continue;
      await prisma.deposit.upsert({
        where: { txHash: d.txHash },
        create: { userId: localUserId, txHash: d.txHash, amount: d.amount, status: d.status, createdAt: d.createdAt, confirmedAt: d.confirmedAt },
        update: { amount: d.amount, status: d.status },
      });
    }
    synced.deposits = neonDeposits.length;

    // 5. Sync VirtualStakes (delete+recreate per user — no natural unique key)
    const neonStakes = await neon.virtualStake.findMany();
    const affectedUserIds = Array.from(new Set(neonStakes.map(s => neonIdToLocalId[s.userId]).filter(Boolean))) as string[];
    if (affectedUserIds.length > 0) {
      await prisma.virtualStake.deleteMany({ where: { userId: { in: affectedUserIds } } });
    }
    for (const s of neonStakes) {
      const localUserId = neonIdToLocalId[s.userId];
      if (!localUserId) continue;
      await prisma.virtualStake.create({
        data: { userId: localUserId, amount: s.amount, startTime: s.startTime, lastClaimTime: s.lastClaimTime, unlockTime: s.unlockTime, isActive: s.isActive, createdAt: s.createdAt },
      });
    }
    synced.virtualStakes = neonStakes.length;

    // 6. Sync VirtualWithdrawals (delete+recreate per user)
    const neonWds = await neon.virtualWithdrawal.findMany();
    const wdUserIds = Array.from(new Set(neonWds.map(w => neonIdToLocalId[w.userId]).filter(Boolean))) as string[];
    if (wdUserIds.length > 0) {
      await prisma.virtualWithdrawal.deleteMany({ where: { userId: { in: wdUserIds } } });
    }
    for (const w of neonWds) {
      const localUserId = neonIdToLocalId[w.userId];
      if (!localUserId) continue;
      await prisma.virtualWithdrawal.create({
        data: { userId: localUserId, amount: w.amount, assetType: w.assetType, toWallet: w.toWallet, status: w.status, sentTxHash: w.sentTxHash, createdAt: w.createdAt },
      });
    }
    synced.virtualWithdrawals = neonWds.length;

    // 7. Sync ClaimHistory (upsert by txHash+stakeId — wallet-based, no userId)
    const neonClaims = await neon.claimHistory.findMany();
    for (const c of neonClaims) {
      await prisma.claimHistory.upsert({
        where: { txHash_stakeId: { txHash: c.txHash, stakeId: c.stakeId } },
        create: { wallet: c.wallet, stakeId: c.stakeId, amount: c.amount, txHash: c.txHash, claimedAt: c.claimedAt },
        update: { amount: c.amount },
      });
    }
    synced.claimHistory = neonClaims.length;

    // 8. Sync ReferralEarnings (delete+recreate per user)
    const neonEarnings = await neon.referralEarning.findMany();
    const earnUserIds = Array.from(new Set(neonEarnings.map(e => neonIdToLocalId[e.userId]).filter(Boolean))) as string[];
    if (earnUserIds.length > 0) {
      await prisma.referralEarning.deleteMany({ where: { userId: { in: earnUserIds } } });
    }
    for (const e of neonEarnings) {
      const localUserId = neonIdToLocalId[e.userId];
      if (!localUserId) continue;
      await prisma.referralEarning.create({
        data: { userId: localUserId, fromUser: e.fromUser, level: e.level, amount: e.amount, txHash: e.txHash, createdAt: e.createdAt },
      });
    }
    synced.referralEarnings = neonEarnings.length;

    return NextResponse.json({ ok: true, synced });
  } catch (e) {
    console.error("[sync-neon]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Sync failed" }, { status: 500 });
  } finally {
    await neon.$disconnect().catch(() => {});
  }
}
