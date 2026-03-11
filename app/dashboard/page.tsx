import { DashboardOverview } from '@/components/dashboard-overview'
import { QuickAddTransaction } from '@/components/quick-add-transaction'
import { RecentTransactions } from '@/components/recent-transactions'
import { GoalsPreview } from '@/components/goals-preview'
import type { Category, Tag, Transaction, Goal } from '@/lib/types'
import { getTransactions, getCategories, getTags, getGoals } from '@/lib/api'

export default async function DashboardPage() {
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()

  // Fetch all data via backend API (local SQLite)
  const [transactions, categories, tags, goals] = await Promise.all([
    getTransactions({ limit: 100 }),
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

      <DashboardOverview transactions={(transactions as Transaction[]) || []} />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <QuickAddTransaction 
            categories={(categories as Category[]) || []} 
            tags={(tags as Tag[]) || []} 
          />
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
