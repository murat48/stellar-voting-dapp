# Stellar Voting dApp

A decentralized voting application built on the **Stellar blockchain** using **Soroban smart contracts**. Users can connect their Stellar wallet, create proposals, and cast votes (Approve / Reject / Abstain) — all on-chain.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Smart Contract](#smart-contract)
  - [Contract Functions](#contract-functions)
  - [Vote Choices](#vote-choices)
  - [Proposal Data Structure](#proposal-data-structure)
- [Frontend](#frontend)
  - [Components](#components)
  - [Hooks](#hooks)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [Deploying the Contract](#deploying-the-contract)
- [Testing](#testing)
  - [Unit & Hook Tests](#unit--hook-tests-mocked)
  - [Integration Tests](#integration-tests-live-testnet)
- [Contract Details](#contract-details)
- [Wallet Support](#wallet-support)

---

## Overview

The dApp allows any Stellar account to:

- **Browse proposals** — view all active voting proposals with live vote counts
- **Vote** — cast Approve, Reject, or Abstain on any active proposal (one vote per address per proposal)
- **Create proposals** — submit new proposals directly on-chain (title + description)
- **View results** — see a live bar chart of vote distribution per proposal

After a vote is submitted the UI polls the RPC endpoint until the transaction is confirmed on-chain before updating the display — no page refresh needed. Wallet connection is persisted in `localStorage` so the session survives a page reload.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Rust · [Soroban SDK v22](https://docs.stellar.org/docs/smart-contracts) |
| Blockchain | Stellar Testnet · Soroban RPC |
| Frontend | React 18 · TypeScript · Vite 5 |
| Wallet Integration | [@creit.tech/stellar-wallets-kit v2](https://github.com/creit-tech/stellar-wallets-kit) |
| Stellar SDK | [@stellar/stellar-sdk v14](https://stellar.github.io/js-stellar-sdk/) |
| Testing | Vitest · @testing-library/react |

---


## 🚀 Live Demo

👉 [Try the App](https://stellar-voting-dapp-pi.vercel.app/) - https://stellar-voting-dapp-pi.vercel.app/

## 🎥 Demo Video

[![Watch the demo](https://img.youtube.com/vi/2eaIji-donk/maxresdefault.jpg)](https://youtu.be/2eaIji-donk)


## Test

<br>
<img src="/1.jpg" alt="" width="600"/><br>
<img src="/2.jpg" alt="" width="600"/><br>
<img src="/3.jpg" alt="" width="600"/><br>

## Project Structure

```
stellar-voting-dapp/
├── contracts/
│   └── voting/
│       ├── Cargo.toml              # Rust dependencies (soroban-sdk v22)
│       └── src/
│           └── lib.rs              # Smart contract source
├── src/
│   ├── components/
│   │   ├── CreateProposalForm.tsx  # On-chain proposal creation form
│   │   ├── ProposalCard.tsx        # Per-proposal vote UI
│   │   ├── ResultsChart.tsx        # Vote distribution bar chart
│   │   └── WalletConnect.tsx       # Wallet connect/disconnect button
│   ├── hooks/
│   │   ├── useVoting.ts            # All contract interactions
│   │   └── useWallet.ts            # Wallet state + localStorage persistence
│   ├── lib/
│   │   └── cache.ts                # In-memory TTL cache for RPC responses
│   ├── App.tsx                     # Root — 3 tabs: Proposals / Results / + Create
│   └── main.tsx
├── tests/
│   ├── cache.test.ts               # Unit tests for the TTL cache
│   ├── wallet.test.ts              # Hook tests for useWallet (mocked)
│   ├── useVoting.test.ts           # Hook tests for useVoting (mocked)
│   └── voting.test.ts              # Real integration tests against Stellar testnet
├── .env.example
├── vite.config.ts
└── package.json
```

---

## Smart Contract

Located in `contracts/voting/src/lib.rs`.

### Contract Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `initialize` | `admin: Address` | — | One-time setup; sets the admin. |
| `create_proposal` | `creator: Address, title: String, description: String` | `u32` | Creates a proposal. Requires creator auth. Returns proposal ID. |
| `vote` | `voter: Address, proposal_id: u32, choice: u32` | — | Casts a vote. Requires voter auth. Panics if already voted or proposal inactive. |
| `close_proposal` | `admin: Address, proposal_id: u32` | — | Deactivates a proposal. Admin only. |
| `get_proposal` | `proposal_id: u32` | `Proposal` | Returns full proposal data. |
| `get_proposal_count` | — | `u32` | Returns total number of proposals. |
| `get_vote` | `voter: Address, proposal_id: u32` | `u32` | Returns voter's choice (0/1/2), or **255** if not yet voted. |

### Vote Choices

| Value | Meaning |
|-------|---------|
| `0` | ✅ Approve |
| `1` | ❌ Reject |
| `2` | 🤔 Abstain |
| `255` | (sentinel) Not yet voted |

### Proposal Data Structure

```rust
pub struct Proposal {
    pub id: u32,
    pub title: String,
    pub description: String,
    pub approve_count: u32,
    pub reject_count: u32,
    pub abstain_count: u32,
    pub creator: Address,
    pub active: bool,
}
```

---

## Frontend

### Components

| Component | Description |
|-----------|-------------|
| `WalletConnect` | Displays the connected address (truncated). Connect/Disconnect buttons. |
| `ProposalCard` | Shows proposal details and three vote buttons. Highlights the user's current choice. Disabled when not connected or already voted. |
| `ResultsChart` | Horizontal bar chart: Approve (green) / Reject (red) / Abstain (gray). |
| `CreateProposalForm` | Title (max 80 chars) + Description (max 500 chars). Submits on-chain. Shows success/error inline. |

### Hooks

#### `useWallet()`

```ts
const { connected, address, loading, error, connect, disconnect, signTransaction } = useWallet();
```

- Persists `address` to `localStorage` key `stellar_connected_address` on connect; restored on page load.
- `signTransaction(xdr)` — signs a transaction XDR and returns the signed XDR string.

#### `useVoting(address: string | null)`

```ts
const { proposals, userVotes, loading, error, contractReady,
        fetchProposals, vote, createProposal } = useVoting(address);
```

- `proposals` — array of all `Proposal` objects fetched from the contract.
- `userVotes` — `Map<proposalId, choice>` of the connected wallet's existing votes.
- `vote(proposalId, choice, signFn)` — builds, signs, submits, and polls for confirmation.
- `createProposal(title, description, signFn)` — same flow for proposal creation.
- Both write functions poll `server.getTransaction(hash)` every 1.5 s until `SUCCESS`.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Rust** + `wasm32-unknown-unknown` target (for compiling the contract)
- **Stellar CLI** v25+ — `cargo install --locked stellar-cli --features opt`
- A Stellar wallet browser extension (e.g. [Freighter](https://freighter.app))

### Installation

```bash
git clone <repo-url>
cd stellar-voting-dapp
npm install
```

### Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_CONTRACT_ID=CDII4RCGEBAY4WTTZSSUQVL6KQFZHEBZIKCJPWGA7DY23FQYHCNIB2U4
```

### Running Locally

```bash
npm run dev
# → http://localhost:5173
```

---

## Deploying the Contract

```bash
# 1. Build the WASM
cd contracts/voting
cargo build --target wasm32-unknown-unknown --release

# 2. Deploy to testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/voting.wasm \
  --source <YOUR_SECRET_KEY> \
  --network testnet

# 3. Initialize (run once)
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <YOUR_SECRET_KEY> \
  --network testnet \
  -- initialize \
  --admin <YOUR_PUBLIC_KEY>

# 4. Set the contract ID in .env
echo "VITE_CONTRACT_ID=<CONTRACT_ID>" > .env
```

---

## Testing

All tests are in the `tests/` directory. Run them from inside the project:

```bash
npm test
# or with verbose output:
npm test -- --reporter=verbose
```

### Unit & Hook Tests (Mocked)

Fast tests with all Stellar SDK calls mocked. Run in ~5 seconds.

| File | Tests | What's covered |
|------|-------|---------------|
| `cache.test.ts` | 8 | TTL cache set / get / expire / invalidate / clear |
| `wallet.test.ts` | 8 | Connect, disconnect, localStorage persistence, signTransaction |
| `useVoting.test.ts` | 8 | Hook initial state, error throwing, function types |

### Integration Tests (Live Testnet)

Real end-to-end tests against the actual Stellar testnet — **no mocks**.

```bash
npm test -- tests/voting.test.ts
```

> Requires an internet connection. Takes ~20–30 seconds.

Each run:
1. Generates a fresh `Keypair.random()` account
2. Funds it via [Friendbot](https://friendbot.stellar.org)
3. Creates a real proposal on-chain
4. Casts a real Approve vote
5. Verifies the vote was recorded and the tally updated
6. Verifies a double-vote attempt is rejected

| Test | What it verifies |
|------|-----------------|
| fetches proposal count | Live `get_proposal_count` ≥ 1 |
| fetches proposal #1 | All fields present and correctly typed |
| get_vote returns 255 | Fresh account has no prior vote |
| creates a real proposal | Returns a new `u32` proposal ID |
| casts Approve (0) vote | Transaction confirmed on-chain |
| get_vote returns 0 | Vote stored correctly after voting |
| approve_count is 1 | Proposal tally incremented |
| double vote rejected | Second vote throws as expected |

---

## Contract Details

| Property | Value |
|----------|-------|
| Network | Stellar Testnet |
| RPC URL | `https://soroban-testnet.stellar.org` |
| Horizon URL | `https://horizon-testnet.stellar.org` |
| Network Passphrase | `Test SDF Network ; September 2015` |
| Contract ID | `CDII4RCGEBAY4WTTZSSUQVL6KQFZHEBZIKCJPWGA7DY23FQYHCNIB2U4` |
| Soroban SDK | `22.0.0` |

---

## Wallet Support

Supported via `@creit.tech/stellar-wallets-kit v2`:

- [Freighter](https://freighter.app)
- [xBull](https://xbull.app)
- [LOBSTR](https://lobstr.co)
- [Albedo](https://albedo.link)
- [Rabet](https://rabet.io)
- [Hana](https://hanawallet.io)

---

## License

MIT
