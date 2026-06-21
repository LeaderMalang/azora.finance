import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    treasuryWallet: process.env.ADMIN_TREASURY_WALLET ?? "",
  });
}
