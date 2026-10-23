export const IST = "Asia/Kolkata";

// Returns YYYY-MM-DD for the given offset (in days) from today, in India time.
export function istDateOffset(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000);
  return date.toLocaleDateString("en-CA", { timeZone: IST });
}

// Month index 0-11 in India time.
export function istMonthIndex(): number {
  return Number(istDateOffset(0).slice(5, 7)) - 1;
}