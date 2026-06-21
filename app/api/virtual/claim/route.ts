import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const RATE_PER_SEC = 0.007 / 86400;

function pendingFor(amount: number, lastClaimTime: Date): number {
  const elapsed = (Date.now() / 1000) - (lastClaimTime.getTime() / 1000);
  return amount * RATE_PER_SEC * Math.max(0, elapsed);
}

export async function POST(req: NextRequest) {
  try {
    const { wallet, stakeId } = await req.json();
    if (!wallet) return NextResponse.json({ error: "Missing wallet" }, { status: 400 });

    const user = await prisma.user.findFirst({
      where: { walletAddress: { equals: wallet, mode: "insensitive" } },
      include: { virtualStakes: { where: { isActive: true } } },
    });
    if (!user) return NextResponse.json({ error: "Wallet not registered" }, { status: 404 });

    const now = new Date();
    let stakes = user.virtualStakes;
    if (stakeId !== undefined) {
      stakes = stakes.filter((s) => s.id === Number(stakeId));
    }
    if (stakes.length === 0) return NextResponse.json({ error: "No active stakes to claim" }, { status: 400 });

    let totalPending = 0;
    const claimHistoryRows: { wallet: string; stakeId: number; amount: string; txHash: string }[] = [];

    for (const s of stakes) {
      const pending = pendingFor(s.amount, s.lastClaimTime);
      if (pending <= 0) continue;
      totalPending += pending;
      const amountWei = BigInt(Math.floor(pending * 1e18)).toString();
      claimHistoryRows.push({
        wallet: user.walletAddress,
        stakeId: s.id,
        amount: amountWei,
        txHash: `virtual-${randomUUID()}`,
      });
    }

    if (totalPending <= 0) {
      return NextResponse.json({ error: "Nothing to claim yet" }, { status: 400 });
    }

    await prisma.$transaction([
      // Update all claim times
      ...stakes.map((s) =>
        prisma.virtualStake.update({ where: { id: s.id }, data: { lastClaimTime: now } })
      ),
      // Credit AZR balance
      prisma.userBalance.upsert({
        where: { userId: user.id },
        create: { userId: user.id, azrBalance: totalPending, usdtBalance: 0 },
        update: { azrBalance: { increment: totalPending } },
      }),
      // Save claim history rows
      prisma.claimHistory.createMany({ data: claimHistoryRows }),
    ]);

    return NextResponse.json({ ok: true, claimed: totalPending });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal error" }, { status: 500 });
  }
}
