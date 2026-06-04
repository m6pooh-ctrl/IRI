export type SearchadKeys = {
  accessLicense: string
  secretKey: string
  customerId: string
}

export type OpenKeys = {
  clientId: string
  clientSecret: string
  blog: string
}

const SA_KEY = 'nbolg_api_keys'
const OA_KEY = 'nbolg_openapi'

export function loadSearchadKeys(): SearchadKeys {
  try {
    const o = JSON.parse(localStorage.getItem(SA_KEY) ?? '{}')
    return {
      accessLicense: o.accessLicense ?? '',
      secretKey: o.secretKey ?? '',
      customerId: o.customerId ?? '',
    }
  } catch {
    return { accessLicense: '', secretKey: '', customerId: '' }
  }
}

export function saveSearchadKeys(k: SearchadKeys): void {
  localStorage.setItem(SA_KEY, JSON.stringify(k))
}

export function loadOpenKeys(): OpenKeys {
  try {
    const o = JSON.parse(localStorage.getItem(OA_KEY) ?? '{}')
    return {
      clientId: o.clientId ?? '',
      clientSecret: o.clientSecret ?? '',
      blog: o.blog ?? '',
    }
  } catch {
    return { clientId: '', clientSecret: '', blog: '' }
  }
}

export function saveOpenKeys(k: Partial<OpenKeys>): void {
  let existing: Record<string, unknown> = {}
  try { existing = JSON.parse(localStorage.getItem(OA_KEY) ?? '{}') } catch {}
  localStorage.setItem(OA_KEY, JSON.stringify({ ...existing, ...k }))
}
