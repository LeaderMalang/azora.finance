import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerPublicClient, USDT_ADDRESS } from "@/lib/rpc";
import { getSettings } from "@/lib/settings";
import { parseEventLogs } from "viem";

export const dynamic = "force-dynamic";

const TRANSFER_EVENT = {
  name: "Transfer",
  type: "event",
  inputs: [
    { name: "from",  type: "address", indexed: true },
    { name: "to",    type: "address", indexed: true },
    { name: "value", type: "uint256", indexed: false },
  ],
} as const;

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "97");

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "Missing wallet" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { walletAddress: { equals: wallet, mode: "insensitive" } },
  });
  if (!user) return NextResponse.json({ deposits: [] });

  const deposits = await prisma.deposit.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ deposits });
}

export async function POST(req: NextRequest) {
  try {
    const { txHash, wallet } = await req.json();
    if (!txHash || !wallet) {
      return NextResponse.json({ error: "Missing txHash or wallet" }, { status: 400 });
    }
    // Get treasury wallet from DB (admin-configurable), fallback to env var
    const settings = await getSettings();
    const TREASURY_WALLET = (settings.treasuryWallet || process.env.ADMIN_TREASURY_WALLET || "").toLowerCase();

    if (!TREASURY_WALLET) {
      return NextResponse.json({ error: "Treasury wallet not configured" }, { status: 500 });
    }

    const user = await prisma.user.findFirst({
      where: { walletAddress: { equals: wallet, mode: "insensitive" } },
    });
    if (!user) return NextResponse.json({ error: "Wallet not registered. Please visit the app first." }, { status: 404 });

    // Check already processed
    const existing = await prisma.deposit.findUnique({ where: { txHash } });
    if (existing) return NextResponse.json({ error: "This transaction has already been credited." }, { status: 409 });

    // Verify on-chain
    const client = getServerPublicClient();
    let receipt;
    try {
      receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
    } catch {
      return NextResponse.json({ error: "Transaction not found on chain. Make sure it is confirmed." }, { status: 400 });
    }

    if (receipt.status !== "success") {
      return NextResponse.json({ error: "Transaction failed on-chain." }, { status: 400 });
    }

    // Parse Transfer events
    const transferLogs = parseEventLogs({
      abi: [TRANSFER_EVENT] as const,
      logs: receipt.logs,
    });

    const usdtAddr = USDT_ADDRESS[chainId].toLowerCase();
    const match = transferLogs.find(
      (log) =>
        log.address.toLowerCase() === usdtAddr &&
        (log.args.to as string).toLowerCase() === TREASURY_WALLET
    );

    if (!match) {
      return NextResponse.json(
        { error: "No USDT transfer to the staking wallet found in this transaction. Make sure you sent USDT (BSC/BEP-20) to the correct address." },
        { status: 400 }
      );
    }

    const amountEther = Number(match.args.value) / 1e18;

    // Credit user balance
    await prisma.$transaction([
      prisma.userBalance.upsert({
        where: { userId: user.id },
        create: { userId: user.id, usdtBalance: amountEther, azrBalance: 0 },
        update: { usdtBalance: { increment: amountEther } },
      }),
      prisma.deposit.create({
        data: {
          userId: user.id,
          txHash,
          amount: amountEther,
          status: 1,
          confirmedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({ ok: true, credited: amountEther });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal error" }, { status: 500 });
  }
}
