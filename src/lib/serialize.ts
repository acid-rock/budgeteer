// Prisma returns `Decimal` objects for the money columns (amount, limit).
// These helpers convert them to plain numbers at the API boundary so the JSON
// wire format — and therefore the frontend — keeps treating money as `number`.
// Peso values are well within IEEE-754 safe-integer range, so the conversion is
// lossless for display; exact arithmetic is done in the database (see reports).

export function serializeTransaction<T extends { amount: unknown }>(t: T) {
  return { ...t, amount: Number(t.amount) };
}

export function serializeBudget<T extends { limit: unknown }>(b: T) {
  return { ...b, limit: Number(b.limit) };
}
