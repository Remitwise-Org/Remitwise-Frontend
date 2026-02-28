import { z } from "zod";

const EnvSchema = z.object({
  SOROBAN_RPC_URL: z
    .string()
    .default("https://soroban-testnet.stellar.org"),
  SOROBAN_NETWORK_PASSPHRASE: z
    .string()
    .default("Test SDF Network ; September 2015"),
  REMITTANCE_SPLIT_CONTRACT_ID: z.string().optional().default(""),
  SAVINGS_GOALS_CONTRACT_ID: z.string().optional().default(""),
  BILL_PAYMENTS_CONTRACT_ID: z.string().optional().default(""),
  INSURANCE_CONTRACT_ID: z.string().optional().default(""),
  FAMILY_WALLET_CONTRACT_ID: z.string().optional().default(""),
  DATABASE_URL: z
    .string()
    .optional()
    .default(process.env.POSTGRES_URL ?? ""),
  POSTGRES_URL: z.string().optional().default(""),
  NEXTAUTH_SECRET: z
    .string()
    .optional()
    .default(process.env.SESSION_SECRET ?? ""),
  SESSION_SECRET: z.string().optional().default(""),
  ANCHOR_API_BASE_URL: z.string().optional().default(""),
});

const parsed = EnvSchema.parse(process.env);

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = parsed;

export function requireEnv(keys: Array<keyof Env>): void {
  for (const k of keys) {
    const v = parsed[k];
    if (typeof v === "string" && v.trim() === "") {
      throw new Error(`Missing required environment variable: ${k as string}`);
    }
  }
}
