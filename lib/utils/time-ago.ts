export function formatLastSynced(
  isoString: string | undefined | null,
  locale = 'en'
): string {
  if (!isoString) return '';

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'Updated just now';
  if (diffMin < 60) {
    return diffMin === 1 ? 'Updated 1 min ago' : `Updated ${diffMin} min ago`;
  }

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return diffHr === 1 ? 'Updated 1 hour ago' : `Updated ${diffHr} hours ago`;
  }

  const dateFmt = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `Updated ${dateFmt.format(date)}`;
}
