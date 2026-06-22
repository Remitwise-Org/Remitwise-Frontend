// Zod schemas for split route request validation
import { z } from 'zod';

export const splitPercentagesSchema = z.object({
  spending: z.number().nonnegative('spending must be non-negative'),
  savings: z.number().nonnegative('savings must be non-negative'),
  bills: z.number().nonnegative('bills must be non-negative'),
  insurance: z.number().nonnegative('insurance must be non-negative'),
}).refine(
  (data) => Math.abs(data.spending + data.savings + data.bills + data.insurance - 100) <= 0.01,
  { message: 'Percentages must sum to 100' }
);

export const splitCalculateQuerySchema = z.object({
  amount: z.coerce.number().positive('amount must be a positive number'),
});

export const splitAddressSchema = z.string().regex(
  /^G[A-Z2-7]{55}$/,
  'Invalid Stellar address format'
);

export type SplitPercentagesInput = z.infer<typeof splitPercentagesSchema>;
