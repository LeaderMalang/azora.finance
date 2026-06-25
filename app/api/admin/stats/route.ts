import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;

  const [userCount, allEarnings, totalStakedAgg, usdtAgg, azrAgg] = await Promise.all([
    prisma.user.count(),
    prisma.referralEarning.findMany({ select: { amount: true } }),
    prisma.virtualStake.aggregate({ _sum: { amount: true }, where: { isActive: true } }),
    prisma.userBalance.aggregate({ _sum: { usdtBalance: true } }),
    prisma.userBalance.aggregate({ _sum: { azrBalance: true } }),
  ]);

  // Amounts are stored in wei (1e18 scale) — divide to get AZR
  const referralTotal = allEarnings
    .reduce((sum, e) => sum + parseFloat(e.amount) / 1e18, 0)
    .toFixed(4);

  return NextResponse.json({
    userCount,
    referralTotal,
    totalActiveStaked: totalStakedAgg._sum.amount ?? 0,
    totalUsdtBalance: usdtAgg._sum.usdtBalance ?? 0,
    totalAzrBalance: azrAgg._sum.azrBalance ?? 0,
  });
}
