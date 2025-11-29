// Currency utility for Kenyan Shillings
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatCurrencyCompact = (amount: number): string => {
  if (amount >= 1000000) {
    return `KSh ${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `KSh ${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
};

export const parseCurrency = (value: string): number => {
  // Remove currency symbols and parse
  const cleaned = value.replace(/[KSh,\s]/g, '');
  return parseFloat(cleaned) || 0;
};

export const CURRENCY_SYMBOL = 'KSh';
export const CURRENCY_CODE = 'KES';