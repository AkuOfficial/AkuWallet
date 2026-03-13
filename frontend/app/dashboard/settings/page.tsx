import { SettingsForm } from '@/components/settings-form'
import type { Category, Tag } from '@/lib/types'
import { getCategories, getTags } from '@/lib/api'
import { cookies } from 'next/headers'

export default async function SettingsPage() {
  const [categories, tags] = await Promise.all([getCategories(), getTags()])

  const token = (await cookies()).get('aku_token')?.value
  const resp = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8000'}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const { user } = resp.ok ? await resp.json() : { user: { email: '', created_at: null } }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <SettingsForm 
        user={user}
        categories={(categories as Category[]) || []}
        tags={(tags as Tag[]) || []}
      />
    </div>
  )
}
