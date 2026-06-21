import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Internal secret — POST is only callable from server-side (stake route)
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "azora-internal-2024";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "Provide wallet" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { walletAddress: { equals: wallet, mode: "insensitive" } },
    include: { referredByUser: true },
  });
  if (!user) return NextResponse.json({ earnings: [], totals: { l1: 0, l2: 0, l3: 0 }, uplineUsername: null });

  const earnings = await prisma.referralEarning.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const totals = earnings.reduce<{ l1: number; l2: number; l3: number }>(
    (acc, e) => {
      const level = `l${e.level}` as "l1" | "l2" | "l3";
      acc[level] = (acc[level] ?? 0) + parseFloat(e.amount) / 1e18;
      return acc;
    },
    { l1: 0, l2: 0, l3: 0 }
  );

  return NextResponse.json({ earnings, totals, uplineUsername: user.referredByUser?.username ?? null });
}

export async function POST(req: NextRequest) {
  // Only server-side (stake route) can call this — verify internal secret
  const secret = req.headers.get("x-internal-secret");
  if (secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { wallet, fromUser, level, amount, txHash } = await req.json();
    if (!wallet || !fromUser || !level || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({ where: { walletAddress: { equals: wallet, mode: "insensitive" } } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (txHash) {
      const existing = await prisma.referralEarning.findFirst({ where: { userId: user.id, txHash } });
      if (existing) return NextResponse.json(existing, { status: 200 });
    }

    const earning = await prisma.referralEarning.create({
      data: { userId: user.id, fromUser, level, amount: String(amount), txHash },
    });
    return NextResponse.json(earning);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal error" }, { status: 500 });
  }
}
