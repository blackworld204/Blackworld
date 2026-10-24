import * as yup from "yup";
import { isStrongPassword, passwordRequiredMessage, strongPasswordMessage } from "@/lib/password-strength";

const name = "Enter a first and last name.";
const emailMessage = "Enter a valid email.";
const confirmPasswordMessage = "Confirm the password.";
const passwordMatch = "Passwords do not match.";
const phoneMessage = "Enter a valid phone number.";
const balanceMessage = "Enter an opening balance of zero or more.";
const addressMessage = "Enter the street, city, and postal code, or skip the address.";
const pinMessage = "PIN must be 4 digits.";
const pinMatch = "PIN entries do not match.";

function identityFields() {
  return {
    first: yup.string().trim().required(name),
    last: yup.string().trim().required(name),
    email: yup
      .string()
      .trim()
      .required(emailMessage)
      .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, emailMessage),
    password: yup
      .string()
      .required(passwordRequiredMessage)
      .test("strong", strongPasswordMessage, (value) => !value || isStrongPassword(value)),
    confirmPassword: yup
      .string()
      .required(confirmPasswordMessage)
      .test("match", passwordMatch, function (value) {
        if (!value) return true;
        return value === this.parent.password;
      }),
    phone: yup
      .string()
      .trim()
      .required(phoneMessage)
      .matches(/^[0-9+\-\s()]{7,}$/, phoneMessage),
  };
}

function pinFields() {
  return {
    pin: yup.string().required(pinMessage).matches(/^\d{4}$/, pinMessage),
    confirm: yup
      .string()
      .required(pinMatch)
      .test("match", pinMatch, function (value) {
        if (!value) return true;
        return value === this.parent.pin;
      }),
  };
}

export const personalSchema = yup.object({
  ...identityFields(),
  balance: yup
    .string()
    .required(balanceMessage)
    .test("balance", balanceMessage, (value) => {
      const amount = Number(value);
      return Number.isFinite(amount) && amount >= 0;
    }),
});

export const addressSchema = yup
  .object({
    street: yup.string().trim().defined(),
    city: yup.string().trim().defined(),
    zip: yup.string().trim().defined(),
  })
  .test("address", addressMessage, (value) => {
    const started = Boolean(value.street || value.city || value.zip);
    if (!started) return true;
    return Boolean(value.street && value.city && value.zip);
  });

export const securitySchema = yup.object(pinFields());

export const applySchema = yup.object({
  ...identityFields(),
  ...pinFields(),
});

export function collectErrors(schema: yup.Schema, value: unknown) {
  try {
    schema.validateSync(value, { abortEarly: false });
    return {} as Record<string, string>;
  } catch (error) {
    if (!(error instanceof yup.ValidationError)) throw error;
    const map: Record<string, string> = {};
    const items = error.inner.length > 0 ? error.inner : [error];
    for (const item of items) {
      const key = item.path && item.path.length > 0 ? item.path : "_form";
      if (!map[key]) map[key] = item.message;
    }
    return map;
  }
}
