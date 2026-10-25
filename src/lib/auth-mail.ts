import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  verifyBeforeUpdateEmail,
  verifyPasswordResetCode,
  type ActionCodeSettings,
  type Auth,
} from "firebase/auth";
import { changeUserEmail } from "@/lib/bank";
import { authReturnSettings, ensureFirebaseAuth } from "@/lib/firebase";

export function authContinueSettings(): ActionCodeSettings {
  return authReturnSettings();
}

async function authReady() {
  const auth = await ensureFirebaseAuth();
  if (!auth) throw new Error("Sign-in is not available right now.");
  return auth;
}

export async function sendPasswordReset(email: string) {
  const auth = await authReady();
  await sendPasswordResetEmail(auth, email.trim(), authContinueSettings());
}

export async function sendAddressVerification() {
  const auth = await authReady();
  const current = auth.currentUser;
  if (!current) throw new Error("Sign in again to verify this address.");
  await sendEmailVerification(current, authContinueSettings());
}

export async function requestEmailChange(nextEmail: string) {
  const auth = await authReady();
  const current = auth.currentUser;
  if (!current) throw new Error("Sign in again to change this address.");
  await verifyBeforeUpdateEmail(current, nextEmail.trim(), authContinueSettings());
}

export async function signInWithGoogle(pick = false) {
  const auth = await authReady();
  const provider = new GoogleAuthProvider();
  if (pick) provider.setCustomParameters({ prompt: "select_account" });
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "auth/operation-not-allowed") throw new Error("Google sign-in is not available.");
    throw error;
  }
}

export async function readPasswordReset(code: string) {
  const auth = await authReady();
  return verifyPasswordResetCode(auth, code);
}

export async function finishPasswordReset(code: string, password: string) {
  const auth = await authReady();
  await confirmPasswordReset(auth, code, password);
}

export async function finishAuthAction(mode: string, code: string) {
  const auth = await authReady();
  if (mode === "verifyEmail") {
    await applyActionCode(auth, code);
    await auth.currentUser?.reload();
    return "verified" as const;
  }
  if (mode === "verifyAndChangeEmail" || mode === "recoverEmail") {
    await finishEmailLink(auth, code);
    return mode === "recoverEmail" ? ("recovered" as const) : ("changed" as const);
  }
  if (mode === "revertSecondFactorAddition") {
    await applyActionCode(auth, code);
    return "factor-removed" as const;
  }
  throw new Error("This link is not recognized.");
}

async function finishEmailLink(auth: Auth, code: string) {
  const info = await checkActionCode(auth, code);
  const next = info.data.email?.trim().toLowerCase() ?? "";
  const previous = info.data.previousEmail?.trim().toLowerCase() ?? "";
  await applyActionCode(auth, code);
  await auth.currentUser?.reload();
  if (!next) return;
  if (previous) {
    const error = changeUserEmail(previous, next);
    if (error && error !== "Account not found.") throw new Error(error);
  }
  if (info.operation === "RECOVER_EMAIL") {
    await sendPasswordResetEmail(auth, next, authContinueSettings()).catch(() => {});
  }
}
