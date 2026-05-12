import * as ed from "@noble/ed25519";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha512 } from "@noble/hashes/sha2.js";
import { logger } from "./logger";

const CANTEX_BASE_URL = process.env.CANTEX_BASE_URL ?? "https://api.cantex.io";

ed.hashes.sha512 = sha512;

// SPKI (SubjectPublicKeyInfo) DER prefix for secp256k1 uncompressed keys.
// Matches the Python SDK's IntentTradingKeySigner._SPKI_PREFIX exactly.
// Total wrapped pubkey is 88 bytes / 176 hex chars (23 prefix + 65 pubkey).
const SECP256K1_SPKI_PREFIX = new Uint8Array([
  0x30, 0x56, 0x30, 0x10, 0x06, 0x07, 0x2a, 0x86,
  0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x05, 0x2b,
  0x81, 0x04, 0x00, 0x0a, 0x03, 0x42, 0x00,
]);

// URL-safe base64 WITHOUT padding — matches the Python SDK's _b64_encode,
// which is `base64.urlsafe_b64encode(...).rstrip("=")`. Node's built-in
// `base64url` encoding already produces unpadded URL-safe output.
function b64UrlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function cleanHex(hex: string, label: string, expectedBytes: number): Uint8Array {
  const cleaned = hex.trim().replace(/^0x/i, "");
  if (cleaned.length === 0) {
    throw new Error(`${label} is empty`);
  }
  if (!/^[0-9a-fA-F]+$/.test(cleaned)) {
    throw new Error(`${label} contains non-hex characters`);
  }
  if (cleaned.length % 2 !== 0) {
    throw new Error(`${label} has odd hex length (${cleaned.length})`);
  }
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }
  if (bytes.length !== expectedBytes) {
    throw new Error(
      `${label} must be ${expectedBytes} bytes (${expectedBytes * 2} hex chars), got ${bytes.length}`
    );
  }
  return bytes;
}

export class CantexClient {
  private operatorPriv: Uint8Array;
  private tradingPriv: Uint8Array;
  private apiKey: string | null = null;
  private baseUrl: string;
  private intentAccountReady = false;
  private tradingAccountReady = false;

  constructor(operatorKeyHex: string, tradingKeyHex: string, baseUrl = CANTEX_BASE_URL) {
    this.operatorPriv = cleanHex(operatorKeyHex, "Operator key", 32);
    this.tradingPriv = cleanHex(tradingKeyHex, "Trading key", 32);
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  // -- key helpers ---------------------------------------------------------

  private async getOperatorPublicKeyB64(): Promise<string> {
    const pubKey = await ed.getPublicKeyAsync(this.operatorPriv);
    return b64UrlEncode(pubKey);
  }

  private getTradingPublicKeyDerHex(): string {
    // Uncompressed secp256k1 pubkey: 0x04 || x(32) || y(32) = 65 bytes
    const pubUncompressed = secp256k1.getPublicKey(this.tradingPriv, false);
    const spki = new Uint8Array(SECP256K1_SPKI_PREFIX.length + pubUncompressed.length);
    spki.set(SECP256K1_SPKI_PREFIX, 0);
    spki.set(pubUncompressed, SECP256K1_SPKI_PREFIX.length);
    return Buffer.from(spki).toString("hex");
  }

  private async signWithOperator(message: Uint8Array): Promise<Uint8Array> {
    return ed.signAsync(message, this.operatorPriv);
  }

  private signDigestHexWithTrading(digestHex: string): string {
    // Digest is a hex-encoded 32-byte hash from the build response.
    const digest = cleanHex(digestHex, "Intent digest", 32);
    // Match the Python SDK: DER signature, no low-S enforcement.
    const sig = secp256k1.sign(digest, this.tradingPriv, { format: "der" });
    return Buffer.from(sig).toString("hex");
  }

  // -- HTTP helper ---------------------------------------------------------

  private async request(
    method: string,
    path: string,
    options: { body?: unknown; authenticated?: boolean } = {}
  ): Promise<unknown> {
    const { body, authenticated = true } = options;
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "CantexBot/1.0",
    };
    if (authenticated) {
      if (!this.apiKey) {
        throw new Error("Not authenticated. Call authenticate() first.");
      }
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Cantex API ${method} ${path} -> ${response.status}: ${text.slice(0, 300)}`);
    }

    if (text.length === 0) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON from ${method} ${path}: ${text.slice(0, 200)}`);
    }
  }

  // -- authentication ------------------------------------------------------

  async authenticate(): Promise<string> {
    const publicKey = await this.getOperatorPublicKeyB64();
    const challenge = (await this.request("POST", "/v1/auth/api-key/begin", {
      body: { publicKey },
      authenticated: false,
    })) as { message: string; challengeId: string };

    if (!challenge.message || !challenge.challengeId) {
      throw new Error("Auth challenge missing 'message' or 'challengeId'");
    }

    const sig = await this.signWithOperator(Buffer.from(challenge.message, "utf8"));

    const result = (await this.request("POST", "/v1/auth/api-key/finish", {
      body: {
        challengeId: challenge.challengeId,
        signature: b64UrlEncode(sig),
      },
      authenticated: false,
    })) as { api_key?: string };

    if (!result.api_key) {
      throw new Error("Auth finish response missing 'api_key'");
    }
    this.apiKey = result.api_key;
    logger.info({ path: "/v1/auth" }, "Cantex authenticated");
    return this.apiKey;
  }

  async ensureAuthenticated(): Promise<void> {
    if (!this.apiKey) {
      await this.authenticate();
    }
  }

  // -- read endpoints ------------------------------------------------------

  async getAccountInfo(): Promise<unknown> {
    await this.ensureAuthenticated();
    return this.request("GET", "/v1/account/info");
  }

  async getAccountAdmin(): Promise<{
    party_id?: { address?: string; contracts?: { pool_intent_account?: unknown; pool_trading_account?: unknown } };
    user_id?: string;
    tokens?: unknown[];
  }> {
    await this.ensureAuthenticated();
    return this.request("GET", "/v1/account/admin") as Promise<{
      party_id?: { address?: string; contracts?: { pool_intent_account?: unknown; pool_trading_account?: unknown } };
      user_id?: string;
      tokens?: unknown[];
    }>;
  }

  async getPoolInfo(): Promise<unknown> {
    await this.ensureAuthenticated();
    return this.request("GET", "/v2/pools/info");
  }

  async getSwapQuote(
    sellAmount: string,
    sellInstrumentId: string,
    sellInstrumentAdmin: string,
    buyInstrumentId: string,
    buyInstrumentAdmin: string
  ): Promise<unknown> {
    await this.ensureAuthenticated();
    return this.request("POST", "/v2/pools/quote", {
      body: {
        sellAmount,
        sellInstrumentId,
        sellInstrumentAdmin,
        buyInstrumentId,
        buyInstrumentAdmin,
      },
    });
  }

  // -- build -> sign -> submit ---------------------------------------------

  async buildSignSubmit(
    buildPath: string,
    payload: Record<string, unknown>,
    options: { intent?: boolean } = {}
  ): Promise<unknown> {
    await this.ensureAuthenticated();
    const buildData = (await this.request("POST", buildPath, {
      body: payload,
    })) as Record<string, unknown>;

    const buildId = buildData["id"] as string | undefined;
    if (!buildId) {
      throw new Error(`Build response from ${buildPath} missing 'id'`);
    }

    if (options.intent) {
      const intentObj = buildData["intent"] as Record<string, unknown> | undefined;
      const digest = intentObj?.["digest"] as string | undefined;
      if (!digest) {
        throw new Error(`Build response from ${buildPath} missing 'intent.digest'`);
      }
      const signatureHex = this.signDigestHexWithTrading(digest);
      return this.request("POST", "/v1/intent/submit", {
        body: { id: buildId, intentTradingKeySignature: signatureHex },
      });
    }

    const context = buildData["context"] as Record<string, unknown> | undefined;
    const txHashB64 = context?.["transaction_hash"] as string | undefined;
    if (!txHashB64) {
      throw new Error(`Build response from ${buildPath} missing 'context.transaction_hash'`);
    }
    // Tolerant: accepts both standard and URL-safe base64.
    const normalised = txHashB64.replace(/-/g, "+").replace(/_/g, "/");
    const txHashBytes = Buffer.from(normalised, "base64");
    const sig = await this.signWithOperator(txHashBytes);
    return this.request("POST", "/v1/ledger/transaction/submit", {
      body: { id: buildId, operatorKeySignedTransactionHash: b64UrlEncode(sig) },
    });
  }

  // -- account bootstrap ---------------------------------------------------

  /**
   * Ensure the intent trading account exists on Cantex. Without it,
   * /v1/intent/build/pool/swap will reject. The Cantex API decommissioned
   * the standalone /pool/create_account endpoint — creating the intent
   * account now provisions the underlying trading account implicitly.
   * Caches success in-memory; safe to call before every swap.
   */
  async ensureSwapAccountsExist(): Promise<void> {
    if (this.intentAccountReady) return;

    await this.ensureAuthenticated();
    const admin = await this.getAccountAdmin();
    const contracts = admin.party_id?.contracts ?? {};
    const hasIntent = contracts.pool_intent_account != null;

    if (!hasIntent) {
      logger.info("Creating intent trading account...");
      await this.buildSignSubmit(
        "/v1/ledger/transaction/build/pool/create_intent_account",
        { intentTradingPublicKeyHex: this.getTradingPublicKeyDerHex() }
      );
      logger.info("Intent trading account created");
    }
    this.intentAccountReady = true;
    this.tradingAccountReady = true;
  }

  // -- swap ----------------------------------------------------------------

  async swap(
    sellAmount: string,
    sellInstrumentId: string,
    sellInstrumentAdmin: string,
    buyInstrumentId: string,
    buyInstrumentAdmin: string
  ): Promise<unknown> {
    await this.ensureSwapAccountsExist();
    return this.buildSignSubmit(
      "/v1/intent/build/pool/swap",
      {
        sellAmount,
        sellInstrumentId,
        sellInstrumentAdmin,
        buyInstrumentId,
        buyInstrumentAdmin,
      },
      { intent: true }
    );
  }
}
