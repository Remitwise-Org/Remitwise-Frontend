import { SearchResultsPage } from "@/components/search/SearchResultsPage";

export default async function Page({ searchParams }: { searchParams?: Promise<{ q?: string }> }) {
  const resolvedSearchParams = await searchParams;
  return <SearchResultsPage searchParams={resolvedSearchParams} />;
}
