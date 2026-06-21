import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;
  const [userCount, allEarnings] = await Promise.all([
    prisma.user.count(),
    prisma.referralEarning.findMany({ select: { amount: true } }),
  ]);

  const referralTotal = allEarnings
    .reduce((sum, e) => sum + parseFloat(e.amount), 0)
    .toFixed(4);

  return NextResponse.json({ userCount, referralTotal });
}
