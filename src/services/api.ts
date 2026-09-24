import { supabase } from '../lib/supabase'

export class ServiceError extends Error {
  constructor(public readonly code:string, message:string) { super(message); this.name='ServiceError' }
}

export function requireSupabase() {
  if (!supabase) throw new ServiceError('NOT_CONFIGURED','Supabase is not configured. Add the public project URL and publishable key to .env.local.')
  return supabase
}

export function throwServiceError(error:{code?:string;message:string}|null, fallback:string):never {
  if (!error) throw new ServiceError('UNKNOWN',fallback)
  const safeMessages:Record<string,string>={
    '42501':'You do not have permission to perform this action.',
    '23503':'This record references data that is no longer available.',
    '23505':'A matching record already exists.',
    'PGRST116':'The requested record was not found.',
  }
  throw new ServiceError(error.code??'REQUEST_FAILED',safeMessages[error.code??'']??fallback)
}
