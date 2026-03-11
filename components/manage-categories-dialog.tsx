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
import { Badge } from '@/components/ui/badge'
import { Folder, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createCategory, deleteCategory } from '@/lib/api'
import type { Category, TransactionType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ManageCategoriesDialogProps {
  categories: Category[]
  onSuccess?: () => void
}

export function ManageCategoriesDialog({ categories, onSuccess }: ManageCategoriesDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<TransactionType>('expense')
  const [color, setColor] = useState('#4f46e5')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const userCategories = categories.filter(c => !c.is_default)
  const defaultCategories = categories.filter(c => c.is_default)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPending(true)
    
    try {
      await createCategory({
        name,
        type,
        color,
      })
      
      toast.success('Category added successfully')
      setName('')
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add category')
    } finally {
      setIsPending(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteCategory(id)
      toast.success('Category deleted successfully')
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete category')
    } finally {
      setDeletingId(null)
    }
  }

  const colors = [
    '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', 
    '#ef4444', '#8b5cf6', '#ec4899', '#6366f1',
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Folder className="mr-2 h-4 w-4" />
          Categories
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleAdd} className="space-y-4 border-b border-border pb-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">New Category</Label>
            <Input
              id="cat-name"
              placeholder="Category name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cat-type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as TransactionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'h-6 w-6 rounded-full transition-transform',
                      color === c && 'ring-2 ring-offset-2 ring-primary scale-110'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <Button type="submit" disabled={isPending || !name.trim()} className="w-full">
            {isPending && !deletingId ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add Category
          </Button>
        </form>

        {userCategories.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Your Categories</Label>
            <div className="space-y-2">
              {userCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: category.color || '#4f46e5' }}
                    />
                    <span className="font-medium">{category.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {category.type}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(category.id)}
                    disabled={isPending && deletingId === category.id}
                  >
                    {isPending && deletingId === category.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Default Categories</Label>
          <div className="flex flex-wrap gap-2">
            {defaultCategories.map((category) => (
              <Badge key={category.id} variant="secondary">
                {category.name}
                <span className="ml-1 text-xs opacity-60">({category.type})</span>
              </Badge>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
