// Words that suggest disease claims. The reviewer must rewrite these before approval.
const CLAIM_PATTERNS: RegExp[] = [
  /\b(cure|cures|cured|treat|treats|treatment|prevent|prevents|heal|heals)\b/i,
  /\b(diabetes|cancer|tuberculosis|asthma|covid|hypertension|thyroid|arthritis|pcos|infertility)\b/i,
  /(इलाज|ठीक करता|ठीक करती|ठीक कर|रोग दूर|बीमारी दूर|जड़ से खत्म|जड़ से ख़त्म)/,
];

export const PLACEHOLDER = "[reviewer draft needed]";

// Returns the patterns that matched. An empty list means no obvious claim words.
export function findClaimIssues(text: string): string[] {
  return CLAIM_PATTERNS.filter((p) => p.test(text)).map((p) => p.source);
}