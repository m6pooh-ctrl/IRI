import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import AppShell from '@/components/AppShell'
import RankTool from '@/components/RankTool'

export default async function RankPage() {
  const user = await getSession()
  if (!user) redirect('/login')
  if (!user.nk_valid) redirect('/activate')

  return (
    <AppShell>
      <RankTool />
    </AppShell>
  )
}
