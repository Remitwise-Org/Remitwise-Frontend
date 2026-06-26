interface FormatOptions {
  locale?: string;
  currency?: string;
  minDecimalPlaces?: number;
  maxDecimalPlaces?: number;
  stripZeros?: boolean;
}

export function formatCurrency(value: number, options: FormatOptions = {}): string {
  const {
    locale = 'en-US',
    currency = 'USD',
    minDecimalPlaces = 2,
    maxDecimalPlaces = 2,
    stripZeros = false,
  } = options;

  let formatted = new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: minDecimalPlaces,
    maximumFractionDigits: maxDecimalPlaces,
  }).format(value);

  if (stripZeros && formatted.includes('.')) {
    // Regular expression to safely truncate trailing zeroes
    formatted = formatted.replace(/\.?0+$/, '');
  }

  return formatted;
}