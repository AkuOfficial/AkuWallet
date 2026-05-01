'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateGoal } from '@/lib/api'
import type { Goal } from '@/lib/types'
import { CURRENCIES } from '@/lib/currencies'

interface EditGoalDialogProps {
  goal: Goal
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditGoalDialog({ goal, open, onOpenChange, onSuccess }: EditGoalDialogProps) {
  const [isPending, setIsPending] = useState(false)
  const [name, setName] = useState(goal.name)
  const [targetAmount, setTargetAmount] = useState(goal.target_amount.toString())
  const [currentAmount, setCurrentAmount] = useState(goal.current_amount.toString())
  const [currency, setCurrency] = useState(goal.currency || 'PLN')
  const [deadline, setDeadline] = useState(goal.deadline?.split('T')[0] || '')

  useEffect(() => {
    setName(goal.name)
    setTargetAmount(goal.target_amount.toString())
    setCurrentAmount(goal.current_amount.toString())
    setCurrency(goal.currency || 'PLN')
    setDeadline(goal.deadline?.split('T')[0] || '')
  }, [goal])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPending(true)
    
    try {
      await updateGoal(goal.id, {
        name,
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount),
        currency,
        deadline: deadline || undefined,
      })
      
      toast.success('Goal updated successfully')
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update goal')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Goal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-goal-name">Goal Name</Label>
            <Input
              id="edit-goal-name"
              placeholder="e.g., Emergency Fund, Vacation, New Car"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-goal-target">Target Amount</Label>
              <Input
                id="edit-goal-target"
                type="number"
                step="0.01"
                min="0"
                placeholder="10000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-goal-current">Current Amount</Label>
              <Input
                id="edit-goal-current"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-goal-deadline">Target Date (Optional)</Label>
            <Input
              id="edit-goal-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
