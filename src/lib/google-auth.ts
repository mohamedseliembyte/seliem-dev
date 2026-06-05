// Google Identity Services popup flow — never shows supabase.co to the user.
// The popup says "Sign in to Seliem.dev" (whatever the Google Cloud app name is).

const GOOGLE_CLIENT_ID = '384196746759-lcvl1q6objpvlm59b679ng31e29q0grl.apps.googleusercontent.com'

export type GoogleUser = {
  email: string
  name: string
  picture: string
  idToken: string
}

/** Load the Google Identity Services script (idempotent). */
function loadGIS(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('SSR'))
    if (document.getElementById('gsi-script')) {
      // Already loaded or loading
      if ((window as unknown as Record<string, unknown>).google) return resolve()
      document.getElementById('gsi-script')!.addEventListener('load', () => resolve())
      return
    }
    const s = document.createElement('script')
    s.id = 'gsi-script'
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(s)
  })
}

/** Trigger a Google sign-in popup and return the user's info + ID token. */
export async function googlePopupSignIn(): Promise<GoogleUser> {
  await loadGIS()

  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google
    if (!google?.accounts?.id) return reject(new Error('Google Identity Services not available'))

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: { credential: string }) => {
        try {
          // Decode the JWT payload (middle part) to get user info
          const payload = JSON.parse(atob(response.credential.split('.')[1]))
          resolve({
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            idToken: response.credential,
          })
        } catch (err) {
          reject(err)
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    })

    // Show the popup
    google.accounts.id.prompt((notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback: use the redirect flow as a last resort (rare — popup blockers)
        reject(new Error('popup_blocked'))
      }
    })
  })
}

/** Exchange a Google ID token with Supabase for a session. */
export async function exchangeGoogleToken(
  supabase: { auth: { signInWithIdToken: (opts: { provider: string; token: string }) => Promise<{ data: unknown; error: unknown }> } },
  idToken: string,
) {
  return supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
}
