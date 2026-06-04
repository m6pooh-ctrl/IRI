import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import AppShell from '@/components/AppShell'
import WashTool from '@/components/WashTool'

export default async function WashPage() {
  const user = await getSession()
  if (!user) redirect('/login')
  if (!user.nk_valid) redirect('/activate')

  return (
    <AppShell>
      <WashTool />
    </AppShell>
  )
}
