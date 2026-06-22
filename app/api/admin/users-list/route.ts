import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;

  const search  = req.nextUrl.searchParams.get("search");
  const hasUpline = req.nextUrl.searchParams.get("hasUpline"); // "yes" | "no" | null
  const limit   = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50"), 200);
  const skip    = parseInt(req.nextUrl.searchParams.get("skip") ?? "0");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { walletAddress: { contains: search, mode: "insensitive" } },
      { username:      { contains: search, mode: "insensitive" } },
    ];
  }
  if (hasUpline === "yes") where.referredById = { not: null };
  if (hasUpline === "no")  where.referredById = null;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        seqId: true, username: true, walletAddress: true, createdAt: true,
        referredByUser: { select: { username: true, seqId: true } },
        userBalance: { select: { usdtBalance: true, azrBalance: true } },
        _count: { select: { virtualStakes: true, referrals: true } },
      },
      orderBy: { seqId: "asc" },
      take: limit,
      skip,
    }),
  ]);

  return NextResponse.json({ total, users });
}
