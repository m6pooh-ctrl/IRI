import { NextResponse } from 'next/server'
import keywords from '@/data/super-keywords.json'

export async function GET() {
  return NextResponse.json({ keywords })
}
