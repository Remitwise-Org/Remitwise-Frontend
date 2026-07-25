export const DENSITY_STORAGE_KEY = "display-density";

export const DENSITY_OPTIONS = ["comfortable", "compact"] as const;

export type DensityOption = (typeof DENSITY_OPTIONS)[number];
export type Density = DensityOption;

export function isDensityOption(value: unknown): value is DensityOption {
  return value === "comfortable" || value === "compact";
}
