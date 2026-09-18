// Rotate the access code: node scripts/set-code.mjs "NEW-CODE-HERE"
// Prints the hash to paste into lib/gate.ts (CODE_HASH). The code itself is never written
// to the repository; keep it out of git and hand it to participants directly.
import { createHash } from "crypto";
const code = process.argv[2];
if (!code) { console.error('usage: node scripts/set-code.mjs "NEW-CODE"'); process.exit(1); }
const hash = createHash("sha256").update(`jev-gold-2026:${code.trim().toUpperCase()}`).digest("hex");
console.log(`CODE_HASH = "${hash}"`);
