import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query");
  if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const clean = query.replace(/\.azr$/, "").trim();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { walletAddress: { equals: clean, mode: "insensitive" } },
        { username: { equals: clean, mode: "insensitive" } },
      ],
    },
    include: {
      referredByUser: { select: { username: true, walletAddress: true, seqId: true } },
      referrals: { select: { username: true, walletAddress: true, seqId: true, createdAt: true } },
      stakes: { orderBy: { createdAt: "desc" } },
      withdrawals: { orderBy: { createdAt: "desc" } },
      referralEarnings: { orderBy: { createdAt: "desc" } },
      userCredit: true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const claimHistory = await prisma.claimHistory.findMany({
    where: { wallet: { equals: user.walletAddress, mode: "insensitive" } },
    orderBy: { claimedAt: "desc" },
  });

  const totalStaked = user.stakes
    .filter((s) => s.isActive)
    .reduce((sum, s) => sum + parseFloat(s.amount) / 1e18, 0);

  const totalCommissions = user.referralEarnings
    .reduce((sum, e) => sum + parseFloat(e.amount) / 1e18, 0);

  return NextResponse.json({ user, claimHistory, totalStaked, totalCommissions });
}
