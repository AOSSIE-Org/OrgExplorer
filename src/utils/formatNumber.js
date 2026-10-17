export function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  
  const n = Number(num);

  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(1)}B`;
  }

  if (n >= 1_000_000) {
    const millions = (n / 1_000_000).toFixed(1);
    if (millions === '1000.0') return `${(n / 1_000_000_000).toFixed(1)}B`;
    return `${millions}M`;
  }

  if (n >= 1_000) {
    const thousands = (n / 1_000).toFixed(1);
    if (thousands === '1000.0') return `${(n / 1_000_000).toFixed(1)}M`;
    return `${thousands}K`;
  }

  return n.toString();
}