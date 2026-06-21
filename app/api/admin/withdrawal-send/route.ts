import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const { withdrawalId, sentTxHash, action } = await req.json();
    if (!withdrawalId || !action) {
      return NextResponse.json({ error: "Missing withdrawalId or action" }, { status: 400 });
    }

    const existing = await prisma.virtualWithdrawal.findUnique({ where: { id: Number(withdrawalId) } });
    if (!existing) return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    if (existing.status !== 0) return NextResponse.json({ error: "Withdrawal already processed" }, { status: 400 });

    if (action === "send") {
      const updated = await prisma.virtualWithdrawal.update({
        where: { id: Number(withdrawalId) },
        data: { status: 1, sentTxHash: sentTxHash ?? null },
      });
      return NextResponse.json({ ok: true, withdrawal: updated });
    }

    if (action === "reject") {
      // Refund balance on rejection
      const updated = await prisma.virtualWithdrawal.update({
        where: { id: Number(withdrawalId) },
        data: { status: 2 },
      });
      // Restore balance
      await prisma.userBalance.update({
        where: { userId: existing.userId },
        data: existing.assetType === 0
          ? { azrBalance:  { increment: existing.amount } }
          : { usdtBalance: { increment: existing.amount } },
      });
      return NextResponse.json({ ok: true, withdrawal: updated });
    }

    return NextResponse.json({ error: "Invalid action (use send or reject)" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal error" }, { status: 500 });
  }
}
