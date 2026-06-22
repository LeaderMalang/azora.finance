import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;

  const asset  = req.nextUrl.searchParams.get("asset");   // azr | usdt | null
  const action = req.nextUrl.searchParams.get("action");  // credit | debit | null
  const search = req.nextUrl.searchParams.get("search");
  const limit  = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50"), 200);
  const skip   = parseInt(req.nextUrl.searchParams.get("skip") ?? "0");

  const where: Record<string, unknown> = {};
  if (asset)  where.asset  = asset;
  if (action) where.action = action;
  if (search) {
    where.user = {
      OR: [
        { walletAddress: { contains: search, mode: "insensitive" } },
        { username:      { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [total, adjustments] = await Promise.all([
    prisma.balanceAdjustment.count({ where }),
    prisma.balanceAdjustment.findMany({
      where,
      include: { user: { select: { username: true, walletAddress: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
  ]);

  return NextResponse.json({ total, adjustments });
}
