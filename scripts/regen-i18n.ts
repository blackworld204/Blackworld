import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { catalog } from "@/i18n/messages";
import { loadTranslation, translateExtras } from "@/i18n/translate-catalog";

const cache = path.join(process.cwd(), "data", "i18n-cache");
const shipped = path.join(process.cwd(), "src", "i18n", "cache");

async function ship(file: string) {
  await mkdir(shipped, { recursive: true });
  const from = path.join(cache, file);
  const to = path.join(shipped, file);
  const temp = `${to}.${process.pid}.tmp`;
  await writeFile(temp, await readFile(from));
  await rename(temp, to);
}

async function main() {
  const locales = process.argv.slice(2);
  if (!locales.length) {
    console.error("usage: regen-i18n <locale>...");
    process.exit(1);
  }

  for (const locale of locales) {
    const t0 = Date.now();
    for (const file of [`${locale}.json`, `extra-${locale}.json`]) {
      for (const dir of [cache, shipped]) {
        try {
          await unlink(path.join(dir, file));
        } catch {
          /* missing is fine */
        }
      }
    }

    if (catalog[locale]) {
      const extras = await translateExtras(locale);
      await ship(`extra-${locale}.json`);
      console.log(
        locale,
        "bundled+extras",
        Object.keys(extras).length,
        extras["8 characters"] ?? extras["Show password"] ?? "",
        `${((Date.now() - t0) / 1000).toFixed(1)}s`,
      );
      continue;
    }

    const table: Record<string, string> = await loadTranslation(locale);
    await ship(`${locale}.json`);
    try {
      await ship(`extra-${locale}.json`);
    } catch {
      /* extras optional if translateExtras failed inside loadTranslation */
    }
    console.log(
      locale,
      "keys",
      Object.keys(table).length,
      "sample:",
      table["Create account"],
      table["8 characters"],
      `${((Date.now() - t0) / 1000).toFixed(1)}s`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
