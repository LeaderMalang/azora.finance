import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DAILY_RATE = 0.007;
const RATE_PER_SEC = DAILY_RATE / 86400;
const LOCK_DAYS = parseInt(process.env.VIRTUAL_LOCK_DAYS ?? "150");
const MIN_STAKE = parseFloat(process.env.VIRTUAL_MIN_STAKE ?? "50");

function pendingFor(stake: { amount: number; lastClaimTime: Date; isActive: boolean }) {
  if (!stake.isActive) return 0;
  const elapsed = (Date.now() / 1000) - (stake.lastClaimTime.getTime() / 1000);
  return stake.amount * RATE_PER_SEC * Math.max(0, elapsed);
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "Missing wallet" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { walletAddress: { equals: wallet, mode: "insensitive" } },
    include: { virtualStakes: { orderBy: { createdAt: "desc" } } },
  });
  if (!user) return NextResponse.json({ stakes: [] });

  const stakes = user.virtualStakes.map((s) => ({
    ...s,
    startTime: s.startTime.toISOString(),
    lastClaimTime: s.lastClaimTime.toISOString(),
    unlockTime: s.unlockTime.toISOString(),
    createdAt: s.createdAt.toISOString(),
    pendingRewards: pendingFor(s),
    unlocked: Date.now() >= s.unlockTime.getTime(),
  }));

  return NextResponse.json({ stakes, lockDays: LOCK_DAYS, minStake: MIN_STAKE });
}

export async function POST(req: NextRequest) {
  try {
    const { wallet, amount } = await req.json();
    if (!wallet || !amount) return NextResponse.json({ error: "Missing wallet or amount" }, { status: 400 });

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < MIN_STAKE) {
      return NextResponse.json({ error: `Minimum stake is ${MIN_STAKE} AZR` }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { walletAddress: { equals: wallet, mode: "insensitive" } },
      include: { userBalance: true },
    });
    if (!user) return NextResponse.json({ error: "Wallet not registered" }, { status: 404 });

    const azrBal = user.userBalance?.azrBalance ?? 0;
    if (azrBal < amt) {
      return NextResponse.json({ error: `Insufficient AZR balance (have ${azrBal.toFixed(4)})` }, { status: 400 });
    }

    const now = new Date();
    const unlockTime = new Date(now.getTime() + LOCK_DAYS * 86400 * 1000);

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

    return NextResponse.json({ ok: true, stake });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal error" }, { status: 500 });
  }
}
