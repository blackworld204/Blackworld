/**
 * Rebuild public/data/banks/*.json from PeterNotenboom/SwiftCodes.
 *
 * Usage:
 *   curl -sL -o /tmp/swiftcodes.zip https://codeload.github.com/PeterNotenboom/SwiftCodes/zip/refs/heads/master
 *   unzip -qo /tmp/swiftcodes.zip -d /tmp
 *   node scripts/gen-banks.mjs /tmp/SwiftCodes-master/AllCountries
 */
import fs from "node:fs";
import path from "node:path";

const srcDir = process.argv[2];
if (!srcDir) {
  console.error("Usage: node scripts/gen-banks.mjs <AllCountries-dir>");
  process.exit(1);
}

const SMALL = new Set([
  "A",
  "AN",
  "AND",
  "AS",
  "AT",
  "BY",
  "FOR",
  "FROM",
  "IN",
  "OF",
  "ON",
  "OR",
  "THE",
  "TO",
  "UND",
  "DE",
  "DA",
  "DI",
  "DU",
  "DES",
  "LA",
  "LE",
  "LES",
  "EL",
  "LOS",
  "LAS",
  "Y",
  "E",
  "VAN",
  "VON",
  "DER",
  "DEN",
  "DAS",
]);

const KEEP_UPPER = new Set(["LLC", "PLC", "N.A.", "NA", "SA", "AG", "NV", "BV", "ASA", "AB", "OY", "SPA", "SRL", "LTD", "INC", "CORP", "FZE", "PJSC", "JSC"]);

function niceName(name) {
  const cleaned = name.replace(/\s+/g, " ").trim();
  if (!cleaned) return cleaned;
  const letters = [...cleaned].filter((c) => /[A-Za-z]/.test(c));
  if (letters.length && letters.filter((c) => c === c.toUpperCase()).length / letters.length < 0.7) {
    return cleaned;
  }
  return cleaned
    .split(" ")
    .map((raw, index) => {
      if (!raw) return raw;
      return raw
        .split("-")
        .map((seg) => {
          if (!seg) return seg;
          const upper = seg.toUpperCase();
          if (KEEP_UPPER.has(upper)) return upper;
          if (SMALL.has(upper) && index > 0) return seg.toLowerCase();
          return seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase();
        })
        .join("-");
    })
    .join(" ");
}

function uniqueBanks(entries) {
  const byName = new Map();
  for (const entry of entries) {
    const name = String(entry.bank || "").trim();
    const swift = String(entry.swift_code || "")
      .trim()
      .toUpperCase();
    const branch = String(entry.branch || "");
    if (!name) continue;
    const key = name.toLowerCase().replace(/\s+/g, " ");
    let score = 0;
    if (swift.length === 8) score += 3;
    if (swift.endsWith("XXX")) score += 2;
    if (!branch) score += 1;
    const prev = byName.get(key);
    if (!prev || score > prev.score) byName.set(key, { score, name, swift });
  }
  const final = new Map();
  for (const item of byName.values()) {
    const nice = niceName(item.name);
    const key = nice.toLowerCase();
    const row = { name: nice };
    if (item.swift) row.swift = item.swift.slice(0, 8);
    const existing = final.get(key);
    if (!existing || (row.swift && !existing.swift)) final.set(key, row);
  }
  return [...final.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const outDir = path.resolve("public/data/banks");
fs.mkdirSync(outDir, { recursive: true });
const counts = {};
for (const file of fs.readdirSync(srcDir).filter((name) => name.endsWith(".json")).sort()) {
  const data = JSON.parse(fs.readFileSync(path.join(srcDir, file), "utf8"));
  const banks = uniqueBanks(data.list || []);
  const code = path.basename(file, ".json").toUpperCase();
  fs.writeFileSync(path.join(outDir, `${code}.json`), JSON.stringify(banks));
  counts[code] = banks.length;
}
fs.writeFileSync(
  path.join(outDir, "manifest.json"),
  `${JSON.stringify(
    {
      source: "https://github.com/PeterNotenboom/SwiftCodes",
      license: "MIT",
      countries: Object.keys(counts).length,
      banks: Object.values(counts).reduce((sum, n) => sum + n, 0),
      counts,
    },
    null,
    2,
  )}\n`,
);
console.log(`Wrote ${Object.keys(counts).length} countries, ${Object.values(counts).reduce((a, b) => a + b, 0)} banks`);
