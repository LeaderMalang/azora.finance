# Azora — Frontend

Next.js 14 (App Router) frontend for the Azora AI-powered staking platform on BNB Smart Chain.

---

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| Framework | Next.js (App Router) | 14.2 |
| Styling | Tailwind CSS + CSS custom properties | 3.4 |
| i18n | next-intl (path-based: `/en`, `/es`, `/zh`, `/ar`) | 4.x |
| Wallet | wagmi + @web3modal/wagmi | 3.6 / 5.1 |
| Chain | viem | 2.x |
| State | Zustand (chain preference) | 5.x |
| Theme | next-themes (dark/light) | 0.4 |
| Database | Prisma + PostgreSQL (Neon) | 7.x |
| Auth | JWT via jose + bcryptjs | — |

---

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx               # Root layout — imports globals.css
│   ├── page.tsx                 # Redirects / → /en
│   └── [locale]/
│       ├── layout.tsx           # Locale layout — Providers, RevealObserver
│       ├── page.tsx             # Landing page
│       ├── loading.tsx          # Landing page route loader
│       └── app/
│           ├── layout.tsx       # App shell — AppSidebar, ConnectModal gate
│           ├── loading.tsx      # App section route loader
│           ├── dashboard/
│           ├── stake/
│           ├── swap/
│           ├── withdrawals/
│           └── referrals/
├── components/
│   ├── landing/                 # Hero, StatsBar, HowItWorks, Features,
│   │                            #   YieldCalculator, ReferralProgram,
│   │                            #   FAQ, CTABand, Footer, LandingNav,
│   │                            #   AuroraBackground
│   ├── app/                     # AppSidebar, AppTopbar, ConnectModal
│   ├── ui/                      # Spinner, Skeleton, Toast
│   └── RevealObserver.tsx       # Scroll-reveal IntersectionObserver bootstrap
├── lib/
│   ├── contracts.ts             # Contract addresses + ABIs
│   ├── wagmi.ts                 # wagmi config + targetChain
│   ├── hooks.ts                 # useActiveChain, useToast
│   └── store.ts                 # Zustand store (activeChainId)
├── messages/                    # i18n JSON files (en, es, zh, ar)
├── prisma/                      # Prisma schema (referral tracking)
├── tailwind.config.ts           # Custom tokens, keyframes, animations
└── app/globals.css              # CSS variables, component helpers, scroll-reveal
```

---

## Environment Variables

Create a `.env.local` file in `frontend/`:

```env
# WalletConnect — get from https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Chain: 97 = BSC Testnet, 56 = BSC Mainnet
NEXT_PUBLIC_CHAIN_ID=97

# Public URL (used for metadata / OG)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Neon (or any PostgreSQL) connection string
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require

# Random secret for JWT signing — generate with: openssl rand -base64 48
JWT_SECRET=your_jwt_secret
```

---

## Getting Started

```bash
cd frontend
npm install

# Push the Prisma schema to your database (first run)
npx prisma db push

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the root redirects to `/en`.

---

## Contract Addresses (BSC Testnet)

| Contract | Address |
|---|---|
| Staking + Registry | `0x8BcC54F3587ea804fE3054B3eB75D77cf23C240d` |
| AZR Token (ERC-20) | `0x45490483797889A8Be1946CE0013DA0b9F1ADae6` |

Switch to mainnet by setting `NEXT_PUBLIC_CHAIN_ID=56` and updating `CONTRACTS[56]` in `lib/contracts.ts`.

---

## Supported Languages

| Code | Language |
|---|---|
| `en` | English (default) |
| `es` | Spanish |
| `zh` | Chinese (Simplified) |
| `ar` | Arabic |

Translation strings live in `messages/<locale>.json`. Add a new locale by adding a JSON file and updating the `locales` array in `i18n/request.ts` and `middleware.ts`.

---

## Key Design Decisions

**Scroll reveal** — `RevealObserver.tsx` adds `.js` to `<html>` on mount and sets up an `IntersectionObserver`. Elements with class `reveal` (and optional stagger delays `d1`/`d2`/`d3`) animate in using a CSS `@keyframes revealAnim` animation (not `transition`) so hover transitions on the same elements are never overridden.

**Wallet gate** — `app/[locale]/app/layout.tsx` calls `getUserInfo` on-chain when a wallet is connected. The `ConnectModal` stays visible until `isRegistered` (from `getUserInfo`) is `true`, ensuring new users complete username registration before accessing the app.

**Chain handling** — `useActiveChain()` returns the connected wallet's chain when connected, and falls back to the Zustand-persisted preference when disconnected. All contract reads/writes key off this.

**SSR safety** — Web3Modal is initialised inside `useEffect` to avoid SSR crashes. The app shell shows a spinner until `mounted` is true (wagmi hydrated).

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Run `prisma generate` then `next build` |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Deployment

See [DEPLOY.md](./DEPLOY.md) for the full Docker / Nginx self-hosted deployment guide.

For Vercel, set the five environment variables listed above in the Vercel dashboard and connect the repo. The build command is `prisma generate && next build`.
