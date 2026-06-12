import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "Provide wallet" }, { status: 400 });

  const user = await prisma.user.findFirst({ where: { walletAddress: wallet } });
  if (!user) return NextResponse.json({ earnings: [], totals: { l1: 0, l2: 0, l3: 0 } });

  const earnings = await prisma.referralEarning.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totals = earnings.reduce<{ l1: number; l2: number; l3: number }>(
    (acc, e) => {
      const level = `l${e.level}` as "l1" | "l2" | "l3";
      acc[level] = (acc[level] ?? 0) + parseFloat(e.amount);
      return acc;
    },
    { l1: 0, l2: 0, l3: 0 }
  );

  return NextResponse.json({ earnings, totals });
}

export async function POST(req: NextRequest) {
  const { wallet, fromUser, level, amount, txHash } = await req.json();
  const user = await prisma.user.findFirst({ where: { walletAddress: wallet } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const earning = await prisma.referralEarning.create({
    data: { userId: user.id, fromUser, level, amount: String(amount), txHash },
  });
  return NextResponse.json(earning);
}
