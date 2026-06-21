import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { username, walletAddress, referralUsername } = await req.json();

    if (!username || !walletAddress) {
      return NextResponse.json({ error: "Missing username or walletAddress" }, { status: 400 });
    }

    const clean = username.toLowerCase().replace(/\.azr$/, "").replace(/[^a-z0-9_.]/g, "");
    if (!clean || clean.length > 32) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }

    let referredById: string | undefined;
    if (referralUsername) {
      const referrer = await prisma.user.findFirst({
        where: { username: { equals: referralUsername.replace(/\.azr$/, ""), mode: "insensitive" } },
      });
      if (referrer) referredById = referrer.id;
    }

    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: referredById ? { referredById } : {},
      create: { username: clean, walletAddress, referredById },
    });

    return NextResponse.json(user);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    if (msg.includes("Unique constraint") || msg.includes("P2002")) {
      return NextResponse.json({ error: "Username or wallet already registered" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const wallet   = req.nextUrl.searchParams.get("wallet");
    const username = req.nextUrl.searchParams.get("username");
    if (!wallet && !username) return NextResponse.json({ user: null });
    const user = await prisma.user.findFirst({
      where: wallet
        ? { walletAddress: { equals: wallet, mode: "insensitive" } }
        : { username: { equals: username!, mode: "insensitive" } },
      select: { username: true, referredByUser: { select: { username: true } } },
    });
    return NextResponse.json({ user: user ?? null });
  } catch (e) {
    console.error("[api/users GET]", e instanceof Error ? e.message : e);
    return NextResponse.json({ user: null }); // 200 so browser doesn't error-out
  }
}
