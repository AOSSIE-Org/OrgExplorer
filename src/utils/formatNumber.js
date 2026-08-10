export function formatNumber(num) {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  }

  if (num >= 1_000_000) {
    const millions = (num / 1_000_000).toFixed(1);
    if (millions === '1000.0') return `${(num / 1_000_000_000).toFixed(1)}B`;
    return `${millions}M`;
  }

  if (num >= 1_000) {
    const thousands = (num / 1_000).toFixed(1);
    if (thousands === '1000.0') return `${(num / 1_000_000).toFixed(1)}M`;
    return `${thousands}K`;
  }

  return num.toString();
}