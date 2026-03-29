import { useState, useEffect, useCallback } from "react";
import * as StellarSdk from "@stellar/stellar-sdk";
import type { Proposal } from "../components/ProposalCard";
import { cache } from "../lib/cache";

const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID as string;
const HORIZON_URL = "https://horizon-testnet.stellar.org";
const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

const server = new StellarSdk.rpc.Server(RPC_URL);
const horizon = new StellarSdk.Horizon.Server(HORIZON_URL);

export function useVoting(address: string | null) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [votedIds, setVotedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cacheKey = "proposals";
      const cached = cache.get<Proposal[]>(cacheKey);
      if (cached) {
        setProposals(cached);
        setLoading(false);
        return;
      }

      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const countResult = await server.simulateTransaction(
        buildTx(contract.call("get_proposal_count"))
      );

      const count = StellarSdk.scValToNative(
        (countResult as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse).result!.retval
      ) as number;

      const fetched: Proposal[] = [];
      for (let i = 1; i <= count; i++) {
        const result = await server.simulateTransaction(
          buildTx(contract.call("get_proposal", StellarSdk.nativeToScVal(i, { type: "u32" })))
        );
        const raw = StellarSdk.scValToNative(
          (result as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse).result!.retval
        ) as Record<string, unknown>;

        fetched.push({
          id: raw.id as number,
          title: raw.title as string,
          description: raw.description as string,
          voteCount: raw.vote_count as number,
          creator: raw.creator as string,
          active: raw.active as boolean,
        });
      }

      cache.set(cacheKey, fetched, 30_000);
      setProposals(fetched);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch proposals");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkVotedStatus = useCallback(async () => {
    if (!address || proposals.length === 0) return;
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const newVoted = new Set<number>();

    await Promise.all(
      proposals.map(async (p) => {
        try {
          const result = await server.simulateTransaction(
            buildTx(
              contract.call(
                "has_voted",
                StellarSdk.nativeToScVal(address, { type: "address" }),
                StellarSdk.nativeToScVal(p.id, { type: "u32" })
              )
            )
          );
          const voted = StellarSdk.scValToNative(
            (result as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse).result!.retval
          ) as boolean;
          if (voted) newVoted.add(p.id);
        } catch {
          // ignore per-proposal errors
        }
      })
    );

    setVotedIds(newVoted);
  }, [address, proposals]);

  const vote = useCallback(
    async (proposalId: number, signTransaction: (xdr: string) => Promise<string>) => {
      if (!address) throw new Error("Wallet not connected");

      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const account = await horizon.loadAccount(address);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            "vote",
            StellarSdk.nativeToScVal(address, { type: "address" }),
            StellarSdk.nativeToScVal(proposalId, { type: "u32" })
          )
        )
        .setTimeout(30)
        .build();

      const preparedTx = await server.prepareTransaction(tx);
      const signedXdr = await signTransaction(preparedTx.toXDR());
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      await server.sendTransaction(signedTx);

      cache.delete("proposals");
      await fetchProposals();
    },
    [address, fetchProposals]
  );

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  useEffect(() => {
    checkVotedStatus();
  }, [checkVotedStatus]);

  return { proposals, votedIds, loading, error, fetchProposals, vote };
}

function buildTx(operation: StellarSdk.xdr.Operation) {
  const dummyAccount = new StellarSdk.Account(
    "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
    "0"
  );
  return new StellarSdk.TransactionBuilder(dummyAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();
}
