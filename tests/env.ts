import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Vitest/Playwright run outside Next.js, so Next's own .env loading
// never happens here -- this reads the same two files by hand and
// merges them into process.env (without overwriting anything already
// set, e.g. by the shell). .env.local supplies the real project's
// NEXT_PUBLIC_SUPABASE_URL/ANON_KEY (same values the app itself uses,
// per the "no separate Supabase project" constraint); .env.test.local
// supplies the two dedicated test accounts' credentials and is never
// committed (.env* is gitignored).
function loadEnvFile(filename: string) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf-8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env.test.local");
