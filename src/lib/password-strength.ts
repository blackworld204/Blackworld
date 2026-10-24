export const passwordRequiredMessage = "Enter a password.";
export const strongPasswordMessage =
  "Use 8 characters with upper and lower case, a number, and a symbol.";

export type PasswordCheck = {
  id: "length" | "lower" | "upper" | "number" | "symbol";
  label: string;
  pass: boolean;
};

const labels = ["", "Weak", "Fair", "Good", "Strong"] as const;

export function passwordChecks(password: string): PasswordCheck[] {
  return [
    { id: "length", label: "8 characters", pass: password.length >= 8 },
    { id: "lower", label: "A lowercase letter", pass: /[a-z]/.test(password) },
    { id: "upper", label: "An uppercase letter", pass: /[A-Z]/.test(password) },
    { id: "number", label: "A number", pass: /\d/.test(password) },
    { id: "symbol", label: "A symbol", pass: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function isStrongPassword(password: string) {
  return passwordChecks(password).every((check) => check.pass);
}

/** 0 empty, 1 weak, 2 fair, 3 good, 4 strong. */
export function passwordLevel(password: string) {
  if (!password) return 0;
  const met = passwordChecks(password).filter((check) => check.pass).length;
  if (met <= 2) return 1;
  if (met === 3) return 2;
  if (met === 4) return 3;
  return 4;
}

export function passwordLevelLabel(level: number) {
  return labels[level] ?? "";
}
