/**
 * Truncates a string in the middle, showing the start and end parts.
 * @param str The string to truncate.
 * @param charsToShow The number of characters to show at the start and end. Default is 4.
 * @returns The truncated string, e.g., "GABC...WXYZ".
 */
export function truncateMiddle(str: string, charsToShow = 4): string {
  if (str.length <= charsToShow * 2) return str;
  return `${str.substring(0, charsToShow)}...${str.substring(str.length - charsToShow)}`;
}