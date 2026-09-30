import { useEffect, useState } from 'react'
import { GoogleAuthProvider, onIdTokenChanged, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth'
import { auth, hasFirebaseConfig } from '../firebase'
import { translate, normalizeLocale } from '../i18n/messages'
import { LanguageContext } from '../i18n'
import { Button, Card, Field, inputClass } from './ui'

const errors = {
  'auth/operation-not-allowed': 'Enable this sign-in provider in Firebase Authentication.',
  'auth/configuration-not-found': 'Configure Firebase Authentication before signing in.',
  'auth/unauthorized-domain': 'Add this domain to Firebase Authentication authorized domains.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/popup-blocked': 'Allow the sign-in popup in your browser.',
  'auth/network-request-failed': 'Unable to connect. Check your internet connection.',
}

export default function FirebaseAccess({ children }) {
  const [session, setSession] = useState({ loading: hasFirebaseConfig, user: null, allowed: false })
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const language = normalizeLocale(localStorage.getItem('quality-vision-language'))
  const t = value => translate(value, language)
  useEffect(() => {
    if (!auth) return
    let active = true
    const unsubscribe = onIdTokenChanged(auth, async user => {
      try {
        const token = user ? await user.getIdTokenResult() : null
        const allowed = Boolean(token?.claims.admin === true || ['admin', 'qa_admin', 'editor', 'qa_editor', 'viewer'].includes(token?.claims.role))
        if (active) setSession({ loading: false, user, allowed })
      } catch { if (active) { setSession({ loading: false, user, allowed: false }); setError('Unable to verify account permissions.') } }
    })
    return () => { active = false; unsubscribe() }
  }, [])
  const run = async action => {
    setBusy(true); setError('')
    try { await action() }
    catch (e) { if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(e.code)) setError(errors[e.code] || 'Unable to sign in. Check your Firebase configuration.') }
    finally { setBusy(false) }
  }
  if (!hasFirebaseConfig || session.allowed) return children
  return <LanguageContext.Provider value={language}><main className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4 text-[var(--text)]"><Card className="w-full max-w-md">
    <h1 className="text-2xl font-bold">Quality Vision</h1>
    <p className="mt-2 text-sm text-[var(--muted)]">{t('Sign in to save and sync your projects with Firebase.')}</p>
    {session.loading ? <p className="mt-4" role="status">{t('Loading…')}</p> : session.user ? <div className="mt-6 space-y-4">
      <p>{session.user.email}</p>
      <p>{t('Your account needs a role assigned by the Firebase administrator.')}</p>
      <p className="text-xs break-all">UID: {session.user.uid}</p>
      <Button disabled={busy} onClick={() => run(() => session.user.getIdToken(true))}>{t('Refresh access')}</Button>
      <Button variant="secondary" disabled={busy} onClick={() => run(() => signOut(auth))}>{t('Sign out')}</Button>
    </div> : <form className="mt-6 space-y-4" onSubmit={event => { event.preventDefault(); run(async () => { await signInWithEmailAndPassword(auth, email.trim(), password); setPassword('') }) }}>
      <Field label={t('Email')}><input className={inputClass} type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} disabled={busy} /></Field>
      <Field label={t('Password')}><input className={inputClass} type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /></Field>
      <Button type="submit" className="w-full" disabled={busy}>{t('Sign in')}</Button>
      <Button variant="secondary" className="w-full" disabled={busy} onClick={() => run(() => signInWithPopup(auth, new GoogleAuthProvider()))}>{t('Continue with Google')}</Button>
    </form>}
    {error && <p role="alert" className="mt-4 text-sm text-[var(--failure)]">{t(error)}</p>}
  </Card></main></LanguageContext.Provider>
}
