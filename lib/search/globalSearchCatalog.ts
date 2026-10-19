export type GlobalSearchCategory = "Invoice" | "Address" | "Settings";

export interface GlobalSearchResult {
  id: string;
  category: GlobalSearchCategory;
  title: string;
  description: string;
  href: string;
  keywords: string[];
}

export const GLOBAL_SEARCH_RESULT_CATALOG: GlobalSearchResult[] = [
  {
    id: "invoice-b-1048",
    category: "Invoice",
    title: "Invoice #B-1048",
    description: "Upcoming utility invoice for the Riverside apartment account.",
    href: "/bills",
    keywords: ["invoice", "bill", "utility", "payment"],
  },
  {
    id: "invoice-b-2051",
    category: "Invoice",
    title: "Invoice #B-2051",
    description: "Recurring cloud hosting invoice with autopay enabled.",
    href: "/bills",
    keywords: ["invoice", "hosting", "cloud", "autopay"],
  },
  {
    id: "address-riverside",
    category: "Address",
    title: "Riverside Apartments",
    description: "Billing address for the apartment and family support remit setup.",
    href: "/settings",
    keywords: ["address", "billing", "riverside", "apartment"],
  },
  {
    id: "address-warehouse",
    category: "Address",
    title: "Warehouse Receipts Office",
    description: "Primary logistics address used for supplier reconciliation.",
    href: "/send",
    keywords: ["address", "warehouse", "office", "receipts"],
  },
  {
    id: "settings-notifications",
    category: "Settings",
    title: "Notifications & Security",
    description: "Manage alerts, session security, and default delivery preferences.",
    href: "/settings",
    keywords: ["settings", "notifications", "security", "preferences"],
  },
  {
    id: "settings-wallet",
    category: "Settings",
    title: "Wallet & Family Preferences",
    description: "Update wallet links, account access, and family member rules.",
    href: "/settings",
    keywords: ["settings", "wallet", "family", "preferences"],
  },
];

export function getGlobalSearchResults(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return GLOBAL_SEARCH_RESULT_CATALOG.filter((item) =>
    [item.title, item.description, item.category, ...item.keywords]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}
