import { Router, type IRouter } from "express";
import { db, accountsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const CANTEX_BASE_URL = process.env.CANTEX_BASE_URL ?? "https://api.cantex.io";

const router: IRouter = Router();

// Module-level cache so we reuse the authenticated client across polls
let cachedClient: import("../lib/cantex").CantexClient | null = null;
let cachedAccountId: string | null = null;

// Try to fetch the network fee from a public Cantex endpoint (no auth required)
async function fetchPublicFee(): Promise<{ networkFee: string; feePercentage: string } | null> {
  try {
    const res = await fetch(`${CANTEX_BASE_URL}/v2/pools/info`, {
      headers: { "Content-Type": "application/json", "User-Agent": "CantexBot/1.0" },
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      pools?: Array<{
        fee_percentage?: string;
        network_fee?: { amount?: string };
        fees?: { fee_percentage?: string; network_fee?: { amount?: string } };
      }>;
    };

    if (!data.pools || data.pools.length === 0) return null;

    const pool = data.pools[0];
    const networkFee =
      pool.network_fee?.amount ??
      pool.fees?.network_fee?.amount ??
      null;
    const feePercentage =
      pool.fee_percentage ??
      pool.fees?.fee_percentage ??
      "0";

    if (networkFee === null) return null;

    return { networkFee, feePercentage };
  } catch {
    return null;
  }
}

router.get("/gas", async (_req, res): Promise<void> => {
  try {
    // 1. Try public fetch first (no account needed)
    const publicFee = await fetchPublicFee();
    if (publicFee) {
      res.json({
        networkFee: publicFee.networkFee,
        feePercentage: publicFee.feePercentage,
        updatedAt: new Date().toISOString(),
        status: "ok",
      });
      return;
    }

    // 2. Need an account to authenticate
    const accounts = await db.select().from(accountsTable).limit(1);

    if (accounts.length === 0) {
      res.json({
        networkFee: "—",
        feePercentage: "0",
        updatedAt: new Date().toISOString(),
        status: "no_accounts",
      });
      return;
    }

    const account = accounts[0];

    // Reuse the cached client unless the account changed
    if (!cachedClient || cachedAccountId !== account.id) {
      const { CantexClient } = await import("../lib/cantex");
      cachedClient = new CantexClient(account.operatorKey, account.tradingKey);
      cachedAccountId = account.id;
    }

    await cachedClient.ensureAuthenticated();

    const pools = await cachedClient.getPoolInfo() as {
      pools?: Array<{
        token_a_instrument_id: string;
        token_a_instrument_admin: string;
        token_b_instrument_id: string;
        token_b_instrument_admin: string;
        fee_percentage?: string;
        network_fee?: { amount?: string };
        fees?: { fee_percentage?: string; network_fee?: { amount?: string } };
      }>;
    };

    logger.debug({ pools }, "Cantex pool info");

    if (!pools.pools || pools.pools.length === 0) {
      res.json({
        networkFee: "0",
        feePercentage: "0",
        updatedAt: new Date().toISOString(),
        status: "no_pools",
      });
      return;
    }

    const pool = pools.pools[0];

    // Try to get fee from pool info directly first (avoid extra quote request)
    const poolFee =
      pool.network_fee?.amount ??
      pool.fees?.network_fee?.amount ??
      null;

    if (poolFee !== null) {
      res.json({
        networkFee: poolFee,
        feePercentage: pool.fee_percentage ?? pool.fees?.fee_percentage ?? "0",
        updatedAt: new Date().toISOString(),
        status: "ok",
      });
      return;
    }

    // Fall back: fetch a small quote to extract the fee
    const quote = await cachedClient.getSwapQuote(
      "1",
      pool.token_a_instrument_id,
      pool.token_a_instrument_admin,
      pool.token_b_instrument_id,
      pool.token_b_instrument_admin
    ) as {
      fees?: {
        fee_percentage?: string;
        network_fee?: { amount?: string };
      };
    };

    logger.debug({ quote }, "Cantex quote for gas fee");

    res.json({
      networkFee: quote.fees?.network_fee?.amount ?? "0",
      feePercentage: quote.fees?.fee_percentage ?? "0",
      updatedAt: new Date().toISOString(),
      status: "ok",
    });
  } catch (err) {
    // Auth errors invalidate the cached client
    cachedClient = null;
    cachedAccountId = null;
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.warn({ err }, "Gas fee fetch failed");
    res.json({
      networkFee: "—",
      feePercentage: "0",
      updatedAt: new Date().toISOString(),
      status: `error`,
    });
  }
});

export default router;
