import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { isAddress } from "viem";

export const dynamic = "force-dynamic";

// Status values: 0=pending, 1=sent, 2=rejected (admin), 3=cancelled (user)

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

    // Validate destination wallet is a proper Ethereum/BSC address
    if (!isAddress(toWallet)) {
      return NextResponse.json({ error: "Invalid destination wallet address. Must be a valid BSC address (0x...)" }, { status: 400 });
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const settings = await getSettings();
    const assetLabel = assetType === 0 ? "AZR" : "USDT";

    if (settings.minWithdrawal > 0 && amt < settings.minWithdrawal) {
      return NextResponse.json({ error: `Minimum withdrawal is ${settings.minWithdrawal} ${assetLabel}` }, { status: 400 });
    }

    const feeAmt = settings.withdrawalFeePct > 0 ? amt * (settings.withdrawalFeePct / 100) : 0;
    const netAmt = Math.max(0, amt - feeAmt);

    if (netAmt <= 0) {
      return NextResponse.json({ error: "Amount is too small after fee deduction" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { walletAddress: { equals: wallet, mode: "insensitive" } },
    });
    if (!user) return NextResponse.json({ error: "Wallet not registered" }, { status: 404 });

    // Use atomic Prisma transaction with conditional update to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      const bal = await tx.userBalance.findUnique({ where: { userId: user.id } });
      const currentBal = assetType === 0 ? (bal?.azrBalance ?? 0) : (bal?.usdtBalance ?? 0);

      if (currentBal < amt) {
        throw new Error(`Insufficient ${assetLabel} balance (have ${currentBal.toFixed(4)})`);
      }

      const updatedBal = assetType === 0
        ? await tx.userBalance.update({ where: { userId: user.id }, data: { azrBalance: { decrement: amt } } })
        : await tx.userBalance.update({ where: { userId: user.id }, data: { usdtBalance: { decrement: amt } } });

      const withdrawal = await tx.virtualWithdrawal.create({
        data: { userId: user.id, amount: netAmt, fee: feeAmt, assetType, toWallet },
      });

      return { withdrawal, updatedBal };
    });

    return NextResponse.json({ ok: true, withdrawal: result.withdrawal, fee: feeAmt, netAmount: netAmt });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    const status = msg.startsWith("Insufficient") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// User cancels their own pending withdrawal — refunds balance atomically
export async function DELETE(req: NextRequest) {
  try {
    const { wallet, withdrawalId } = await req.json();
    if (!wallet || withdrawalId === undefined) {
      return NextResponse.json({ error: "Missing wallet or withdrawalId" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { walletAddress: { equals: wallet, mode: "insensitive" } },
    });
    if (!user) return NextResponse.json({ error: "Wallet not registered" }, { status: 404 });

    // Verify withdrawal belongs to this user and is still pending
    const withdrawal = await prisma.virtualWithdrawal.findUnique({
      where: { id: Number(withdrawalId) },
    });
    if (!withdrawal)                      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    if (withdrawal.userId !== user.id)    return NextResponse.json({ error: "Not your withdrawal" }, { status: 403 });
    if (withdrawal.status !== 0)          return NextResponse.json({ error: "Only pending withdrawals can be cancelled" }, { status: 400 });

    // Refund the full GROSS amount (net + fee) that was originally deducted from the balance
    const grossRefund = withdrawal.amount + withdrawal.fee;

    await prisma.$transaction([
      prisma.virtualWithdrawal.update({
        where: { id: withdrawal.id },
        data: { status: 3 },
      }),
      withdrawal.assetType === 0
        ? prisma.userBalance.update({ where: { userId: user.id }, data: { azrBalance:  { increment: grossRefund } } })
        : prisma.userBalance.update({ where: { userId: user.id }, data: { usdtBalance: { increment: grossRefund } } }),
    ]);

    return NextResponse.json({ ok: true, refunded: grossRefund });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal error" }, { status: 500 });
  }
}
