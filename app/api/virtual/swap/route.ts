import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SWAP_RATE } from "@/lib/rpc";

export const dynamic = "force-dynamic";

// direction: "buy" = USDT→AZR, "sell" = AZR→USDT
export async function POST(req: NextRequest) {
  try {
    const { wallet, amount, direction } = await req.json();
    if (!wallet || !amount || !direction) {
      return NextResponse.json({ error: "Missing wallet, amount, or direction" }, { status: 400 });
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const user = await prisma.user.findFirst({
      where: { walletAddress: { equals: wallet, mode: "insensitive" } },
      include: { userBalance: true },
    });
    if (!user) return NextResponse.json({ error: "Wallet not registered" }, { status: 404 });

    const bal = user.userBalance ?? { usdtBalance: 0, azrBalance: 0 };

    if (direction === "buy") {
      // USDT → AZR: deduct USDT, credit AZR
      const azrOut = amt / SWAP_RATE;
      if (bal.usdtBalance < amt) {
        return NextResponse.json({ error: `Insufficient USDT balance (have ${bal.usdtBalance.toFixed(4)})` }, { status: 400 });
      }
      await prisma.userBalance.upsert({
        where: { userId: user.id },
        create: { userId: user.id, usdtBalance: -amt, azrBalance: azrOut },
        update: { usdtBalance: { decrement: amt }, azrBalance: { increment: azrOut } },
      });
      return NextResponse.json({ ok: true, usdtSpent: amt, azrReceived: azrOut });
    } else {
      // AZR → USDT: deduct AZR, credit USDT
      const usdtOut = amt * SWAP_RATE;
      if (bal.azrBalance < amt) {
        return NextResponse.json({ error: `Insufficient AZR balance (have ${bal.azrBalance.toFixed(4)})` }, { status: 400 });
      }
      await prisma.userBalance.upsert({
        where: { userId: user.id },
        create: { userId: user.id, azrBalance: -amt, usdtBalance: usdtOut },
        update: { azrBalance: { decrement: amt }, usdtBalance: { increment: usdtOut } },
      });
      return NextResponse.json({ ok: true, azrSpent: amt, usdtReceived: usdtOut });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal error" }, { status: 500 });
  }
}
