// Formats price (stored as minor units, e.g. 15000 = 150.00) as "150 ₼"
// Uses the Azerbaijani manat symbol (U+20BC) instead of the ISO code "AZN".
export function formatMoney(amountMinorUnits: number): string {
  const val = amountMinorUnits / 100;
  const formatted = Number.isInteger(val)
    ? val.toLocaleString('az-AZ')
    : val.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${formatted} ₼`;
}
