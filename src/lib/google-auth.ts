// Google Identity Services popup flow — never shows supabase.co to the user.
// The popup says "Sign in to Seliem.dev" (the Google Cloud app name).

const GOOGLE_CLIENT_ID = '384196746759-lcvl1q6objpvlm59b679ng31e29q0grl.apps.googleusercontent.com'

export type GoogleUser = {
  email: string
  name: string
  picture: string
  idToken: string
  nonce: string
}

/** Load the Google Identity Services script (idempotent). */
function loadGIS(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('SSR'))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.accounts?.id) return resolve()
    const existing = document.getElementById('gsi-script')
    if (existing) {
      existing.addEventListener('load', () => resolve())
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

/** Create a nonce and its SHA-256 hash (hashed goes to Google, raw to Supabase). */
async function makeNonce(): Promise<{ nonce: string; hashed: string }> {
  const raw = crypto.randomUUID()
  const data = new TextEncoder().encode(raw)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return { nonce: raw, hashed }
}

/** Trigger a Google sign-in popup and return the user's info + ID token + nonce. */
export async function googlePopupSignIn(): Promise<GoogleUser> {
  await loadGIS()
  const { nonce, hashed } = await makeNonce()

  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google
    if (!google?.accounts?.id) return reject(new Error('Google Identity Services not available'))

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      nonce: hashed,
      callback: (response: { credential: string }) => {
        try {
          const payload = JSON.parse(atob(response.credential.split('.')[1]))
          resolve({
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            idToken: response.credential,
            nonce,
          })
        } catch (err) {
          reject(err)
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    })

    google.accounts.id.prompt((n: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => {
      if (n.isNotDisplayed() || n.isSkippedMoment()) reject(new Error('popup_blocked'))
    })
  })
}

/** Exchange a Google ID token (+ nonce) with Supabase for a session. */
export async function exchangeGoogleToken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { auth: { signInWithIdToken: (opts: { provider: string; token: string; nonce?: string }) => Promise<{ data: any; error: any }> } },
  idToken: string,
  nonce?: string,
) {
  return supabase.auth.signInWithIdToken({ provider: 'google', token: idToken, nonce })
}
