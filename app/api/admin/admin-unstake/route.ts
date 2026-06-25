import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;

  const { stakeId } = await req.json();
  if (!stakeId) return NextResponse.json({ error: "Missing stakeId" }, { status: 400 });

  const stake = await prisma.virtualStake.findUnique({ where: { id: Number(stakeId) } });
  if (!stake) return NextResponse.json({ error: "Stake not found" }, { status: 404 });
  if (!stake.isActive) return NextResponse.json({ error: "Stake already inactive" }, { status: 400 });

  // Calculate pending rewards using the same formula as the claim route
  const settings = await getSettings();
  const ratePerSec = settings.dailyRewardPct / 100 / 86400;
  const elapsed = Math.max(0, Date.now() / 1000 - stake.lastClaimTime.getTime() / 1000);
  const pendingRewards = stake.amount * ratePerSec * elapsed;
  const totalCredit = stake.amount + pendingRewards;

  await prisma.$transaction([
    // Mark stake inactive and zero out amount
    prisma.virtualStake.update({
      where: { id: stake.id },
      data: { isActive: false, amount: 0, lastClaimTime: new Date() },
    }),
    // Credit staked principal + accrued rewards back to user's AZR balance
    prisma.userBalance.upsert({
      where: { userId: stake.userId },
      create: { userId: stake.userId, azrBalance: totalCredit, usdtBalance: 0 },
      update: { azrBalance: { increment: totalCredit } },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    refunded: stake.amount,
    rewards: pendingRewards,
    total: totalCredit,
  });
}
