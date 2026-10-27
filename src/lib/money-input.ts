/** Accept "20,000" / "20 000.50" style input as a finite number. */
export function parseAmount(raw: string): number {
  const cleaned = raw.trim().replace(/[,\s]/g, "");
  if (!cleaned || cleaned === "." || cleaned === "-" || cleaned === "-.") return Number.NaN;
  return Number(cleaned);
}

/** Keep digits and one decimal, and group thousands with commas while typing. */
export function formatAmountInput(raw: string): string {
  const stripped = raw.replace(/[^\d.]/g, "");
  if (!stripped) return "";

  const firstDot = stripped.indexOf(".");
  let intPart: string;
  let fracPart: string | null = null;

  if (firstDot === -1) {
    intPart = stripped;
  } else {
    intPart = stripped.slice(0, firstDot);
    fracPart = stripped.slice(firstDot + 1).replace(/\./g, "");
  }

  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (fracPart !== null) return `${grouped}.${fracPart}`;
  return grouped;
}
