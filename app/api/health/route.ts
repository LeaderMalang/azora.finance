import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasDatabaseUrl = !!process.env.DATABASE_URL;

  if (!hasDatabaseUrl) {
    return NextResponse.json({ db: "error", message: "DATABASE_URL not configured" }, { status: 503 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    await (prisma as { $queryRaw: (q: TemplateStringsArray) => Promise<unknown> }).$queryRaw`SELECT 1`;
    return NextResponse.json({ db: "ok" });
  } catch (e) {
    // Return error message but never expose connection string
    const msg = e instanceof Error ? e.message : "Connection failed";
    const safe = msg.includes("password") || msg.includes("postgresql://")
      ? "Database connection failed"
      : msg;
    return NextResponse.json({ db: "error", message: safe }, { status: 503 });
  }
}
