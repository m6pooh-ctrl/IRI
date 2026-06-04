import crypto from 'crypto'

export function validateNKKey(key: string): { valid: boolean; reason: string } {
  const match = key.trim().match(/^NK-(\d{8})-([A-Z0-9]{12})$/)
  if (!match) return { valid: false, reason: '형식 오류' }

  const [, dateStr, sig] = match

  // 만료일 체크
  const year = parseInt(dateStr.slice(0, 4))
  const month = parseInt(dateStr.slice(4, 6)) - 1
  const day = parseInt(dateStr.slice(6, 8))
  const expiry = new Date(year, month, day + 1) // 당일 자정까지 유효
  if (expiry < new Date()) return { valid: false, reason: '만료된 키' }

  // HMAC 서명 검증
  const expected = crypto
    .createHmac('sha256', process.env.NK_MASTER_SECRET!)
    .update(`NK|${dateStr}`)
    .digest('hex')
    .slice(0, 12)
    .toUpperCase()

  if (sig !== expected) return { valid: false, reason: '유효하지 않은 키' }

  return { valid: true, reason: 'ok' }
}
