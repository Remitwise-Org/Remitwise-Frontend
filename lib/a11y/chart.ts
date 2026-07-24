export type ChartSummaryItem = {
  name: string
  value: string
}

export function buildChartImageLabel(
  title: string,
  summaryItems: string[],
  t: (path: string, options?: string | Record<string, unknown>) => string,
) {
  const summary = summaryItems.length
    ? summaryItems.join(', ')
    : t('charts.noData', 'No data available.')

  const template = t('charts.imageLabel', '{{title}}: {{summary}}')

  return template
    .replace('{{title}}', title)
    .replace('{{summary}}', summary)
}

export function buildChartSummary(
  summaryItems: string[],
  t: (path: string, options?: string | Record<string, unknown>) => string,
) {
  if (!summaryItems.length) {
    return t('charts.noData', 'No data available.')
  }

  return summaryItems.join(', ')
}

export function generateTrendChartLabel(
  title: string,
  data: Record<string, any>[],
  seriesKeys: string[],
  t: (path: string, options?: string | Record<string, unknown>) => string = (p) => p
): string {
  const latest = data[data.length - 1] ?? {}
  const summaryItems = seriesKeys.map((key) => {
    const value = latest[key]
    return `${key}: $${value ?? 0}`
  })
  return buildChartImageLabel(title, summaryItems, t)
}

export function generateTrendChartSummary(
  data: Record<string, any>[],
  seriesKeys: string[],
  t: (path: string, options?: string | Record<string, unknown>) => string = (p) => p
): string {
  const totals = seriesKeys.map((key) => {
    const sum = data.reduce((acc, item) => {
      const v = Number(item[key])
      return acc + (isNaN(v) ? 0 : v)
    }, 0)
    return `${key}: $${sum}`
  })
  return buildChartSummary(totals, t)
}

