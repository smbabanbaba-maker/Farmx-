import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/lib/i18n.tsx", import.meta.url), "utf8");
const supported = ["en", "ha", "ig", "yo", "kr"];

function objectBody(name) {
  const start = source.indexOf(`const ${name}: Dict = {`);
  if (start < 0) throw new Error(`Missing dictionary: ${name}`);
  const bodyStart = source.indexOf("\n", start) + 1;
  const end = source.indexOf("\n};", bodyStart);
  if (end < 0) throw new Error(`Unterminated dictionary: ${name}`);
  return source.slice(bodyStart, end);
}

function explicitKeys(body) {
  return new Set(
    [...body.matchAll(/^\s*(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))\s*:/gm)].map(
      (match) => match[1] ?? match[2],
    ),
  );
}

const englishKeys = explicitKeys(objectBody("en"));
const reports = [];
for (const language of supported.slice(1)) {
  const body = objectBody(language);
  const keys = explicitKeys(body);
  const spreadsEnglish = body.includes("...en");
  const missing = [...englishKeys].filter((key) => !keys.has(key) && !spreadsEnglish);
  const fallback = spreadsEnglish ? [...englishKeys].filter((key) => !keys.has(key)) : [];
  reports.push({ language, missing, fallback });
}

const missing = reports.flatMap(({ language, missing: keys }) =>
  keys.map((key) => `${language}.${key}`),
);
console.log(`English source keys: ${englishKeys.size}`);
for (const report of reports) {
  console.log(`${report.language}: ${report.fallback.length} English fallback keys`);
}
if (missing.length) {
  console.error("Missing translation keys:");
  for (const key of missing) console.error(`- ${key}`);
  process.exitCode = 1;
} else {
  console.log("Missing translation keys: 0");
}
