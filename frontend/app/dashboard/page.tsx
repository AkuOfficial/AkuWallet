import { DashboardOverview } from '@/components/dashboard-overview'
import { RecentTransactions } from '@/components/recent-transactions'
import { GoalsPreview } from '@/components/goals-preview'
import { GoalsWidget } from '@/components/goals-widget'
import { NetWorthCard } from '@/components/net-worth-card'
import { GlobalFilterBar } from '@/components/global-filter-bar'
import type { Category, Tag, Transaction, Goal } from '@/lib/types'
import { getTransactions, getCategories, getTags, getGoals } from '@/lib/api'
import { computeDateRange } from '@/lib/time-span'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = (await searchParams) || {}
  const timeSpan = typeof sp.timeSpan === 'string' ? sp.timeSpan : 'current_month'
  const accountsRaw = typeof sp.accounts === 'string' ? sp.accounts : ''
  const categoriesRaw = typeof sp.categories === 'string' ? sp.categories : ''
  const accountIds = accountsRaw.split(',').map((s) => s.trim()).filter(Boolean)
  const categoryIds = categoriesRaw.split(',').map((s) => s.trim()).filter(Boolean)
  const range = computeDateRange(timeSpan)

  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()

  // Fetch all data via backend API (local SQLite)
  const [transactions, categories, tags, goals] = await Promise.all([
    getTransactions({
      limit: 200,
      start_date: range.start,
      end_date: range.end,
      account_ids: accountIds.length ? accountIds.join(',') : undefined,
      category_ids: categoryIds.length ? categoryIds.join(',') : undefined,
    }),
    getCategories(),
    getTags(),
    getGoals(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Overview of your financial activity
        </p>
      </div>

      <NetWorthCard />

      <GlobalFilterBar sticky={false} />

      <DashboardOverview transactions={(transactions as Transaction[]) || []} />

      <GoalsWidget goals={(goals as Goal[]) || []} />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentTransactions 
            transactions={(transactions as Transaction[]) || []} 
            categories={(categories as Category[]) || []}
          />
        </div>
        <div>
          <GoalsPreview goals={(goals as Goal[]) || []} />
        </div>
      </div>
    </div>
  )
}
