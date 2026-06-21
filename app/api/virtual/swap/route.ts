import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SWAP_RATE } from "@/lib/rpc";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { wallet, amount, direction } = await req.json();
    if (!wallet || !amount || !direction) {
      return NextResponse.json({ error: "Missing wallet, amount, or direction" }, { status: 400 });
    }
    if (direction !== "buy" && direction !== "sell") {
      return NextResponse.json({ error: "direction must be 'buy' or 'sell'" }, { status: 400 });
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const user = await prisma.user.findFirst({
      where: { walletAddress: { equals: wallet, mode: "insensitive" } },
    });
    if (!user) return NextResponse.json({ error: "Wallet not registered" }, { status: 404 });

    // Atomic transaction to prevent race-condition double-spend
    const result = await prisma.$transaction(async (tx) => {
      const bal = await tx.userBalance.findUnique({ where: { userId: user.id } });

      if (direction === "buy") {
        // USDT → AZR
        const currentUsdt = bal?.usdtBalance ?? 0;
        if (currentUsdt < amt) {
          throw new Error(`Insufficient USDT balance (have ${currentUsdt.toFixed(4)})`);
        }
        const azrOut = amt / SWAP_RATE;
        await tx.userBalance.upsert({
          where: { userId: user.id },
          create: { userId: user.id, usdtBalance: -amt, azrBalance: azrOut },
          update: { usdtBalance: { decrement: amt }, azrBalance: { increment: azrOut } },
        });
        return { usdtSpent: amt, azrReceived: azrOut };
      } else {
        // AZR → USDT
        const currentAzr = bal?.azrBalance ?? 0;
        if (currentAzr < amt) {
          throw new Error(`Insufficient AZR balance (have ${currentAzr.toFixed(4)})`);
        }
        const usdtOut = amt * SWAP_RATE;
        await tx.userBalance.upsert({
          where: { userId: user.id },
          create: { userId: user.id, azrBalance: -amt, usdtBalance: usdtOut },
          update: { azrBalance: { decrement: amt }, usdtBalance: { increment: usdtOut } },
        });
        return { azrSpent: amt, usdtReceived: usdtOut };
      }
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    const status = msg.startsWith("Insufficient") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
