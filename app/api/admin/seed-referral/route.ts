import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, referrerUsername, referredUsername } = await req.json();
    if (!walletAddress || !referrerUsername) {
      return NextResponse.json({ error: "Missing walletAddress or referrerUsername" }, { status: 400 });
    }

    const cleanReferrer = referrerUsername.replace(/\.azr$/, "").toLowerCase();
    const referrer = await prisma.user.findFirst({
      where: { username: { equals: cleanReferrer, mode: "insensitive" } },
    });
    if (!referrer) {
      return NextResponse.json({ error: `Referrer "${cleanReferrer}" not found in DB — they must visit the app first` }, { status: 404 });
    }

    let referred = await prisma.user.findFirst({
      where: { walletAddress: { equals: walletAddress, mode: "insensitive" } },
    });

    if (!referred) {
      if (!referredUsername) {
        return NextResponse.json(
          { error: "User not found in DB. Enter their username in the third field to create their profile." },
          { status: 404 }
        );
      }
      const cleanReferred = referredUsername.replace(/\.azr$/, "").toLowerCase();
      referred = await prisma.user.upsert({
        where: { username: cleanReferred },
        create: { username: cleanReferred, walletAddress },
        update: { walletAddress },
      });
    }

    if (referrer.seqId >= referred.seqId) {
      return NextResponse.json(
        { error: `Cannot set upline: ${referrer.username} joined at #${referrer.seqId} but ${referred.username} is #${referred.seqId}. Upline must have joined earlier.` },
        { status: 400 }
      );
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
