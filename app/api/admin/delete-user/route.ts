import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // Clear referredById on any users this user referred (avoid FK violation)
    await tx.user.updateMany({ where: { referredById: userId }, data: { referredById: null } });
    // Delete all child records in FK dependency order
    await tx.balanceAdjustment.deleteMany({ where: { userId } });
    await tx.virtualWithdrawal.deleteMany({ where: { userId } });
    await tx.virtualStake.deleteMany({ where: { userId } });
    await tx.deposit.deleteMany({ where: { userId } });
    await tx.referralEarning.deleteMany({ where: { userId } });
    await tx.userBalance.deleteMany({ where: { userId } });
    await tx.withdrawal.deleteMany({ where: { userId } });
    await tx.stake.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
  });

  return NextResponse.json({ ok: true, deleted: user.username });
}
