import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;
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
      referredByUser:  { select: { username: true, walletAddress: true, seqId: true } },
      referrals:       { select: { username: true, walletAddress: true, seqId: true, createdAt: true } },
      virtualStakes:   { orderBy: { createdAt: "desc" } },
      virtualWithdrawals: { orderBy: { createdAt: "desc" } },
      deposits:        { orderBy: { createdAt: "desc" } },
      referralEarnings: { orderBy: { createdAt: "desc" } },
      userBalance:     true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const claimHistory = await prisma.claimHistory.findMany({
    where: { wallet: { equals: user.walletAddress, mode: "insensitive" } },
    orderBy: { claimedAt: "desc" },
  });

  const totalStaked = user.virtualStakes
    .filter((s) => s.isActive)
    .reduce((sum, s) => sum + s.amount, 0);

  const totalCommissions = user.referralEarnings
    .reduce((sum, e) => sum + parseFloat(e.amount) / 1e18, 0);

  const totalClaims = claimHistory
    .reduce((sum, c) => sum + parseFloat(c.amount) / 1e18, 0);

  const totalDeposited = user.deposits
    .filter((d) => d.status === 1)
    .reduce((sum, d) => sum + d.amount, 0);

  return NextResponse.json({ user, claimHistory, totalStaked, totalCommissions, totalClaims, totalDeposited });
}
