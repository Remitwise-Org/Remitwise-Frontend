# ✺ MERIDIAN
> *Where real-world effort meets on-chain value. Work. Earn. Grow.*

---

## What is MERIDIAN?

MERIDIAN is a **productivity-powered on-chain economy** built on the Stellar blockchain. It transforms the work you already do — focus sessions, streaks, daily consistency — into verifiable on-chain progression, streaming payroll, and yield-backed rewards.

No speculation. No trading. Just effort, rewarded.

Think of it as three things working as one:

- A **focus and habit engine** that turns deep work into XP and on-chain pet progression
- A **payroll streaming protocol** that pays workers per second, not per month
- A **no-loss reward pool** where consistent users compete for yield — never principal

Everything is connected through a single wallet, a single identity, and a unified on-chain economy on Stellar.

---

## Why Stellar?

MERIDIAN is purpose-built on Stellar because the chain was built for real people and real payments:

- **⚡ Fast** — 3–5 second finality, sessions and payroll confirmed instantly
- **💸 Near-zero fees** — micro-rewards and per-second streaming are only viable here
- **🌍 Global** — designed for the underbanked and emerging markets from day one
- **🦀 Smart** — Soroban brings expressive Rust contracts to power complex logic
- **🤝 Native assets** — XLM and custom tokens flow without bridges or wrappers

---

## The Three Pillars

---

### 01 — FOCUS
*Turn deep work into on-chain progression.*

Set a focus timer — 10, 25, or 45 minutes — and stay present. When the session ends, your on-chain companion receives XP and your streak is preserved. Neglect it and health decays. Nurture it and watch it evolve through five stages — Egg, Baby, Teen, Adult, Elder — driven purely by real-world consistency.

**Key mechanics:**
- XP earned per session, recorded on-chain via Soroban contract
- Pet health decays every 24 hours — daily effort is required to maintain progress
- Streak bonuses add XP multipliers for consecutive daily sessions
- Night owl bonus (midnight–6 AM) applies a 1.1x XP multiplier
- Supercharge mode streams XLM to a community yield pool in real time — pausing health decay and boosting XP

**Supercharge tiers:**

| Tier | Rate | XP Multiplier |
|---|---|---|
| Gentle Flow | 1 XLM/mo | 1.2x |
| Power Surge | 5 XLM/mo | 1.4x |
| Max Overdrive | 10 XLM/mo | 1.7x |

**Shop** — spend earned tokens on food, shields, energy drinks, revivals, and cosmetics. 10% of all shop transactions flow to the community yield pool.

---

### 02 — STREAM
*Payroll that flows like water — per second, not per month.*

MERIDIAN Stream is a payroll streaming protocol for the Stellar ecosystem. Employers deposit stablecoins and open a payment stream. Employees accrue earnings every second and withdraw at any time — no waiting for month-end, no banking delays, no middlemen.

Built for the millions of gig workers, freelancers, and remote employees in emerging markets who can't afford to wait 30 days to access money they've already earned.

**How it works:**
1. Employer deposits funds into a MERIDIAN Stream vault (Soroban contract)
2. A per-second stream rate is set per employee
3. Employees see their balance tick up in real time and withdraw anytime
4. Sub-cent transaction fees on Stellar make micro-withdrawals practical

**Supported assets:** XLM, USDC (Stellar), and any Stellar-issued stablecoin

---

### 03 — POOL
*A no-loss prize pool for consistent contributors.*

Every week, MERIDIAN aggregates XP earned across the network. The top performers earn entries into a yield lottery — funded by the community supercharge streams and shop fees. The yield goes to one winner. The principal stays with everyone.

No one loses their stake. Ever.

| Rank | Reward |
|---|---|
| Top 5 | Trophy NFT (Soroban-minted, monthly) |
| Pool winner | Full weekly yield payout |
| All participants | Principal fully preserved |

---

## Identity & Trust

Users who complete identity verification receive a verified badge on their leaderboard profile. Verification uses a privacy-preserving proof — no biometric data is stored by MERIDIAN. Verified users receive bonus XP multipliers and appear distinctly on the global leaderboard.

The leaderboard is fully public. No wallet required to view rankings, pet stages, streaks, or verified status.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind v4 |
| Auth | Stellar Wallets Kit + embedded wallet support |
| Blockchain | Stellar Network |
| Contracts | Rust — Soroban smart contracts |
| Payment streaming | Stellar payment channels + Soroban vault contracts |
| Backend | Supabase (leaderboard, session sync) |
| Notifications | Web Push API + scheduled triggers |
| Animations | Framer Motion |

---

## Smart Contracts (Soroban / Rust)

```
contracts/
├── focus_engine/       ← XP computation, session recording, pet state
├── stream_vault/       ← Payroll deposit, per-second streaming, withdrawals
├── prize_pool/         ← Yield aggregation, lottery resolution, NFT minting
├── shop/               ← Item purchases, fee routing to pool
└── identity/           ← Verified badge management
```

All contracts are written in Rust, compiled to WASM, and deployed on Stellar Soroban. Open-source and fully auditable. No admin upgrade keys on core contracts.

---

## Project Structure

```
meridian/
├── contracts/          ← Soroban Rust contracts
├── app/
│   ├── src/
│   │   ├── app/        ← Next.js App Router pages + API routes
│   │   ├── components/ ← UI components (pet view, timer, stream dashboard)
│   │   ├── hooks/      ← Stellar SDK + app-specific React hooks
│   │   └── utils/      ← XP formulas, pet stage logic, stream calculators
│   └── public/         ← Pet sprites, shop assets, icons
└── sdk/                ← TypeScript helpers for integrators
```

---

## Getting Started

```bash
git clone https://github.com/your-org/meridian.git
cd meridian/app
cp .env.example .env.local
npm install
npm run dev
```

**Required environment variables:** Stellar network config, Soroban RPC URL, Supabase URL + anon key, deployed contract addresses, WalletConnect project ID.

---

## Use Cases

- **Remote workers** — get paid every second, withdraw when you need it
- **Freelancers** — transparent, on-chain proof of work and payment
- **Students & builders** — build focus habits and earn on-chain progression
- **Communities** — run shared yield pools funded by collective productivity
- **Emerging markets** — low-fee, real-time payroll where banking infrastructure is weak

---

## The Vision

MERIDIAN exists for a simple reason — effort should be its own economy.

The work you do every day has value. Your focus has value. Your consistency has value. MERIDIAN makes that value visible, portable, and rewarded — on a chain fast enough to keep up with real life.

---

## Organization

**MERIDIAN** is maintained by a small core team and open to contributors across all three pillars. Each contract, each service, and each frontend module is independently contributable.

Built on Stellar. Open by default. Rewarding by design.

---

MIT License
