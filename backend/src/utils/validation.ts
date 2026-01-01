/**
 * Validates a BNB (Binance Smart Chain) wallet address
 * BNB addresses are Ethereum-compatible addresses (0x followed by 40 hex characters)
 */
export function isValidBNBAddress(address: string): boolean {
  if (!address) return false;
  
  // Remove whitespace
  const trimmed = address.trim();
  
  // Must start with 0x
  if (!trimmed.startsWith('0x')) return false;
  
  // Must be exactly 42 characters (0x + 40 hex chars)
  if (trimmed.length !== 42) return false;
  
  // Must contain only hexadecimal characters after 0x
  const hexPattern = /^0x[a-fA-F0-9]{40}$/;
  return hexPattern.test(trimmed);
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

