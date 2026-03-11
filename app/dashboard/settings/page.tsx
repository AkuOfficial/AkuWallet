import { SettingsForm } from '@/components/settings-form'
import type { Category, Tag } from '@/lib/types'
import { getCategories, getTags } from '@/lib/api'

export default async function SettingsPage() {
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()

  const [categories, tags] = await Promise.all([getCategories(), getTags()])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <SettingsForm 
        user={{ email: '' } as any} 
        categories={(categories as Category[]) || []}
        tags={(tags as Tag[]) || []}
      />
    </div>
  )
}
