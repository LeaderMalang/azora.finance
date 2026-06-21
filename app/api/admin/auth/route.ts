import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET ?wallet=0x... — check if a wallet is an admin
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ isAdmin: false });

  // Trigger auto-seed on first call
  const count = await prisma.adminWallet.count();
  if (count === 0) {
    const envWallets = (process.env.ADMIN_WALLETS ?? process.env.ADMIN_TREASURY_WALLET ?? "")
      .split(",").map(w => w.trim().toLowerCase()).filter(w => w.startsWith("0x") && w.length === 42);
    if (envWallets.length > 0) {
      await prisma.adminWallet.createMany({
        data: envWallets.map(w => ({ walletAddress: w, label: "Initial admin", addedBy: "system" })),
        skipDuplicates: true,
      });
    }
  }

  const admin = await prisma.adminWallet.findFirst({
    where: { walletAddress: { equals: wallet, mode: "insensitive" }, isActive: true },
  });
  return NextResponse.json({ isAdmin: !!admin });
}

// GET /api/admin/wallets — list all admin wallets (admin only)
// POST /api/admin/wallets — add admin wallet (admin only)
// These are handled in the /admin/wallets route file
