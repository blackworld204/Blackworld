import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  verifyBeforeUpdateEmail,
  verifyPasswordResetCode,
  type ActionCodeSettings,
  type Auth,
  type AuthCredential,
  type User,
} from "firebase/auth";
import { changeUserEmail } from "@/lib/bank";
import { authReturnSettings, ensureFirebaseAuth, namedFirebaseAuth } from "@/lib/firebase";

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

async function reauthenticateEmail(password: string, signedOut: string) {
  const auth = await authReady();
  const current = auth.currentUser;
  const email = current?.email?.trim();
  if (!current || !email) throw new Error(signedOut);
  if (!current.providerData.some((item) => item.providerId === "password")) {
    throw new Error("This sign-in uses Google. Change the email and password on that Google account.");
  }
  await reauthenticateWithCredential(current, EmailAuthProvider.credential(email, password));
  return current;
}

export async function requestEmailChange(nextEmail: string, currentPassword: string) {
  const current = await reauthenticateEmail(currentPassword, "Sign in again to change this address.");
  await verifyBeforeUpdateEmail(current, nextEmail.trim(), authContinueSettings());
}

export async function changeSignedInPassword(currentPassword: string, nextPassword: string) {
  const current: User = await reauthenticateEmail(currentPassword, "Sign in again to change this password.");
  await updatePassword(current, nextPassword);
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

const PROBE = "blackworld-probe";

export type GoogleDeskProof = {
  email: string;
  token: string;
  credential: AuthCredential | null;
};

function googleCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String(error.code) : "";
}

/** Drops the side session after the desk has been read. */
export async function endProbe() {
  try {
    const auth = await namedFirebaseAuth(PROBE);
    await signOut(auth).catch(() => {});
  } catch {
    /* The side session is only used to read the desk. */
  }
}

/** Checks the password on a side session and returns a token for the desk. The login session stays signed out. */
export async function deskTokenForPassword(email: string, password: string) {
  const auth = await namedFirebaseAuth(PROBE);
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return await credential.user.getIdToken();
  } catch (error) {
    await signOut(auth).catch(() => {});
    throw error;
  }
}

/** Checks Google on a side session so the desk can load before the login session starts. */
export async function deskTokenForGoogle(pick: boolean): Promise<GoogleDeskProof> {
  const auth = await namedFirebaseAuth(PROBE);
  const provider = new GoogleAuthProvider();
  if (pick) provider.setCustomParameters({ prompt: "select_account" });
  try {
    const result = await signInWithPopup(auth, provider);
    return {
      email: result.user.email?.trim() ?? "",
      token: await result.user.getIdToken(),
      credential: GoogleAuthProvider.credentialFromResult(result),
    };
  } catch (error) {
    await signOut(auth).catch(() => {});
    if (googleCode(error) === "auth/operation-not-allowed") throw new Error("Google sign-in is not available.");
    throw error;
  }
}

export async function signInWithGoogleCredential(credential: AuthCredential | null) {
  const auth = await authReady();
  if (!credential) {
    await signInWithGoogle(false);
    return;
  }
  try {
    await signInWithCredential(auth, credential);
  } catch (error) {
    const code = googleCode(error);
    if (code === "auth/invalid-credential" || code === "auth/user-token-expired" || code === "auth/invalid-user-token") {
      await signInWithGoogle(false);
      return;
    }
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
