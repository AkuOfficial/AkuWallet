'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Sparkles, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createTransaction, suggestCategory } from '@/lib/api'
import type { Category, Tag, TransactionType, RecurrenceType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AddTransactionDialogProps {
  categories: Category[]
  tags: Tag[]
  onSuccess?: () => void
}

export function AddTransactionDialog({ categories, tags, onSuccess }: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null)

  const filteredCategories = categories.filter(c => c.type === type)

  const resetForm = () => {
    setType('expense')
    setAmount('')
    setDescription('')
    setCategoryId('')
    setDate(new Date().toISOString().split('T')[0])
    setRecurrence('none')
    setRecurrenceEndDate('')
    setSelectedTags([])
    setSuggestedCategory(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPending(true)
    
    try {
      await createTransaction({
        type,
        amount: parseFloat(amount),
        description: description || undefined,
        category_id: categoryId || undefined,
        date,
        recurrence,
        recurrence_end_date: recurrenceEndDate || undefined,
        tag_ids: selectedTags,
      })
      
      toast.success('Transaction added successfully')
      resetForm()
      setOpen(false)
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add transaction')
    } finally {
      setIsPending(false)
    }
  }

  const handleAISuggest = async () => {
    if (!description.trim()) return
    
    setIsSuggesting(true)
    try {
      const data = await suggestCategory({ description, type, categories })
      if (data.suggestedCategory) {
        const matchedCategory = filteredCategories.find(
          c => c.name.toLowerCase() === data.suggestedCategory!.toLowerCase()
        )
        if (matchedCategory) {
          setCategoryId(matchedCategory.id)
          setSuggestedCategory(data.suggestedCategory)
        }
      }
    } catch (error) {
      console.error('Failed to get AI suggestion:', error)
      toast.error('Failed to get AI suggestion')
    } finally {
      setIsSuggesting(false)
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={type} onValueChange={(v) => {
            setType(v as TransactionType)
            setCategoryId('')
            setSuggestedCategory(null)
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
              <Label htmlFor="dialog-amount">Amount</Label>
              <Input
                id="dialog-amount"
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
              <Label htmlFor="dialog-date">Date</Label>
              <Input
                id="dialog-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dialog-description">Description</Label>
            <div className="flex gap-2">
              <Input
                id="dialog-description"
                placeholder="What was this for?"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setSuggestedCategory(null)
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAISuggest}
                disabled={isSuggesting || !description.trim()}
                title="AI suggest category"
              >
                {isSuggesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </div>
            {suggestedCategory && (
              <p className="text-xs text-muted-foreground">
                AI suggested: <span className="font-medium text-primary">{suggestedCategory}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dialog-category">Category</Label>
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
              <Label htmlFor="dialog-recurrence">Recurrence</Label>
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
                <Label htmlFor="dialog-recurrence-end">End Date (Optional)</Label>
                <Input
                  id="dialog-recurrence-end"
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
