import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "Missing wallet" }, { status: 400 });

  const records = await prisma.claimHistory.findMany({
    where: { wallet: { equals: wallet, mode: "insensitive" } },
    orderBy: { claimedAt: "desc" },
  });
  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  try {
    const { wallet, stakeId, amount, txHash } = await req.json();
    if (!wallet || stakeId === undefined || !amount || !txHash) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    await prisma.claimHistory.upsert({
      where: { txHash },
      create: { wallet, stakeId, amount, txHash },
      update: {},
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal error" }, { status: 500 });
  }
}
