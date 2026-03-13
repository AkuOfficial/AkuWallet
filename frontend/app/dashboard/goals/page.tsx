'use client'

import { useEffect, useState } from 'react'
import { GoalsList } from '@/components/goals-list'
import { AddGoalDialog } from '@/components/add-goal-dialog'
import { getGoals } from '@/lib/api'
import type { Goal } from '@/lib/types'
import { Loader2 } from 'lucide-react'

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  const loadGoals = async () => {
    try {
      const data = await getGoals()
      setGoals(data)
    } catch (error) {
      console.error('Failed to load goals:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGoals()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Goals</h1>
          <p className="mt-1 text-muted-foreground">
            Track your financial goals and savings targets
          </p>
        </div>
        <AddGoalDialog onSuccess={loadGoals} />
      </div>

      <GoalsList goals={goals} onSuccess={loadGoals} />
    </div>
  )
}
