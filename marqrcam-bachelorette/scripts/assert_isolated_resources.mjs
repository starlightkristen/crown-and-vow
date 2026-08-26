#!/usr/bin/env node

import fs from "node:fs";

const EXPECTED = {
  worker: "marqrcam-crown-vow-bach-2026",
  namespace: "marqrcam-crown-vow-bach-2026",
  database: "marqrcam-crown-vow-bach-2026-db",
  bucket: "marqrcam-crown-vow-bach-2026-photos",
};

const raw = fs.readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const json = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const config = JSON.parse(json);

const failures = [];

if (config.name !== EXPECTED.worker) failures.push(`Worker name must be ${EXPECTED.worker}`);
if (config.vars?.PROJECT_NAMESPACE !== EXPECTED.namespace) failures.push(`PROJECT_NAMESPACE must be ${EXPECTED.namespace}`);

const db = config.d1_databases?.find((entry) => entry.binding === "DB");
if (!db) failures.push("Missing D1 binding DB");
else {
  if (db.database_name !== EXPECTED.database) failures.push(`D1 database must be ${EXPECTED.database}`);
  if (!db.database_id || db.database_id === "REPLACE_WITH_D1_DATABASE_ID") {
    failures.push("D1 database_id is not configured yet");
  }
}

const bucket = config.r2_buckets?.find((entry) => entry.binding === "PHOTOS");
if (!bucket) failures.push("Missing R2 binding PHOTOS");
else if (bucket.bucket_name !== EXPECTED.bucket) failures.push(`R2 bucket must be ${EXPECTED.bucket}`);

for (const binding of config.d1_databases ?? []) {
  if (binding.binding !== "DB") failures.push(`Unexpected D1 binding: ${binding.binding}`);
}
for (const binding of config.r2_buckets ?? []) {
  if (binding.binding !== "PHOTOS") failures.push(`Unexpected R2 binding: ${binding.binding}`);
}

if (failures.length) {
  console.error("MarQrCam isolation check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("\nDeployment intentionally blocked to prevent use of unrelated Cloudflare resources.");
  process.exit(1);
}

console.log("MarQrCam isolation check passed.");
console.log(`Worker: ${EXPECTED.worker}`);
console.log(`D1: ${EXPECTED.database}`);
console.log(`R2: ${EXPECTED.bucket}`);
