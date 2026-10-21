export function Glyph({ name }: { name: "send" | "deposit" | "card" | "exchange" | "support" | "bell" | "in" | "out" }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 18,
    height: 18,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "send") {
    return (
      <svg {...common}>
        <path d="M4 12h14" />
        <path d="M13 6l6 6-6 6" />
      </svg>
    );
  }
  if (name === "deposit") {
    return (
      <svg {...common}>
        <path d="M12 4v12" />
        <path d="M7 11l5 5 5-5" />
        <path d="M5 20h14" />
      </svg>
    );
  }
  if (name === "card") {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="12" />
        <path d="M3 10h18" />
      </svg>
    );
  }
  if (name === "exchange") {
    return (
      <svg {...common}>
        <path d="M7 7h11l-3-3" />
        <path d="M17 17H6l3 3" />
      </svg>
    );
  }
  if (name === "support") {
    return (
      <svg {...common}>
        <path d="M5 6h14v9H8l-3 3z" />
      </svg>
    );
  }
  if (name === "in") {
    return (
      <svg {...common}>
        <path d="M12 4v11" />
        <path d="M8 11l4 4 4-4" />
        <path d="M5 20h14" />
      </svg>
    );
  }
  if (name === "out") {
    return (
      <svg {...common}>
        <path d="M12 16V5" />
        <path d="M8 9l4-4 4 4" />
        <path d="M5 20h14" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5 1.5 5H4.5S6 13 6 9z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}
