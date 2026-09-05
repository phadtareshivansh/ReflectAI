import { auth, signInWithGoogle } from "../firebase";

/**
 * Session Freshness & Re-authentication Utility (Directive 14)
 * Uses Firebase Auth's getIdTokenResult to inspect authTime.
 * If authentication is older than maxAgeMinutes (default: 60 minutes),
 * prompts re-authentication via Google Sign-In popup before proceeding.
 *
 * NOTE: Regular chat/reflection prompts and routine browsing NEVER invoke this.
 * Only gated, sensitive actions (such as exporting full decrypted vault data) invoke this.
 */

export interface SessionFreshnessResult {
  fresh: boolean;
  authTime: string | null;
  ageMinutes: number;
}

export async function checkSessionFreshness(maxAgeMinutes: number = 60): Promise<SessionFreshnessResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { fresh: false, authTime: null, ageMinutes: Infinity };
  }

  // getIdTokenResult returns IdTokenResult with authTime (RFC 2822 or ISO timestamp)
  const tokenResult = await currentUser.getIdTokenResult();
  const authTimeStr = tokenResult.authTime;
  const authTimeMs = new Date(authTimeStr).getTime();
  const nowMs = Date.now();
  const ageMs = Math.max(0, nowMs - authTimeMs);
  const ageMinutes = ageMs / (1000 * 60);

  // Allow manual test override via sessionStorage: 'force_stale_session=true'
  const isForcedStale = typeof window !== "undefined" && window.sessionStorage.getItem("force_stale_session") === "true";

  return {
    fresh: !isForcedStale && ageMinutes <= maxAgeMinutes,
    authTime: authTimeStr,
    ageMinutes: isForcedStale ? 75 : ageMinutes,
  };
}

/**
 * Ensures session is fresh before executing a sensitive action.
 * If older than maxAgeMinutes (or forced stale in testing),
 * triggers a quick Google re-auth popup to renew the user credential.
 *
 * @param onPromptForReauth Callback invoked if re-auth UI is showing
 * @returns true if session is now verified fresh, false if user cancelled or failed
 */
export async function ensureFreshSession(
  maxAgeMinutes: number = 60,
  onPromptForReauth?: () => void
): Promise<boolean> {
  const freshness = await checkSessionFreshness(maxAgeMinutes);

  if (freshness.fresh) {
    return true;
  }

  if (onPromptForReauth) {
    onPromptForReauth();
  }

  try {
    // Re-authenticate via Google popup (Directive 14 & 3: passwordless / federated)
    await signInWithGoogle();
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("force_stale_session");
    }
    return true;
  } catch (error: any) {
    console.warn("[SessionFreshness] User cancelled or failed re-authentication:", error?.message || error);
    return false;
  }
}
