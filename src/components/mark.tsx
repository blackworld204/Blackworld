export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className="mark"
    >
      <rect width="32" height="32" fill="currentColor" />
      <text
        x="16"
        y="23.5"
        textAnchor="middle"
        fill="#efeae1"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="22"
      >
        B
      </text>
    </svg>
  );
}
