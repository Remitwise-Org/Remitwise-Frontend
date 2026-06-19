/**
 * Standardized pagination utilities for cursor-based pagination
 */

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Validates pagination parameters
 */
export function validatePaginationParams(params: PaginationParams): { limit: number; cursor?: string } {
  let limit = params.limit ? Math.min(Math.max(1, params.limit), 100) : 20;
  const cursor = params.cursor;

  return { limit, cursor };
}

/**
 * Creates a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  limit: number,
  hasNextPage: boolean,
  getId?: (item: T) => string | number
): PaginatedResult<T> {
  const result: PaginatedResult<T> = {
    data,
    hasMore: hasNextPage,
  };

  // If there's data and we have a way to get IDs, set nextCursor
  if (data.length > 0 && getId) {
    result.nextCursor = String(getId(data[data.length - 1]));
  }

  return result;
}

/**
 * Processes data for pagination in memory
 */
export function paginateData<T>(
  data: T[],
  limit: number,
  getId: (item: T) => string | number,
  cursor?: string
): PaginatedResult<T> {
  // If cursor is provided, find the starting index
  let startIndex = 0;
  if (cursor !== undefined) {
    const cursorIndex = data.findIndex(item => String(getId(item)) === cursor);
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  }

  // Slice the data according to limit and cursor position
  const slicedData = data.slice(startIndex, startIndex + limit);
  const hasNextPage = startIndex + limit < data.length;

  return createPaginatedResponse(slicedData, limit, hasNextPage, getId);
}