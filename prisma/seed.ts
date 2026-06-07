// Categories are now per-user and created automatically on signup (see
// events.createUser in src/auth.ts). There is no global seed data to write.
// This file is kept so `prisma migrate dev` doesn't error on a missing seed.
console.log("Seed: nothing to do — categories are created per user on signup ✅");
