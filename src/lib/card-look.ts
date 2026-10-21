export function cardFaceClass(card: { last4: string; primary?: boolean; frozen?: boolean }) {
  const tone = card.primary
    ? "look-photo"
    : Number.parseInt(card.last4, 10) % 2 === 0
      ? "look-linear"
      : "look-wash";
  return `card-face ${tone}${card.frozen ? " is-frozen" : ""}`;
}
