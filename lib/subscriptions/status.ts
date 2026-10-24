// Razorpay subscription statuses that give Plus access.
// "pending" (payment retry running) gives no grace for now.
export const PLUS_STATUSES: string[] = ["active"];

// Statuses that mean the user already has a subscription in progress or running.
// A "created" row that was never paid does not block a new start.
export const BLOCKING_STATUSES: string[] = ["authenticated", "active", "pending"];