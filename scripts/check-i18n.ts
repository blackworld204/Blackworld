import { loadTranslation, translateExtras } from "@/i18n/translate-catalog";

async function main() {
  const t0 = Date.now();
  const it: Record<string, string> = await loadTranslation("it");
  console.log("it", Object.keys(it).length, it["Create account"], it["8 characters"], `${Date.now() - t0}ms`);
  const t1 = Date.now();
  const es: Record<string, string> = await translateExtras("es");
  console.log("es-extra", Object.keys(es).length, es["8 characters"], `${Date.now() - t1}ms`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
