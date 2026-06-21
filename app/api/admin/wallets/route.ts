import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/adminAuth";
import { isAddress } from "viem";

export const dynamic = "force-dynamic";

// GET — list all admin wallets
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;

  const wallets = await prisma.adminWallet.findMany({ orderBy: { addedAt: "asc" } });
  return NextResponse.json({ wallets });
}

// POST — add a new admin wallet
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { walletAddress, label } = await req.json();
    if (!walletAddress || !isAddress(walletAddress)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }
    const wallet = await prisma.adminWallet.upsert({
      where: { walletAddress: walletAddress.toLowerCase() },
      create: { walletAddress: walletAddress.toLowerCase(), label: label ?? "", addedBy: auth.wallet, isActive: true },
      update: { isActive: true, label: label ?? "" },
    });
    return NextResponse.json({ ok: true, wallet });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

// DELETE — deactivate an admin wallet
export async function DELETE(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;

  const { walletAddress } = await req.json();
  if (!walletAddress) return NextResponse.json({ error: "Missing walletAddress" }, { status: 400 });

  // Cannot remove yourself
  if (walletAddress.toLowerCase() === auth.wallet.toLowerCase()) {
    return NextResponse.json({ error: "Cannot remove your own admin wallet" }, { status: 400 });
  }

  // Ensure at least one admin remains
  const activeCount = await prisma.adminWallet.count({ where: { isActive: true } });
  if (activeCount <= 1) {
    return NextResponse.json({ error: "Cannot remove the last admin wallet" }, { status: 400 });
  }

  await prisma.adminWallet.updateMany({
    where: { walletAddress: { equals: walletAddress, mode: "insensitive" } },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
