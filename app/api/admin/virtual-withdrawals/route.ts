import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;

  const status  = req.nextUrl.searchParams.get("status");
  const search  = req.nextUrl.searchParams.get("search");
  const limit   = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50"), 200);
  const skip    = parseInt(req.nextUrl.searchParams.get("skip") ?? "0");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (status !== null && status !== "") where.status = Number(status);
  if (search) {
    where.user = {
      OR: [
        { walletAddress: { contains: search, mode: "insensitive" } },
        { username:      { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [total, withdrawals] = await Promise.all([
    prisma.virtualWithdrawal.count({ where }),
    prisma.virtualWithdrawal.findMany({
      where,
      include: { user: { select: { username: true, walletAddress: true, seqId: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
  ]);

  return NextResponse.json({ total, withdrawals });
}
