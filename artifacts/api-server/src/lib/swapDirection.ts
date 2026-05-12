// Shared swap direction logic used by both the auto-swap worker and the
// /accounts/:id/quote and /accounts/:id/swap routes.

export interface PoolLike {
  token_a_instrument_id: string;
  token_a_instrument_admin: string;
  token_b_instrument_id: string;
  token_b_instrument_admin: string;
}

export interface TokenLike {
  instrument_symbol: string;
  instrument_id?: string;
  instrument_admin?: string;
  balances?: { unlocked_amount?: string };
}

// Maps a UI direction string to the upstream Cantex token symbols
// (matched case-insensitively). On Cantex these swaps are routed through
// the CC (Canton Coin / Amulet) pool — i.e. cBTC → CC → USDCx — but from
// the SDK's perspective we still call swap with sellId=cBTC, buyId=USDCx
// and Cantex handles the routing.
export const DIRECTIONS: Record<string, { sellSymbol: string; buySymbol: string }> = {
  cbtc_to_usdcx: { sellSymbol: "CBTC", buySymbol: "USDCX" },
  usdcx_to_cbtc: { sellSymbol: "USDCX", buySymbol: "CBTC" },
};

export const DISPLAY_SYMBOL: Record<string, string> = {
  CBTC: "cBTC",
  USDCX: "USDCx",
  CC: "CC",
};

export function findToken(tokens: TokenLike[], symbol: string): TokenLike | undefined {
  return tokens.find(
    (t) => t.instrument_symbol?.toUpperCase() === symbol.toUpperCase(),
  );
}

export function findPoolFor(
  pools: PoolLike[],
  sellInstrumentId: string,
  buyInstrumentId: string,
): PoolLike | undefined {
  return pools.find(
    (p) =>
      (p.token_a_instrument_id === sellInstrumentId &&
        p.token_b_instrument_id === buyInstrumentId) ||
      (p.token_a_instrument_id === buyInstrumentId &&
        p.token_b_instrument_id === sellInstrumentId),
  );
}

export interface ResolvedSwap {
  sellId: string;
  sellAdmin: string;
  buyId: string;
  buyAdmin: string;
  sellSymbol: string;
  buySymbol: string;
}

/** Resolve direction → (sell/buy instrument ids+admin and display symbols). */
export function resolveSwap(
  direction: string,
  tokens: TokenLike[],
  pools: PoolLike[],
): { ok: true; data: ResolvedSwap; sourceToken: TokenLike } | { ok: false; error: string } {
  const dirCfg = DIRECTIONS[direction];
  if (!dirCfg) return { ok: false, error: `Unknown direction "${direction}"` };

  const sellSymbol = DISPLAY_SYMBOL[dirCfg.sellSymbol] ?? dirCfg.sellSymbol;
  const buySymbol = DISPLAY_SYMBOL[dirCfg.buySymbol] ?? dirCfg.buySymbol;

  const sourceToken = findToken(tokens, dirCfg.sellSymbol);
  const targetToken = findToken(tokens, dirCfg.buySymbol);

  if (!sourceToken?.instrument_id || !sourceToken.instrument_admin) {
    return { ok: false, error: `${sellSymbol} token is not registered on this account` };
  }
  if (!targetToken?.instrument_id || !targetToken.instrument_admin) {
    return { ok: false, error: `${buySymbol} token is not registered on this account` };
  }

  const swapPool = findPoolFor(pools, sourceToken.instrument_id, targetToken.instrument_id);
  if (!swapPool) {
    return { ok: false, error: `No liquidity pool for ${sellSymbol}/${buySymbol}` };
  }

  return {
    ok: true,
    sourceToken,
    data: {
      sellId: sourceToken.instrument_id,
      sellAdmin: sourceToken.instrument_admin,
      buyId: targetToken.instrument_id,
      buyAdmin: targetToken.instrument_admin,
      sellSymbol,
      buySymbol,
    },
  };
}
