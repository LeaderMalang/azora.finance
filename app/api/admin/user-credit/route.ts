// This route is deprecated — use /api/admin/adjust-balance instead
// Kept as a redirect for backward compatibility
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ balance: 0 });

  const user = await prisma.user.findFirst({
    where: { walletAddress: { equals: wallet, mode: "insensitive" } },
    include: { userBalance: true },
  });
  if (!user) return NextResponse.json({ balance: 0 });
  // Return combined balance for legacy callers
  const total = (user.userBalance?.azrBalance ?? 0) + (user.userBalance?.usdtBalance ?? 0);
  return NextResponse.json({ balance: total });
}

export async function POST(req: NextRequest) {
  // Forward to adjust-balance
  const body = await req.json();
  return NextResponse.json({ error: "Use /api/admin/adjust-balance instead", body }, { status: 410 });
}
