import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");

  const withdrawals = await prisma.virtualWithdrawal.findMany({
    where: status !== null ? { status: Number(status) } : undefined,
    include: {
      user: { select: { username: true, walletAddress: true, seqId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ withdrawals });
}
