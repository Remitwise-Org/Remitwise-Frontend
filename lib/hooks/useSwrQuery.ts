import {
  useQuery,
  type UseQueryOptions,
  type QueryKey,
  type QueryFunction,
} from "@tanstack/react-query";
import { SWR_DEFAULTS } from "@/lib/config/swr";

export function useSwrQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryKey: TQueryKey,
  queryFn: QueryFunction<TQueryFnData, TQueryKey>,
  options?: Omit<
    UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey,
    queryFn,
    staleTime: options?.staleTime ?? SWR_DEFAULTS.staleTime,
    gcTime: options?.gcTime ?? SWR_DEFAULTS.gcTime,
    refetchOnWindowFocus:
      options?.refetchOnWindowFocus ?? SWR_DEFAULTS.refetchOnWindowFocus,
    refetchOnReconnect:
      options?.refetchOnReconnect ?? SWR_DEFAULTS.refetchOnReconnect,
    retry: options?.retry ?? SWR_DEFAULTS.retry,
    retryDelay: options?.retryDelay ?? SWR_DEFAULTS.retryDelay,
    ...options,
  });
}
