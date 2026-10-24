import type { ReactNode } from "react";

function star(cx: number, cy: number, r: number) {
  const points: string[] = [];
  for (let i = 0; i < 5; i += 1) {
    const outer = ((-90 + i * 72) * Math.PI) / 180;
    const inner = ((-54 + i * 72) * Math.PI) / 180;
    const round = (value: number) => Math.round(value * 100) / 100;
    points.push(`${round(cx + Math.cos(outer) * r)},${round(cy + Math.sin(outer) * r)}`);
    points.push(`${round(cx + Math.cos(inner) * r * 0.38)},${round(cy + Math.sin(inner) * r * 0.38)}`);
  }
  return points.join(" ");
}

function Jack() {
  return (
    <>
      <rect width="60" height="42" fill="#012169" />
      <path d="M0 0 L60 42 M60 0 L0 42" stroke="#fff" strokeWidth="8" />
      <path d="M0 0 L60 42 M60 0 L0 42" stroke="#C8102E" strokeWidth="3.2" />
      <path d="M30 0 V42 M0 21 H60" stroke="#fff" strokeWidth="14" />
      <path d="M30 0 V42 M0 21 H60" stroke="#C8102E" strokeWidth="8" />
    </>
  );
}

const FLAGS: Record<string, ReactNode> = {
  USD: (
    <>
      {Array.from({ length: 13 }, (_, index) => (
        <rect
          key={index}
          y={(42 / 13) * index}
          width="60"
          height={42 / 13 + 0.3}
          fill={index % 2 === 0 ? "#B22234" : "#fff"}
        />
      ))}
      <rect width="26" height={(42 / 13) * 7} fill="#3C3B6E" />
      {[
        [6, 3.2],
        [14, 3.2],
        [22, 3.2],
        [10, 7.4],
        [18, 7.4],
        [6, 11.6],
        [14, 11.6],
        [22, 11.6],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.05" fill="#fff" />
      ))}
    </>
  ),
  EUR: (
    <>
      <rect width="60" height="42" fill="#003399" />
      {Array.from({ length: 12 }, (_, index) => {
        const angle = ((index * 30 - 90) * Math.PI) / 180;
        return (
          <polygon
            key={index}
            points={star(30 + Math.cos(angle) * 12, 21 + Math.sin(angle) * 12, 2.1)}
            fill="#FC0"
          />
        );
      })}
    </>
  ),
  GBP: <Jack />,
  JPY: (
    <>
      <rect width="60" height="42" fill="#fff" />
      <circle cx="30" cy="21" r="12" fill="#BC002D" />
    </>
  ),
  CHF: (
    <>
      <rect width="60" height="42" fill="#D52B1E" />
      <rect x="25" y="8" width="10" height="26" fill="#fff" />
      <rect x="17" y="16" width="26" height="10" fill="#fff" />
    </>
  ),
  CAD: (
    <>
      <rect width="60" height="42" fill="#fff" />
      <rect width="16" height="42" fill="#FF0000" />
      <rect x="44" width="16" height="42" fill="#FF0000" />
      <polygon points="30,8 33,16 40,16 34,21 36,30 30,25 24,30 26,21 20,16 27,16" fill="#FF0000" />
    </>
  ),
  CNY: (
    <>
      <rect width="60" height="42" fill="#DE2910" />
      <polygon points={star(14, 12, 5)} fill="#FFDE00" />
      {[
        [24, 5],
        [28, 10],
        [28, 16],
        [24, 20],
      ].map(([x, y]) => (
        <polygon key={`${x}-${y}`} points={star(x, y, 1.7)} fill="#FFDE00" />
      ))}
    </>
  ),
  AUD: (
    <>
      <rect width="60" height="42" fill="#012169" />
      <g transform="scale(0.42)">
        <Jack />
      </g>
      <polygon points={star(46, 30, 5)} fill="#fff" />
      <polygon points={star(50, 12, 2.2)} fill="#fff" />
      <polygon points={star(40, 16, 1.8)} fill="#fff" />
    </>
  ),
  SGD: (
    <>
      <rect width="60" height="21" fill="#EF3340" />
      <rect y="21" width="60" height="21" fill="#fff" />
      <circle cx="16" cy="10.5" r="6" fill="#fff" />
      <circle cx="18.4" cy="10.5" r="5" fill="#EF3340" />
      {[0, 1, 2, 3, 4].map((index) => (
        <circle key={index} cx={26 + (index % 3) * 3.2} cy={6 + Math.floor(index / 3) * 4.2} r="0.9" fill="#fff" />
      ))}
    </>
  ),
  en: null,
  es: (
    <>
      <rect width="60" height="42" fill="#AA151B" />
      <rect y="10.5" width="60" height="21" fill="#F1BF00" />
    </>
  ),
  fr: (
    <>
      <rect width="20" height="42" fill="#002395" />
      <rect x="20" width="20" height="42" fill="#fff" />
      <rect x="40" width="20" height="42" fill="#ED2939" />
    </>
  ),
  de: (
    <>
      <rect width="60" height="14" fill="#000" />
      <rect y="14" width="60" height="14" fill="#DD0000" />
      <rect y="28" width="60" height="14" fill="#FFCE00" />
    </>
  ),
  pt: (
    <>
      <rect width="24" height="42" fill="#006600" />
      <rect x="24" width="36" height="42" fill="#FF0000" />
      <circle cx="24" cy="21" r="7" fill="#FFCC00" />
      <circle cx="24" cy="21" r="3.2" fill="#fff" />
    </>
  ),
  zh: null,
  ja: null,
  ko: (
    <>
      <rect width="60" height="42" fill="#fff" />
      <circle cx="30" cy="21" r="9" fill="#CD2E3A" />
      <path d="M21 21 a9 9 0 0 1 18 0 a4.5 4.5 0 0 1 -9 0 a4.5 4.5 0 0 0 -9 0" fill="#0047A0" />
      <g fill="#000">
        <rect x="8" y="7" width="9" height="1.3" />
        <rect x="8" y="10" width="9" height="1.3" />
        <rect x="8" y="13" width="9" height="1.3" />
        <rect x="43" y="7" width="9" height="1.3" />
        <rect x="43" y="10" width="9" height="1.3" />
        <rect x="43" y="13" width="9" height="1.3" />
        <rect x="8" y="28" width="9" height="1.3" />
        <rect x="8" y="31" width="9" height="1.3" />
        <rect x="8" y="34" width="9" height="1.3" />
        <rect x="43" y="28" width="9" height="1.3" />
        <rect x="43" y="31" width="9" height="1.3" />
        <rect x="43" y="34" width="9" height="1.3" />
      </g>
    </>
  ),
  hi: (
    <>
      <rect width="60" height="14" fill="#FF9933" />
      <rect y="14" width="60" height="14" fill="#fff" />
      <rect y="28" width="60" height="14" fill="#138808" />
      <circle cx="30" cy="21" r="5" fill="none" stroke="#000080" strokeWidth="1" />
      <circle cx="30" cy="21" r="0.8" fill="#000080" />
    </>
  ),
  ar: (
    <>
      <rect width="60" height="42" fill="#006C35" />
      <path d="M12 27 C22 22 38 22 48 27" stroke="#fff" strokeWidth="2" fill="none" />
      <path d="M46 27 L50 25 L47 30 Z" fill="#fff" />
    </>
  ),
};

const SHARED: Record<string, string> = {
  en: "USD",
  US: "USD",
  GB: "GBP",
  CA: "CAD",
  AU: "AUD",
  SG: "SGD",
  JP: "JPY",
  CN: "CNY",
  IN: "hi",
  CH: "CHF",
  DE: "de",
  FR: "fr",
  ES: "es",
  ZA: "za",
  NG: "ng",
  GH: "gh",
  KE: "ke",
  BR: "br",
  MX: "mx",
  AE: "ae",
  PR: "pr",
  NGN: "ng",
  INR: "hi",
  ZAR: "za",
  AED: "ae",
  BRL: "br",
  MXN: "mx",
  zh: "CNY",
  ja: "JPY",
  ta: "hi",
  te: "hi",
  mr: "hi",
  af: "za",
  zu: "za",
};

const BANDS: Record<string, { axis: "h" | "v"; colors: string[] }> = {
  it: { axis: "v", colors: ["#009246", "#fff", "#CE2B37"] },
  nl: { axis: "h", colors: ["#AE1C28", "#fff", "#21468B"] },
  pl: { axis: "h", colors: ["#fff", "#DC143C"] },
  ru: { axis: "h", colors: ["#fff", "#0039A6", "#D52B1E"] },
  uk: { axis: "h", colors: ["#005BBB", "#FFD500"] },
  hu: { axis: "h", colors: ["#CE2939", "#fff", "#477050"] },
  ro: { axis: "v", colors: ["#002B7F", "#FCD116", "#CE1126"] },
  bg: { axis: "h", colors: ["#fff", "#00966E", "#D62612"] },
  sk: { axis: "h", colors: ["#fff", "#0B4EA2", "#EE1C25"] },
  sl: { axis: "h", colors: ["#fff", "#0000FF", "#FF0000"] },
  hr: { axis: "h", colors: ["#FF0000", "#fff", "#171796"] },
  sr: { axis: "h", colors: ["#C6363C", "#0C4076", "#fff"] },
  lt: { axis: "h", colors: ["#FDB913", "#006A44", "#C1272D"] },
  lv: { axis: "h", colors: ["#9E3039", "#fff", "#9E3039"] },
  et: { axis: "h", colors: ["#0072CE", "#000", "#fff"] },
  ga: { axis: "v", colors: ["#169B62", "#fff", "#FF883E"] },
  ca: { axis: "h", colors: ["#FCDD09", "#DA121A", "#FCDD09", "#DA121A", "#FCDD09"] },
  id: { axis: "h", colors: ["#CE1126", "#fff"] },
  th: { axis: "h", colors: ["#A51931", "#F4F5F8", "#2D2A4A", "#F4F5F8", "#A51931"] },
  ms: { axis: "h", colors: ["#CC0001", "#fff", "#CC0001", "#fff", "#CC0001", "#fff"] },
  am: { axis: "h", colors: ["#078930", "#FCDD09", "#DA121A"] },
  fa: { axis: "h", colors: ["#239F40", "#fff", "#DA0000"] },
  ng: { axis: "v", colors: ["#008751", "#fff", "#008751"] },
  gh: { axis: "h", colors: ["#CE1126", "#FCD116", "#006B3F"] },
  ke: { axis: "h", colors: ["#000", "#BB0000", "#006600"] },
  mx: { axis: "v", colors: ["#006847", "#fff", "#CE1126"] },
};

function bands(axis: "h" | "v", colors: string[]) {
  if (axis === "h") {
    const height = 42 / colors.length;
    return colors.map((fill, index) => (
      <rect key={fill + index} y={height * index} width="60" height={height + 0.4} fill={fill} />
    ));
  }
  const width = 60 / colors.length;
  return colors.map((fill, index) => (
    <rect key={fill + index} x={width * index} width={width + 0.4} height="42" fill={fill} />
  ));
}

function nordic(field: string, cross: string, inner?: string) {
  return (
    <>
      <rect width="60" height="42" fill={field} />
      <rect x="16" width="10" height="42" fill={cross} />
      <rect y="16" width="60" height="10" fill={cross} />
      {inner ? (
        <>
          <rect x="18.2" width="5.6" height="42" fill={inner} />
          <rect y="18.2" width="60" height="5.6" fill={inner} />
        </>
      ) : null}
    </>
  );
}

const EXTRA: Record<string, ReactNode> = {
  tr: (
    <>
      <rect width="60" height="42" fill="#E30A17" />
      <circle cx="24" cy="21" r="8" fill="#fff" />
      <circle cx="26.6" cy="21" r="6.4" fill="#E30A17" />
    </>
  ),
  sv: nordic("#006AA7", "#FECC00"),
  da: nordic("#C60C30", "#fff"),
  no: nordic("#BA0C2F", "#fff", "#00205B"),
  fi: nordic("#fff", "#003580"),
  el: (
    <>
      {Array.from({ length: 9 }, (_, index) => (
        <rect key={index} y={(42 / 9) * index} width="60" height={42 / 9 + 0.25} fill={index % 2 ? "#fff" : "#0D5EAF"} />
      ))}
      <rect width="24" height={(42 / 9) * 5} fill="#0D5EAF" />
      <rect x="10" width="4" height={(42 / 9) * 5} fill="#fff" />
      <rect y={(42 / 9) * 2} width="24" height="4" fill="#fff" />
    </>
  ),
  cs: (
    <>
      <rect width="60" height="21" fill="#fff" />
      <rect y="21" width="60" height="21" fill="#D7141A" />
      <polygon points="0,0 28,21 0,42" fill="#11457E" />
    </>
  ),
  vi: (
    <>
      <rect width="60" height="42" fill="#DA251D" />
      <polygon points={star(30, 21, 8)} fill="#FF0" />
    </>
  ),
  bn: (
    <>
      <rect width="60" height="42" fill="#006A4E" />
      <circle cx="26" cy="21" r="9" fill="#F42A41" />
    </>
  ),
  ur: (
    <>
      <rect width="15" height="42" fill="#fff" />
      <rect x="15" width="45" height="42" fill="#01411C" />
      <circle cx="34" cy="21" r="7" fill="#fff" />
      <circle cx="36.4" cy="20" r="5.6" fill="#01411C" />
    </>
  ),
  he: (
    <>
      <rect width="60" height="42" fill="#fff" />
      <rect y="5" width="60" height="5" fill="#0038B8" />
      <rect y="32" width="60" height="5" fill="#0038B8" />
      <polygon points={star(30, 21, 6)} fill="none" stroke="#0038B8" strokeWidth="1.2" />
    </>
  ),
  sw: (
    <>
      <rect width="60" height="42" fill="#BB0000" />
      <rect y="0" width="60" height="12" fill="#000" />
      <rect y="30" width="60" height="12" fill="#006600" />
      <rect y="12" width="60" height="2" fill="#fff" />
      <rect y="28" width="60" height="2" fill="#fff" />
    </>
  ),
  za: (
    <>
      <rect width="60" height="42" fill="#007A4D" />
      <polygon points="0,0 60,0 60,15 22,15" fill="#DE3831" />
      <polygon points="0,42 60,42 60,27 22,27" fill="#002395" />
      <polygon points="0,8 16,21 0,34" fill="#000" />
      <polygon points="0,12 12,21 0,30" fill="#FFB612" />
    </>
  ),
  br: (
    <>
      <rect width="60" height="42" fill="#009C3B" />
      <polygon points="30,6 54,21 30,36 6,21" fill="#FFDF00" />
      <circle cx="30" cy="21" r="7" fill="#002776" />
    </>
  ),
  ae: (
    <>
      <rect width="60" height="14" fill="#00732F" />
      <rect y="14" width="60" height="14" fill="#fff" />
      <rect y="28" width="60" height="14" fill="#000" />
      <rect width="16" height="42" fill="#FF0000" />
    </>
  ),
  pr: (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <rect key={index} y={(42 / 5) * index} width="60" height={42 / 5 + 0.2} fill={index % 2 ? "#fff" : "#ED0000"} />
      ))}
      <polygon points="0,0 26,21 0,42" fill="#0050F0" />
      <polygon points={star(10, 21, 3)} fill="#fff" />
    </>
  ),
  fil: (
    <>
      <rect width="60" height="21" fill="#0038A8" />
      <rect y="21" width="60" height="21" fill="#CE1126" />
      <polygon points="0,0 26,21 0,42" fill="#fff" />
      <polygon points={star(9, 21, 3.2)} fill="#FCD116" />
    </>
  ),
};

export function hasCurrencyFlag(code: string) {
  const key = SHARED[code] ?? code;
  return Boolean(FLAGS[key] || EXTRA[key] || BANDS[key]);
}

export function CurrencyFlag({ code }: { code: string }) {
  const key = SHARED[code] ?? code;
  const flag = FLAGS[key] ?? EXTRA[key];
  const band = BANDS[key];
  if (!flag && !band) return null;
  return (
    <svg className="ccy-flag" viewBox="0 0 60 42" aria-hidden="true">
      {flag ?? (band ? bands(band.axis, band.colors) : null)}
    </svg>
  );
}
