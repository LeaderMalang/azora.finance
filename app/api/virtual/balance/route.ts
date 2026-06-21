import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "Missing wallet" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { walletAddress: { equals: wallet, mode: "insensitive" } },
    include: { userBalance: true },
  });

  if (!user) return NextResponse.json({ usdtBalance: 0, azrBalance: 0 });

  return NextResponse.json({
    usdtBalance: user.userBalance?.usdtBalance ?? 0,
    azrBalance:  user.userBalance?.azrBalance  ?? 0,
  });
}
