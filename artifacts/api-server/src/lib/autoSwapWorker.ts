import { eq, and } from "drizzle-orm";
import { db, accountsTable, swapHistoryTable } from "@workspace/db";
import { CantexClient } from "./cantex";
import { logger } from "./logger";
import { resolveSwap } from "./swapDirection";

const POLL_INTERVAL_MS = 30_000;
const MIN_BALANCE_TO_SWAP = 0;

interface Pool {
  token_a_instrument_id: string;
  token_a_instrument_admin: string;
  token_b_instrument_id: string;
  token_b_instrument_admin: string;
  network_fee?: { amount?: string };
  fees?: { fee_percentage?: string; network_fee?: { amount?: string } };
}

interface Token {
  instrument_symbol: string;
  instrument_id?: string;
  instrument_admin?: string;
  balances?: { unlocked_amount?: string };
}

interface Account {
  id: number;
  name: string;
  operatorKey: string;
  tradingKey: string;
  isActive: boolean;
  autoSwapEnabled: boolean;
  gasThreshold: number | null;
  defaultSwapDirection: string;
}

let intervalHandle: NodeJS.Timeout | null = null;
let isTicking = false;

interface WorkerStatus {
  running: boolean;
  lastTickAt: number | null;
  lastTickAccounts: number;
  lastSwapAt: number | null;
  lastSkipReason: Record<string, string>;
  totalAttempts: number;
  totalSuccesses: number;
  totalFailures: number;
}

const status: WorkerStatus = {
  running: false,
  lastTickAt: null,
  lastTickAccounts: 0,
  lastSwapAt: null,
  lastSkipReason: {},
  totalAttempts: 0,
  totalSuccesses: 0,
  totalFailures: 0,
};

let tickCounter = 0;
let forceSwapThisTick = false;

export function getAutoSwapStatus(): WorkerStatus {
  return { ...status, lastSkipReason: { ...status.lastSkipReason } };
}

async function fetchGasFeeFromPool(pool: Pool, client: CantexClient): Promise<number | null> {
  const direct = pool.network_fee?.amount ?? pool.fees?.network_fee?.amount;
  if (direct !== undefined) return parseFloat(direct);

  try {
    const quote = (await client.getSwapQuote(
      "1",
      pool.token_a_instrument_id,
      pool.token_a_instrument_admin,
      pool.token_b_instrument_id,
      pool.token_b_instrument_admin
    )) as { fees?: { network_fee?: { amount?: string } } };
    return parseFloat(quote.fees?.network_fee?.amount ?? "0");
  } catch {
    return null;
  }
}

async function processAccount(account: Account): Promise<void> {
  const log = logger.child({ accountId: account.id, name: account.name });
  const client = new CantexClient(account.operatorKey, account.tradingKey);

  const setSkip = (reason: string) => {
    status.lastSkipReason[String(account.id)] = reason;
  };

  try {
    const poolsRes = (await client.getPoolInfo()) as { pools?: Pool[] };
    if (!poolsRes.pools || poolsRes.pools.length === 0) {
      log.warn("AutoSwap: no pools available");
      setSkip("no pools available");
      return;
    }
    const pool = poolsRes.pools[0];

    const gasFee = await fetchGasFeeFromPool(pool, client);
    if (gasFee === null) {
      log.warn("AutoSwap: gas fee unavailable");
      setSkip("gas fee unavailable");
      return;
    }

    if (account.gasThreshold !== null && gasFee > account.gasThreshold) {
      if (forceSwapThisTick) {
        log.info({ gasFee, threshold: account.gasThreshold }, "AutoSwap: forced tick — bypassing gas threshold");
        setSkip(`forced (gas ${gasFee})`);
      } else {
        log.info({ gasFee, threshold: account.gasThreshold }, "AutoSwap: gas above threshold, skipping");
        setSkip(`gas ${gasFee} > threshold ${account.gasThreshold}`);
        return;
      }
    }

    const info = (await client.getAccountInfo()) as { tokens?: Token[] };
    const tokens = info.tokens ?? [];

    const direction = account.defaultSwapDirection || "cbtc_to_usdcx";
    const resolved = resolveSwap(direction, tokens, poolsRes.pools);
    if (!resolved.ok) {
      log.warn({ direction, err: resolved.error }, "AutoSwap: cannot resolve swap");
      setSkip(resolved.error);
      return;
    }
    const { sellId, sellAdmin, buyId, buyAdmin, sellSymbol: sourceSymbol, buySymbol: targetSymbol } = resolved.data;

    const sourceBalance = resolved.sourceToken.balances?.unlocked_amount ?? "0";
    const sourceBalanceNum = parseFloat(sourceBalance);

    if (sourceBalanceNum <= MIN_BALANCE_TO_SWAP) {
      log.info({ direction, sourceBalance }, "AutoSwap: no balance to swap");
      setSkip(`no ${sourceSymbol} balance`);
      return;
    }

    log.info({ amount: sourceBalance, direction, gasFee }, "AutoSwap: sweeping full balance");
    status.totalAttempts++;
    setSkip(`sweeping ${sourceBalance} ${sourceSymbol}`);

    try {
      await client.swap(sourceBalance, sellId, sellAdmin, buyId, buyAdmin);
      await db.insert(swapHistoryTable).values({
        accountId: account.id,
        accountName: account.name,
        direction,
        inputAmount: sourceBalance,
        inputSymbol: sourceSymbol,
        outputAmount: "0",
        outputSymbol: targetSymbol,
        price: null,
        status: "success",
      });
      status.totalSuccesses++;
      status.lastSwapAt = Date.now();
      setSkip(`swept ${sourceBalance} ${sourceSymbol}`);
      log.info("AutoSwap: success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      log.error({ err }, "AutoSwap: swap failed");
      status.totalFailures++;
      setSkip(`failed: ${msg.slice(0, 80)}`);
      await db.insert(swapHistoryTable).values({
        accountId: account.id,
        accountName: account.name,
        direction,
        inputAmount: sourceBalance,
        inputSymbol: sourceSymbol,
        outputAmount: "0",
        outputSymbol: targetSymbol,
        price: null,
        status: `failed: ${msg.slice(0, 100)}`,
      });
    }
  } catch (err) {
    log.error({ err }, "AutoSwap: error processing account");
  }
}

async function tick(): Promise<void> {
  if (isTicking) return;
  isTicking = true;

  try {
    const accounts = await db
      .select()
      .from(accountsTable)
      .where(and(eq(accountsTable.isActive, true), eq(accountsTable.autoSwapEnabled, true)));

    tickCounter++;
    forceSwapThisTick = tickCounter % 2 === 0;
    status.lastTickAt = Date.now();
    status.lastTickAccounts = accounts.length;

    if (accounts.length === 0) {
      logger.info({ tick: tickCounter, forced: forceSwapThisTick }, "AutoSwap: tick (no accounts with auto-swap enabled)");
      return;
    }

    logger.info({ tick: tickCounter, forced: forceSwapThisTick, count: accounts.length }, "AutoSwap: tick");
    await Promise.allSettled(accounts.map((a) => processAccount(a as unknown as Account)));
  } catch (err) {
    logger.error({ err }, "AutoSwap: tick error");
  } finally {
    isTicking = false;
  }
}

export function startAutoSwapWorker(): void {
  if (intervalHandle) return;
  logger.info({ pollMs: POLL_INTERVAL_MS }, "Auto-swap worker started");
  status.running = true;
  // Run once immediately, then on interval
  void tick();
  intervalHandle = setInterval(() => {
    void tick();
  }, POLL_INTERVAL_MS);
}

export function stopAutoSwapWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    status.running = false;
    logger.info("Auto-swap worker stopped");
  }
}

export async function triggerAutoSwapNow(): Promise<void> {
  await tick();
}
