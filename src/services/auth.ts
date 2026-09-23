import { supabase } from '../lib/supabase'

export type AuthResult = { ok: true; message?: string } | { ok: false; message: string }

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, message: 'Live authentication is not configured. Use demo access or add Supabase variables to .env.local.' }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? { ok: false, message: error.message } : { ok: true }
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, message: 'Live authentication is not configured. Add Supabase variables to .env.local before creating an account.' }
  const { error } = await supabase.auth.signUp({ email, password })
  return error ? { ok: false, message: error.message } : { ok: true, message: 'Account created. Check your email to verify your address.' }
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, message: 'Password recovery requires a configured Supabase project.' }
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/#reset-password` })
  return error ? { ok: false, message: error.message } : { ok: true, message: 'If an account exists, a reset link is on its way.' }
}

export async function signOut(): Promise<AuthResult> {
  if (!supabase) return { ok: true }
  const { error } = await supabase.auth.signOut()
  return error ? { ok: false, message: error.message } : { ok: true }
}
