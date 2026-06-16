import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ l1: [], l2: [], l3: [], counts: { l1: 0, l2: 0, l3: 0 } });

  const user = await prisma.user.findFirst({
    where: { walletAddress: wallet },
    include: {
      referrals: {
        take: 100,
        orderBy: { createdAt: "desc" },
        include: {
          referrals: {
            take: 100,
            orderBy: { createdAt: "desc" },
            include: {
              referrals: {
                take: 100,
                orderBy: { createdAt: "desc" },
                select: { username: true, walletAddress: true, createdAt: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) return NextResponse.json({ l1: [], l2: [], l3: [], counts: { l1: 0, l2: 0, l3: 0 } });

  const pick = (u: { username: string; walletAddress: string; createdAt: Date }) => ({
    username: u.username,
    walletAddress: u.walletAddress,
    joinedAt: u.createdAt.toISOString(),
  });

  const l1 = user.referrals.map(pick);
  const l2 = user.referrals.flatMap((u) => u.referrals.map(pick));
  const l3 = user.referrals.flatMap((u) => u.referrals.flatMap((u2) => u2.referrals.map(pick)));

  return NextResponse.json({ l1, l2, l3, counts: { l1: l1.length, l2: l2.length, l3: l3.length } });
}
