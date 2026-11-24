import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Lazy so `next build` does not need DATABASE_URL; created on first query.
let sql: NeonQueryFunction<false, false> | null = null;

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getSql(): NeonQueryFunction<false, false> {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. Run `npx vercel env pull .env.local` or add it to the environment.");
    sql = neon(url);
  }
  return sql;
}
