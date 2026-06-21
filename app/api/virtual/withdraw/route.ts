import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "Missing wallet" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { walletAddress: { equals: wallet, mode: "insensitive" } },
  });
  if (!user) return NextResponse.json({ withdrawals: [] });

  const withdrawals = await prisma.virtualWithdrawal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ withdrawals });
}

export async function POST(req: NextRequest) {
  try {
    const { wallet, amount, assetType, toWallet } = await req.json();
    if (!wallet || !amount || assetType === undefined || !toWallet) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const user = await prisma.user.findFirst({
      where: { walletAddress: { equals: wallet, mode: "insensitive" } },
      include: { userBalance: true },
    });
    if (!user) return NextResponse.json({ error: "Wallet not registered" }, { status: 404 });

    const bal = user.userBalance;
    if (assetType === 0) {
      // AZR withdrawal
      if ((bal?.azrBalance ?? 0) < amt) {
        return NextResponse.json({ error: `Insufficient AZR balance (have ${(bal?.azrBalance ?? 0).toFixed(4)})` }, { status: 400 });
      }
    } else {
      // USDT withdrawal
      if ((bal?.usdtBalance ?? 0) < amt) {
        return NextResponse.json({ error: `Insufficient USDT balance (have ${(bal?.usdtBalance ?? 0).toFixed(4)})` }, { status: 400 });
      }
    }

    const [, withdrawal] = await prisma.$transaction([
      // Deduct balance immediately (hold funds)
      assetType === 0
        ? prisma.userBalance.update({ where: { userId: user.id }, data: { azrBalance:  { decrement: amt } } })
        : prisma.userBalance.update({ where: { userId: user.id }, data: { usdtBalance: { decrement: amt } } }),
      prisma.virtualWithdrawal.create({
        data: { userId: user.id, amount: amt, assetType, toWallet },
      }),
    ]);

    return NextResponse.json({ ok: true, withdrawal });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal error" }, { status: 500 });
  }
}
