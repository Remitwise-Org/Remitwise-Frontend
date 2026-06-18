import type { Density } from "@/lib/context/DensityContext";

export const densityTokens = {
  comfortable: {
    listGap: "gap-4",
    listGridGap: "gap-6",
    cardPadding: "p-6",
    cardRounded: "rounded-2xl",
    rowPy: "py-4",
    mobilePadding: "p-5",
    headerGap: "mb-8",
    iconContainer: "p-3 w-12 h-12",
    iconSize: "w-6 h-6",
    titleText: "text-lg font-bold",
    bodyText: "text-base",
  },
  compact: {
    listGap: "gap-2",
    listGridGap: "gap-3",
    cardPadding: "p-4",
    cardRounded: "rounded-xl",
    rowPy: "py-2",
    mobilePadding: "p-3",
    headerGap: "mb-4",
    iconContainer: "p-2 w-8 h-8",
    iconSize: "w-4 h-4",
    titleText: "text-base font-bold",
    bodyText: "text-sm",
  },
} satisfies Record<Density, Record<string, string>>;
