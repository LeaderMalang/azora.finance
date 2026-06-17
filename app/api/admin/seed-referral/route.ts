import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, referrerUsername } = await req.json();
    if (!walletAddress || !referrerUsername) {
      return NextResponse.json({ error: "Missing walletAddress or referrerUsername" }, { status: 400 });
    }

    const clean = referrerUsername.replace(/\.azr$/, "").toLowerCase();
    const referrer = await prisma.user.findFirst({
      where: { username: { equals: clean, mode: "insensitive" } },
    });
    if (!referrer) {
      return NextResponse.json({ error: `Referrer "${clean}" not found in DB — they must visit the app first` }, { status: 404 });
    }

    const referred = await prisma.user.findFirst({
      where: { walletAddress: { equals: walletAddress, mode: "insensitive" } },
    });
    if (!referred) {
      return NextResponse.json({ error: "Referred user not found in DB — they must visit the app first" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: referred.id },
      data: { referredById: referrer.id },
    });

    return NextResponse.json({ ok: true, updated: { username: updated.username, referredById: updated.referredById } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal error" }, { status: 500 });
  }
}
