'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Target, ArrowRight, Plus } from 'lucide-react'
import Link from 'next/link'
import type { Goal } from '@/lib/types'

interface GoalsPreviewProps {
  goals: Goal[]
}

export function GoalsPreview({ goals }: GoalsPreviewProps) {
  const topGoals = goals.slice(0, 3)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  const getDaysRemaining = (deadline: string | null) => {
    if (!deadline) return null
    const days = Math.ceil(
      (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
    return days
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4" />
          Goals
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/goals" className="gap-1">
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {topGoals.length > 0 ? (
          <div className="space-y-4">
            {topGoals.map((goal) => {
              const progress = getProgress(goal.current_amount, goal.target_amount)
              const daysRemaining = getDaysRemaining(goal.deadline)

              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{goal.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                    </span>
                    {daysRemaining !== null && (
                      <span className={daysRemaining < 30 ? 'text-destructive' : ''}>
                        {daysRemaining > 0 ? `${daysRemaining} days left` : 'Overdue'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-muted-foreground">No goals set yet</p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/dashboard/goals">
                <Plus className="mr-2 h-4 w-4" />
                Create a goal
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
