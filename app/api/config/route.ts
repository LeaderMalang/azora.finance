import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  // DB value takes priority; fall back to env var for first-run / cPanel compatibility
  const treasuryWallet = settings.treasuryWallet || process.env.ADMIN_TREASURY_WALLET || "";
  return NextResponse.json({ treasuryWallet });
}
