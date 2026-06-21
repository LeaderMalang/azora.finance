import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "Missing wallet" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { walletAddress: { equals: wallet, mode: "insensitive" } },
    include: { userBalance: true },
  });
  if (!user) return NextResponse.json({ usdtBalance: 0, azrBalance: 0, found: false });

  return NextResponse.json({
    found: true,
    username: user.username,
    usdtBalance: user.userBalance?.usdtBalance ?? 0,
    azrBalance:  user.userBalance?.azrBalance  ?? 0,
  });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const { wallet, asset, amount, action } = await req.json();
    if (!wallet || !asset || amount === undefined || !action) {
      return NextResponse.json({ error: "Missing fields (wallet, asset, amount, action)" }, { status: 400 });
    }
    if (action !== "credit" && action !== "debit") {
      return NextResponse.json({ error: "action must be 'credit' or 'debit'" }, { status: 400 });
    }
    if (asset !== "azr" && asset !== "usdt") {
      return NextResponse.json({ error: "asset must be 'azr' or 'usdt'" }, { status: 400 });
    }

    const amt = Math.abs(parseFloat(amount));
    if (isNaN(amt) || amt <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const user = await prisma.user.findFirst({
      where: { walletAddress: { equals: wallet, mode: "insensitive" } },
      include: { userBalance: true },
    });
    if (!user) return NextResponse.json({ error: "User not found in DB" }, { status: 404 });

    // Guard: debit cannot exceed balance (prevents negative for user-facing ops)
    if (action === "debit") {
      const currentBal = asset === "usdt"
        ? (user.userBalance?.usdtBalance ?? 0)
        : (user.userBalance?.azrBalance ?? 0);
      if (currentBal < amt) {
        return NextResponse.json({
          error: `Debit exceeds balance. Current ${asset.toUpperCase()}: ${currentBal.toFixed(4)}`,
        }, { status: 400 });
      }
    }

    const delta = action === "credit" ? amt : -amt;

    const updated = await prisma.userBalance.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        usdtBalance: asset === "usdt" ? delta : 0,
        azrBalance:  asset === "azr"  ? delta : 0,
      },
      update: asset === "usdt"
        ? { usdtBalance: { increment: delta } }
        : { azrBalance:  { increment: delta } },
    });

    return NextResponse.json({
      ok: true,
      usdtBalance: updated.usdtBalance,
      azrBalance:  updated.azrBalance,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal error" }, { status: 500 });
  }
}
