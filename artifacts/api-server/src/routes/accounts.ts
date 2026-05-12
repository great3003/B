import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, accountsTable, swapHistoryTable } from "@workspace/db";
import {
  CreateAccountBody,
  DeleteAccountParams,
  GetAccountBalancesParams,
  ExecuteSwapParams,
  ExecuteSwapBody,
  GetSwapQuoteParams,
  GetSwapQuoteBody,
  UpdateAccountSettingsParams,
  UpdateAccountSettingsBody,
} from "@workspace/api-zod";
import { CantexClient } from "../lib/cantex";
import { resolveSwap, type PoolLike, type TokenLike } from "../lib/swapDirection";

const router: IRouter = Router();

router.get("/accounts", async (_req, res): Promise<void> => {
  const accounts = await db
    .select()
    .from(accountsTable)
    .orderBy(accountsTable.createdAt);

  const result = accounts.map((a) => ({
    ...a,
    operatorKey: a.operatorKey.slice(0, 8) + "...",
    tradingKey: a.tradingKey.slice(0, 8) + "...",
    createdAt: a.createdAt.toISOString(),
  }));
  res.json(result);
});

router.post("/accounts", async (req, res): Promise<void> => {
  const parsed = CreateAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, operatorKey, tradingKey } = parsed.data as {
    name: string;
    operatorKey: string;
    tradingKey: string;
  };

  const [account] = await db
    .insert(accountsTable)
    .values({ name, operatorKey, tradingKey })
    .returning();

  res.status(201).json({
    ...account,
    operatorKey: account.operatorKey.slice(0, 8) + "...",
    tradingKey: account.tradingKey.slice(0, 8) + "...",
    createdAt: account.createdAt.toISOString(),
  });
});

router.delete("/accounts/:id", async (req, res): Promise<void> => {
  const params = DeleteAccountParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(accountsTable)
    .where(eq(accountsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/accounts/:id/balances", async (req, res): Promise<void> => {
  const params = GetAccountBalancesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [account] = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.id, params.data.id));

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  try {
    const client = new CantexClient(account.operatorKey, account.tradingKey);
    const info = await client.getAccountInfo() as {
      party_id?: { address?: string };
      user_id?: string;
      tokens?: Array<{
        instrument_id: string;
        instrument_admin: string;
        instrument_name: string;
        instrument_symbol: string;
        balances?: { unlocked_amount?: string; locked_amount?: string };
      }>;
    };

    const tokens = (info.tokens ?? []).map((t) => ({
      symbol: t.instrument_symbol,
      name: t.instrument_name,
      unlockedAmount: t.balances?.unlocked_amount ?? "0",
      lockedAmount: t.balances?.locked_amount ?? "0",
      instrumentId: t.instrument_id,
      instrumentAdmin: t.instrument_admin,
    }));

    res.json({
      accountId: account.id,
      address: info.party_id?.address ?? "",
      tokens,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, "Failed to fetch balances");
    res.status(400).json({ error: `Failed to fetch balances: ${msg}` });
  }
});

router.post("/accounts/:id/swap-quote", async (req, res): Promise<void> => {
  const params = GetSwapQuoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = GetSwapQuoteBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [account] = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.id, params.data.id));

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const { direction, amount } = body.data as { direction: string; amount: string };

  try {
    const client = new CantexClient(account.operatorKey, account.tradingKey);
    const [pools, info] = await Promise.all([
      client.getPoolInfo() as Promise<{ pools?: PoolLike[] }>,
      client.getAccountInfo() as Promise<{ tokens?: TokenLike[] }>,
    ]);

    if (!pools.pools || pools.pools.length === 0) {
      res.status(400).json({ error: "No liquidity pools available" });
      return;
    }

    const resolved = resolveSwap(direction, info.tokens ?? [], pools.pools);
    if (!resolved.ok) {
      res.status(400).json({ error: resolved.error });
      return;
    }
    const { sellId, sellAdmin, buyId, buyAdmin, sellSymbol, buySymbol } = resolved.data;

    const quote = await client.getSwapQuote(amount, sellId, sellAdmin, buyId, buyAdmin) as {
      returned_amount?: string;
      returned?: { instrument?: { id?: string } };
      prices?: { trade?: string; slippage?: string };
      fees?: {
        fee_percentage?: string;
        network_fee?: { amount?: string };
      };
      estimated_time_seconds?: string;
    };

    res.json({
      sellAmount: amount,
      sellSymbol,
      buyAmount: quote.returned_amount ?? "0",
      buySymbol,
      tradePrice: quote.prices?.trade ?? "0",
      slippage: quote.prices?.slippage ?? "0",
      feePercentage: quote.fees?.fee_percentage ?? "0",
      estimatedSeconds: quote.estimated_time_seconds ?? "0",
      networkFee: quote.fees?.network_fee?.amount ?? "0",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, "Failed to get swap quote");
    res.status(400).json({ error: `Failed to get quote: ${msg}` });
  }
});

router.post("/accounts/:id/swap", async (req, res): Promise<void> => {
  const params = ExecuteSwapParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = ExecuteSwapBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [account] = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.id, params.data.id));

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const { direction, amount } = body.data as { direction: string; amount: string };

  try {
    const client = new CantexClient(account.operatorKey, account.tradingKey);
    const [pools, info] = await Promise.all([
      client.getPoolInfo() as Promise<{ pools?: PoolLike[] }>,
      client.getAccountInfo() as Promise<{ tokens?: TokenLike[] }>,
    ]);

    if (!pools.pools || pools.pools.length === 0) {
      res.status(400).json({ error: "No liquidity pools available" });
      return;
    }

    const resolved = resolveSwap(direction, info.tokens ?? [], pools.pools);
    if (!resolved.ok) {
      res.status(400).json({ error: resolved.error });
      return;
    }
    const { sellId, sellAdmin, buyId, buyAdmin, sellSymbol, buySymbol } = resolved.data;

    await client.swap(amount, sellId, sellAdmin, buyId, buyAdmin);

    const entry = {
      accountId: account.id,
      accountName: account.name,
      direction,
      inputAmount: amount,
      inputSymbol: sellSymbol,
      outputAmount: "0",
      outputSymbol: buySymbol,
      price: null,
      status: "success",
    };

    await db.insert(swapHistoryTable).values(entry);

    res.json({
      success: true,
      inputAmount: amount,
      inputSymbol: sellSymbol,
      outputAmount: "0",
      outputSymbol: buySymbol,
      price: null,
      txId: null,
      message: "Swap submitted successfully",
      executedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, "Swap failed");

    const [account2] = await db
      .select()
      .from(accountsTable)
      .where(eq(accountsTable.id, params.data.id));

    if (account2) {
      await db.insert(swapHistoryTable).values({
        accountId: account2.id,
        accountName: account2.name,
        direction,
        inputAmount: amount,
        inputSymbol: direction.split("_to_")[0]?.toUpperCase() ?? direction,
        outputAmount: "0",
        outputSymbol: direction.split("_to_")[1]?.toUpperCase() ?? direction,
        price: null,
        status: "failed",
      });
    }

    res.status(400).json({ error: `Swap failed: ${msg}` });
  }
});

router.patch("/accounts/:id/settings", async (req, res): Promise<void> => {
  const params = UpdateAccountSettingsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateAccountSettingsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const update = body.data as {
    name?: string;
    isActive?: boolean;
    autoSwapEnabled?: boolean;
    gasThreshold?: number | null;
    defaultSwapDirection?: string;
    defaultSwapAmount?: string | null;
  };

  const [updated] = await db
    .update(accountsTable)
    .set({
      ...(update.name !== undefined && { name: update.name }),
      ...(update.isActive !== undefined && { isActive: update.isActive }),
      ...(update.autoSwapEnabled !== undefined && { autoSwapEnabled: update.autoSwapEnabled }),
      ...(update.gasThreshold !== undefined && { gasThreshold: update.gasThreshold }),
      ...(update.defaultSwapDirection !== undefined && { defaultSwapDirection: update.defaultSwapDirection }),
      ...(update.defaultSwapAmount !== undefined && { defaultSwapAmount: update.defaultSwapAmount }),
    })
    .where(eq(accountsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  res.json({
    ...updated,
    operatorKey: updated.operatorKey.slice(0, 8) + "...",
    tradingKey: updated.tradingKey.slice(0, 8) + "...",
    createdAt: updated.createdAt.toISOString(),
  });
});

export default router;
