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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Save, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateTransaction } from '@/lib/api'
import type { Category, Tag, Transaction, TransactionType, RecurrenceType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface EditTransactionDialogProps {
  transaction: Transaction
  categories: Category[]
  tags: Tag[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditTransactionDialog({
  transaction,
  categories,
  tags,
  open,
  onOpenChange,
  onSuccess,
}: EditTransactionDialogProps) {
  const [isPending, setIsPending] = useState(false)
  const [type, setType] = useState<TransactionType>(transaction.type)
  const [amount, setAmount] = useState(transaction.amount.toString())
  const [description, setDescription] = useState(transaction.description || '')
  const [categoryId, setCategoryId] = useState(transaction.category_id || '')
  const [date, setDate] = useState(transaction.date.split('T')[0])
  const [recurrence, setRecurrence] = useState<RecurrenceType>(transaction.recurrence)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(
    transaction.recurrence_end_date?.split('T')[0] || ''
  )
  const [selectedTags, setSelectedTags] = useState<string[]>(
    transaction.tags?.map(t => t.id) || []
  )

  const filteredCategories = categories.filter(c => c.type === type)

  useEffect(() => {
    setType(transaction.type)
    setAmount(transaction.amount.toString())
    setDescription(transaction.description || '')
    setCategoryId(transaction.category_id || '')
    setDate(transaction.date.split('T')[0])
    setRecurrence(transaction.recurrence)
    setRecurrenceEndDate(transaction.recurrence_end_date?.split('T')[0] || '')
    setSelectedTags(transaction.tags?.map(t => t.id) || [])
  }, [transaction])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPending(true)
    
    try {
      await updateTransaction(transaction.id, {
        type,
        amount: parseFloat(amount),
        description: description || undefined,
        category_id: categoryId || undefined,
        date,
        recurrence,
        recurrence_end_date: recurrenceEndDate || undefined,
        tag_ids: selectedTags,
      })
      
      toast.success('Transaction updated')
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update transaction')
    } finally {
      setIsPending(false)
    }
  }

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={type} onValueChange={(v) => {
            setType(v as TransactionType)
            setCategoryId('')
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expense" className="data-[state=active]:bg-expense/10 data-[state=active]:text-expense">
                Expense
              </TabsTrigger>
              <TabsTrigger value="income" className="data-[state=active]:bg-income/10 data-[state=active]:text-income">
                Income
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Input
              id="edit-description"
              placeholder="What was this for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-recurrence">Recurrence</Label>
              <Select value={recurrence} onValueChange={(v) => setRecurrence(v as RecurrenceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">One-time</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recurrence !== 'none' && (
              <div className="space-y-2">
                <Label htmlFor="edit-recurrence-end">End Date (Optional)</Label>
                <Input
                  id="edit-recurrence-end"
                  type="date"
                  value={recurrenceEndDate}
                  onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  min={date}
                />
              </div>
            )}
          </div>

          {tags.length > 0 && (
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer transition-colors',
                      selectedTags.includes(tag.id) && 'bg-primary'
                    )}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                    {selectedTags.includes(tag.id) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

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
