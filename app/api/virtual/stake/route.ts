import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function pendingFor(stake: { amount: number; lastClaimTime: Date; isActive: boolean }, ratePerSec: number) {
  if (!stake.isActive) return 0;
  const elapsed = (Date.now() / 1000) - (stake.lastClaimTime.getTime() / 1000);
  return stake.amount * ratePerSec * Math.max(0, elapsed);
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "Missing wallet" }, { status: 400 });

  const [user, settings] = await Promise.all([
    prisma.user.findFirst({
      where: { walletAddress: { equals: wallet, mode: "insensitive" } },
      include: { virtualStakes: { orderBy: { createdAt: "desc" } } },
    }),
    getSettings(),
  ]);

  const base = {
    lockDays: settings.lockDays,
    minStake: settings.minStakeAzr,
    dailyRewardPct: settings.dailyRewardPct,
  };
  if (!user) return NextResponse.json({ stakes: [], ...base });

  const ratePerSec = settings.dailyRewardPct / 100 / 86400;
  const stakes = user.virtualStakes.map((s) => ({
    ...s,
    startTime: s.startTime.toISOString(),
    lastClaimTime: s.lastClaimTime.toISOString(),
    unlockTime: s.unlockTime.toISOString(),
    createdAt: s.createdAt.toISOString(),
    pendingRewards: pendingFor(s, ratePerSec),
    unlocked: Date.now() >= s.unlockTime.getTime(),
  }));

  return NextResponse.json({ stakes, ...base });
}

export async function POST(req: NextRequest) {
  try {
    const { wallet, amount } = await req.json();
    if (!wallet || !amount) return NextResponse.json({ error: "Missing wallet or amount" }, { status: 400 });

    const [settings, user] = await Promise.all([
      getSettings(),
      prisma.user.findFirst({
        where: { walletAddress: { equals: wallet, mode: "insensitive" } },
        include: {
          userBalance: true,
          referredByUser: {
            include: {
              referredByUser: {
                include: { referredByUser: true },
              },
            },
          },
        },
      }),
    ]);

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < settings.minStakeAzr) {
      return NextResponse.json({ error: `Minimum stake is ${settings.minStakeAzr} AZR` }, { status: 400 });
    }
    if (!user) return NextResponse.json({ error: "Wallet not registered" }, { status: 404 });

    const azrBal = user.userBalance?.azrBalance ?? 0;
    if (azrBal < amt) {
      return NextResponse.json({ error: `Insufficient AZR balance (have ${azrBal.toFixed(4)})` }, { status: 400 });
    }

    const now = new Date();
    const unlockTime = new Date(now.getTime() + settings.lockDays * 86400 * 1000);

    // Create stake and deduct balance
    const [, stake] = await prisma.$transaction([
      prisma.userBalance.upsert({
        where: { userId: user.id },
        create: { userId: user.id, azrBalance: -amt, usdtBalance: 0 },
        update: { azrBalance: { decrement: amt } },
      }),
      prisma.virtualStake.create({
        data: { userId: user.id, amount: amt, startTime: now, lastClaimTime: now, unlockTime },
      }),
    ]);

    // Distribute referral commissions (non-blocking — don't fail the stake if commissions error)
    try {
      const referralLevels = [
        { referrer: user.referredByUser, rate: settings.referralRateL1, level: 1 },
        { referrer: user.referredByUser?.referredByUser, rate: settings.referralRateL2, level: 2 },
        { referrer: user.referredByUser?.referredByUser?.referredByUser, rate: settings.referralRateL3, level: 3 },
      ];

      for (const { referrer, rate, level } of referralLevels) {
        if (!referrer || rate <= 0) continue;
        const commission = amt * (rate / 100);
        await prisma.$transaction([
          prisma.userBalance.upsert({
            where: { userId: referrer.id },
            create: { userId: referrer.id, azrBalance: commission, usdtBalance: 0 },
            update: { azrBalance: { increment: commission } },
          }),
          prisma.referralEarning.create({
            data: {
              userId: referrer.id,
              fromUser: user.walletAddress,
              level,
              amount: BigInt(Math.floor(commission * 1e18)).toString(),
            },
          }),
        ]);
      }
    } catch (commErr) {
      console.error("[stake commissions]", commErr);
    }

    return NextResponse.json({ ok: true, stake });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal error" }, { status: 500 });
  }
}
