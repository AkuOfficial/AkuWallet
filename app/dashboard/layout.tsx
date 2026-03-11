import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard-nav'
import { cookies } from 'next/headers'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()
  const token = (await cookies()).get('aku_token')?.value
  if (!token) redirect('/auth/login')

  const resp = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8000'}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const user = resp.ok ? ((await resp.json()) as { user: { email?: string } }).user : null

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav userEmail={user.email || ''} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
