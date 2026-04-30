'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Target } from 'lucide-react'
import type { Goal } from '@/lib/types'

interface GoalsWidgetProps {
  goals: Goal[]
}

export function GoalsWidget({ goals }: GoalsWidgetProps) {
  const topGoal = goals
    .filter(goal => goal.current_amount < goal.target_amount)
    .sort((a, b) => (b.current_amount / b.target_amount) - (a.current_amount / a.target_amount))[0]

  if (!topGoal) return null

  const progress = Math.min((topGoal.current_amount / topGoal.target_amount) * 100, 100)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Top Goal</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">{topGoal.name}</span>
          <span className="text-sm font-bold text-primary">{progress.toFixed(0)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatCurrency(topGoal.current_amount)}</span>
          <span>{formatCurrency(topGoal.target_amount)}</span>
        </div>
      </div>
    </Card>
  )
}