import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MIGRATIONS = [
  {
    id: "VirtualWithdrawal.fee",
    sql: `ALTER TABLE "VirtualWithdrawal" ADD COLUMN IF NOT EXISTS fee DOUBLE PRECISION NOT NULL DEFAULT 0`,
  },
  {
    id: "AppSettings.treasuryWallet",
    sql: `ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "treasuryWallet" TEXT NOT NULL DEFAULT ''`,
  },
];

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;

  const results: { id: string; status: "ok" | "error"; message?: string }[] = [];

  for (const m of MIGRATIONS) {
    try {
      await prisma.$executeRawUnsafe(m.sql);
      results.push({ id: m.id, status: "ok" });
    } catch (e) {
      results.push({ id: m.id, status: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }

  const allOk = results.every((r) => r.status === "ok");
  return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 207 });
}
