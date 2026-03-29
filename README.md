# Stellar Voting DApp

A decentralised voting application built on the **Stellar / Soroban** smart-contract platform with a React + TypeScript front end.

## Stack

| Layer | Technology |
|---|---|
| Smart contract | Rust · Soroban SDK |
| Frontend | React 18 · TypeScript · Vite |
| Wallet | @creit-tech/stellar-wallets-kit (Freighter, xBull, …) |
| Stellar SDK | @stellar/stellar-sdk v12 |
| Tests | Vitest · @testing-library/react |

## Project structure

```
stellar-voting-dapp/
├── contracts/voting/       # Soroban smart contract (Rust)
│   ├── src/lib.rs
│   └── Cargo.toml
├── src/
│   ├── components/         # React UI components
│   │   ├── WalletConnect.tsx
│   │   ├── ProposalCard.tsx
│   │   └── ResultsChart.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useWallet.ts
│   │   └── useVoting.ts
│   ├── lib/
│   │   └── cache.ts        # In-memory TTL cache
│   ├── App.tsx
│   └── main.tsx
├── tests/                  # Unit tests
│   ├── wallet.test.ts
│   ├── voting.test.ts
│   └── cache.test.ts
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Getting started

### Prerequisites

- Node.js ≥ 18
- Rust + `cargo` (for contract compilation)
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli) (`stellar`)

### Install dependencies

```bash
npm install
```

### Environment variables

Create a `.env` file in the project root:

```env
VITE_CONTRACT_ID=<deployed-contract-id>
```

### Run development server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Run tests

```bash
npm test
```

### Build & deploy the smart contract

```bash
# Build
cd contracts/voting
cargo build --target wasm32-unknown-unknown --release

# Deploy to testnet (requires stellar CLI and funded account)
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/voting.wasm \
  --source <YOUR_KEY> \
  --network testnet
```

## Contract interface

| Function | Description |
|---|---|
| `initialize(admin)` | One-time setup, sets the admin address |
| `create_proposal(creator, title, description)` | Creates a new proposal, returns its ID |
| `vote(voter, proposal_id)` | Casts one vote per address per proposal |
| `close_proposal(admin, proposal_id)` | Deactivates a proposal |
| `get_proposal(proposal_id)` | Returns proposal data |
| `get_proposal_count()` | Returns total number of proposals |
| `has_voted(voter, proposal_id)` | Returns whether an address has voted |

## License

MIT
