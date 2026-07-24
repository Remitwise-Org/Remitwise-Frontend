import Link from "next/link";
import { FileText, MapPin, Settings as SettingsIcon, Search } from "lucide-react";
import { getGlobalSearchResults, type GlobalSearchCategory } from "@/lib/search/globalSearchCatalog";

interface SearchResultsPageProps {
  searchParams?: {
    q?: string;
  };
}

const categoryStyles = {
  Invoice: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  Address: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  Settings: "bg-violet-500/15 text-violet-300 border-violet-500/25",
} as const;

const categoryIcons = {
  Invoice: FileText,
  Address: MapPin,
  Settings: SettingsIcon,
} as const;

function groupResultsByCategory(results: ReturnType<typeof getGlobalSearchResults>) {
  return results.reduce<Record<GlobalSearchCategory, typeof results>>(
    (groups, result) => {
      groups[result.category] = [...groups[result.category], result];
      return groups;
    },
    {
      Invoice: [],
      Address: [],
      Settings: [],
    },
  );
}

export function SearchResultsPage({ searchParams }: SearchResultsPageProps) {
  const query = searchParams?.q?.trim() ?? "";
  const results = getGlobalSearchResults(query);
  const groupedResults = groupResultsByCategory(results);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-start gap-3">
          <div className="rounded-2xl bg-white/5 p-3 text-slate-200">
            <Search className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Global Search</p>
            <h1 className="text-3xl font-semibold tracking-tight">Global Search Results</h1>
            {query ? (
              <p className="mt-2 text-slate-300">
                Showing {results.length} result{results.length === 1 ? "" : "s"} for <span className="font-semibold text-white">{query}</span>
              </p>
            ) : (
              <p className="mt-2 text-slate-300">Search for invoices, addresses, or settings.</p>
            )}
          </div>
        </header>

        {query ? (
          <section aria-label="Search result groups" className="space-y-4">
            {results.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
                No matches were found for <span className="font-semibold text-white">{query}</span>.
              </div>
            ) : (
              (Object.keys(groupedResults) as GlobalSearchCategory[]).map((category) => {
                const categoryResults = groupedResults[category];
                if (categoryResults.length === 0) {
                  return null;
                }

                return (
                  <div key={category} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-white/5 p-2 text-slate-300">
                        {(() => {
                          const Icon = categoryIcons[category];
                          return <Icon className="h-4 w-4" aria-hidden="true" />;
                        })()}
                      </div>
                      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">{category}</h2>
                    </div>
                    <div className="space-y-3">
                      {categoryResults.map((result) => {
                        const Icon = categoryIcons[result.category];
                        return (
                          <Link
                            key={result.id}
                            href={result.href}
                            className="block rounded-xl border border-white/10 bg-slate-900/50 p-3 transition hover:border-brand-red/40 hover:bg-slate-900"
                          >
                            <div className="flex items-start gap-3">
                              <div className="rounded-lg bg-white/5 p-2 text-slate-300">
                                <Icon className="h-4 w-4" aria-hidden="true" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${categoryStyles[result.category]}`}>
                                    {result.category}
                                  </span>
                                  <h3 className="text-base font-semibold text-white">{result.title}</h3>
                                </div>
                                <p className="mt-2 text-sm text-slate-300">{result.description}</p>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-slate-300">
            Search for invoices, addresses, or settings to surface relevant results.
          </div>
        )}
      </div>
    </main>
  );
}

export default function Page({ searchParams }: SearchResultsPageProps) {
  return <SearchResultsPage searchParams={searchParams} />;
}
