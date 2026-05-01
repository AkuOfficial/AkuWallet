'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Target, Pencil, Trash2, Loader2, Calendar, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { deleteGoal } from '@/lib/api'
import { EditGoalDialog } from '@/components/edit-goal-dialog'
import type { Goal } from '@/lib/types'

interface GoalsListProps {
  goals: Goal[]
  onSuccess?: () => void
}

export function GoalsList({ goals, onSuccess }: GoalsListProps) {
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteGoal(id)
      toast.success('Goal deleted')
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete goal')
    } finally {
      setDeletingId(null)
    }
  }

  const getStatusBadge = (goal: Goal) => {
    const progress = getProgress(goal.current_amount, goal.target_amount)
    const daysRemaining = getDaysRemaining(goal.deadline)

    if (progress >= 100) {
      return <Badge className="bg-income text-income-foreground">Completed</Badge>
    }
    if (daysRemaining !== null && daysRemaining < 0) {
      return <Badge variant="destructive">Overdue</Badge>
    }
    if (daysRemaining !== null && daysRemaining <= 30) {
      return <Badge variant="outline" className="border-destructive text-destructive">Due Soon</Badge>
    }
    return <Badge variant="secondary">In Progress</Badge>
  }

  if (goals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Target className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">No goals yet</h3>
          <p className="mt-2 text-center text-muted-foreground">
            Create your first financial goal to start tracking your progress.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => {
          const progress = getProgress(goal.current_amount, goal.target_amount)
          const daysRemaining = getDaysRemaining(goal.deadline)
          const remaining = goal.target_amount - goal.current_amount

          return (
            <Card key={goal.id} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{goal.name}</CardTitle>
                  {getStatusBadge(goal)}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingGoal(goal)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Goal</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this goal? This action
                          cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(goal.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deletingId === goal.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium text-foreground">
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Current</p>
                    <p className="font-semibold text-income">
                      {formatCurrency(goal.current_amount, goal.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Target</p>
                    <p className="font-semibold text-foreground">
                      {formatCurrency(goal.target_amount, goal.currency)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
                  {remaining > 0 ? (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      <span>{formatCurrency(remaining, goal.currency)} to go</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-income">
                      <TrendingUp className="h-4 w-4" />
                      <span>Goal achieved!</span>
                    </div>
                  )}
                  {goal.deadline && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {daysRemaining !== null && daysRemaining > 0
                          ? `${daysRemaining} days left`
                          : daysRemaining === 0
                          ? 'Due today'
                          : formatDate(goal.deadline)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {editingGoal && (
        <EditGoalDialog
          goal={editingGoal}
          open={!!editingGoal}
          onOpenChange={(open) => !open && setEditingGoal(null)}
          onSuccess={onSuccess}
        />
      )}
    </>
  )
}
