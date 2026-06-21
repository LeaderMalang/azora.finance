import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Verify the requesting wallet is an active admin.
 * Reads wallet from X-Admin-Wallet header.
 * On first call, auto-seeds from ADMIN_WALLETS env var if no admins exist.
 */
export async function verifyAdmin(req: NextRequest): Promise<
  { ok: true; wallet: string } | { ok: false; response: NextResponse }
> {
  const wallet = req.headers.get("x-admin-wallet");
  if (!wallet) {
    return { ok: false, response: NextResponse.json({ error: "Admin authentication required" }, { status: 401 }) };
  }

  // Auto-seed admin wallets from env on first check
  const count = await prisma.adminWallet.count();
  if (count === 0) {
    const envWallets = (process.env.ADMIN_WALLETS ?? process.env.ADMIN_TREASURY_WALLET ?? "")
      .split(",")
      .map(w => w.trim().toLowerCase())
      .filter(w => w.startsWith("0x") && w.length === 42);

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

  if (!admin) {
    return { ok: false, response: NextResponse.json({ error: "Not authorized as admin" }, { status: 403 }) };
  }

  return { ok: true, wallet };
}
