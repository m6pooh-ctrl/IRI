import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import AppShell from '@/components/AppShell'
import TrendTool from '@/components/TrendTool'

export default async function TrendPage() {
  const user = await getSession()
  if (!user) redirect('/login')
  if (!user.nk_valid) redirect('/activate')

  return (
    <AppShell>
      <TrendTool />
    </AppShell>
  )
}
