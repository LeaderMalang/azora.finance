import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [userCount, allEarnings] = await Promise.all([
    prisma.user.count(),
    prisma.referralEarning.findMany({ select: { amount: true } }),
  ]);

  const referralTotal = allEarnings
    .reduce((sum, e) => sum + parseFloat(e.amount), 0)
    .toFixed(4);

  return NextResponse.json({ userCount, referralTotal });
}
