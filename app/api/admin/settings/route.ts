import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const raw = await req.json();
    const {
      minStakeAzr, lockDays, dailyRewardPct, minWithdrawal,
      withdrawalFeePct, referralRateL1, referralRateL2, referralRateL3,
    } = raw;

    // Validate bounds
    if (withdrawalFeePct !== undefined && (withdrawalFeePct < 0 || withdrawalFeePct > 50))
      return NextResponse.json({ error: "Withdrawal fee must be 0–50%" }, { status: 400 });
    if (dailyRewardPct !== undefined && (dailyRewardPct < 0 || dailyRewardPct > 20))
      return NextResponse.json({ error: "Daily reward must be 0–20%" }, { status: 400 });
    if (lockDays !== undefined && (lockDays < 1 || lockDays > 3650))
      return NextResponse.json({ error: "Lock days must be 1–3650" }, { status: 400 });
    if (minStakeAzr !== undefined && minStakeAzr < 0)
      return NextResponse.json({ error: "Min stake cannot be negative" }, { status: 400 });
    const totalRef = (referralRateL1 ?? 0) + (referralRateL2 ?? 0) + (referralRateL3 ?? 0);
    if (totalRef > 50)
      return NextResponse.json({ error: "Total referral rates (L1+L2+L3) cannot exceed 50%" }, { status: 400 });

    const updated = await prisma.appSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        minStakeAzr:      minStakeAzr      ?? 50,
        lockDays:         lockDays         ?? 150,
        dailyRewardPct:   dailyRewardPct   ?? 0.7,
        minWithdrawal:    minWithdrawal    ?? 0,
        withdrawalFeePct: withdrawalFeePct ?? 0,
        referralRateL1:   referralRateL1   ?? 5,
        referralRateL2:   referralRateL2   ?? 3,
        referralRateL3:   referralRateL3   ?? 1,
      },
      update: {
        ...(minStakeAzr      !== undefined && { minStakeAzr }),
        ...(lockDays         !== undefined && { lockDays }),
        ...(dailyRewardPct   !== undefined && { dailyRewardPct }),
        ...(minWithdrawal    !== undefined && { minWithdrawal }),
        ...(withdrawalFeePct !== undefined && { withdrawalFeePct }),
        ...(referralRateL1   !== undefined && { referralRateL1 }),
        ...(referralRateL2   !== undefined && { referralRateL2 }),
        ...(referralRateL3   !== undefined && { referralRateL3 }),
      },
    });
    return NextResponse.json({ ok: true, settings: updated });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
