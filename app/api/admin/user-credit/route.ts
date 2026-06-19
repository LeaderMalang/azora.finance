import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "Missing wallet" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { walletAddress: { equals: wallet, mode: "insensitive" } },
    include: { userCredit: true },
  });
  if (!user) return NextResponse.json({ balance: 0 });
  return NextResponse.json({ balance: user.userCredit?.balance ?? 0 });
}

export async function POST(req: NextRequest) {
  try {
    const { wallet, delta } = await req.json();
    if (!wallet || delta === undefined || delta === null) {
      return NextResponse.json({ error: "Missing wallet or delta" }, { status: 400 });
    }
    const user = await prisma.user.findFirst({
      where: { walletAddress: { equals: wallet, mode: "insensitive" } },
    });
    if (!user) return NextResponse.json({ error: "User not found in DB" }, { status: 404 });

    const updated = await prisma.userCredit.upsert({
      where: { userId: user.id },
      create: { userId: user.id, balance: Number(delta) },
      update: { balance: { increment: Number(delta) } },
    });
    return NextResponse.json({ ok: true, balance: updated.balance });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal error" }, { status: 500 });
  }
}
