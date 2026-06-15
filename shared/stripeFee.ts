const STRIPE_PCT = 0.039;
const STRIPE_FIXED_RSD = Math.round(0.30 * 117); // ≈35 RSD

export function calcStripeFee(amountRsd: number): number {
  return Math.round(amountRsd * STRIPE_PCT + STRIPE_FIXED_RSD);
}

export function totalWithFee(amountRsd: number): number {
  return amountRsd + calcStripeFee(amountRsd);
}
