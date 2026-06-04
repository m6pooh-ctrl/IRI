import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import AppShell from '@/components/AppShell'
import SuperKeyword from '@/components/SuperKeyword'

export default async function SuperPage() {
  const user = await getSession()
  if (!user) redirect('/login')
  if (!user.nk_valid) redirect('/activate')

  return (
    <AppShell>
      <SuperKeyword />
    </AppShell>
  )
}
