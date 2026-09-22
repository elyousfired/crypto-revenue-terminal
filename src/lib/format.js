// Currency and Number Formatting Utilities with Strict "ND" support

export function fmtUsd(val) {
  if (val === null || val === undefined || isNaN(val)) return 'ND';
  if (val === 0) return '$0.00';
  if (val >= 1e12) return '$' + (val / 1e12).toFixed(2) + 'T';
  if (val >= 1e9) return '$' + (val / 1e9).toFixed(2) + 'B';
  if (val >= 1e6) return '$' + (val / 1e6).toFixed(2) + 'M';
  if (val >= 1e3) return '$' + (val / 1e3).toFixed(2) + 'K';
  if (val < 0.0001) return '$' + val.toFixed(6);
  if (val < 1) return '$' + val.toFixed(4);
  return '$' + val.toFixed(2);
}

export function fmtCompact(val) {
  if (val === null || val === undefined || isNaN(val)) return 'ND';
  if (val >= 1e9) return (val / 1e9).toFixed(2) + 'B';
  if (val >= 1e6) return (val / 1e6).toFixed(2) + 'M';
  if (val >= 1e3) return (val / 1e3).toFixed(1) + 'K';
  return val.toFixed(0);
}

export function fmtPct(val) {
  if (val === null || val === undefined || isNaN(val)) return '0.00%';
  const prefix = val > 0 ? '+' : '';
  return prefix + val.toFixed(2) + '%';
}

export function fmtMultiple(val) {
  if (val === null || val === undefined || isNaN(val) || val <= 0) return 'ND';
  if (val >= 1000) return (val / 1000).toFixed(1) + 'Kx';
  return val.toFixed(1) + 'x';
}
