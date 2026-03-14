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
import { Tag as TagIcon, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createTag, deleteTag } from '@/lib/api'
import type { Tag } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ManageTagsDialogProps {
  tags: Tag[]
  onSuccess?: (updated?: Tag[]) => void
}

export function ManageTagsDialog({ tags, onSuccess }: ManageTagsDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#4f46e5')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [localTags, setLocalTags] = useState<Tag[]>(tags)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPending(true)
    
    try {
      const created = await createTag({ name, color })
      const updated = [...localTags, created]
      setLocalTags(updated)
      toast.success('Tag added successfully')
      setName('')
      onSuccess?.(updated)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add tag')
    } finally {
      setIsPending(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteTag(id)
      const updated = localTags.filter(t => t.id !== id)
      setLocalTags(updated)
      toast.success('Tag deleted successfully')
      onSuccess?.(updated)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete tag')
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
          <TagIcon className="mr-2 h-4 w-4" />
          Tags
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleAdd} className="space-y-4 border-b border-border pb-4">
          <div className="space-y-2">
            <Label htmlFor="tag-name">New Tag</Label>
            <Input
              id="tag-name"
              placeholder="Tag name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
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

          <Button type="submit" disabled={isPending || !name.trim()} className="w-full">
            {isPending && !deletingId ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add Tag
          </Button>
        </form>

        {localTags.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Your Tags</Label>
            <div className="space-y-2">
              {localTags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag.color || '#4f46e5' }}
                    />
                    <span className="font-medium">{tag.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(tag.id)}
                    disabled={isPending && deletingId === tag.id}
                  >
                    {isPending && deletingId === tag.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            No tags created yet. Add your first tag above.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
