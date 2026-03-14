'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Folder, Tag, KeyRound } from 'lucide-react'
import { ManageCategoriesDialog } from '@/components/manage-categories-dialog'
import { ManageTagsDialog } from '@/components/manage-tags-dialog'
import { changePassword } from '@/lib/api'
import { toast } from 'sonner'
import type { Category, Tag as TagType } from '@/lib/types'

interface SettingsFormProps {
  user: { email?: string; created_at?: string | null }
  categories: Category[]
  tags: TagType[]
}

export function SettingsForm({ user, categories, tags }: SettingsFormProps) {
  const [localCategories, setLocalCategories] = useState<Category[]>(categories)
  const [localTags, setLocalTags] = useState<TagType[]>(tags)

  const userCategories = localCategories.filter(c => !c.is_default)
  const defaultCategories = localCategories.filter(c => c.is_default)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChanging, setIsChanging] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    setIsChanging(true)
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword })
      toast.success('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Account
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="mt-1 text-foreground">{user.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Account Created</label>
            <p className="mt-1 text-foreground">
              {user.created_at
                ? new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '—'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isChanging}>
              {isChanging ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Folder className="h-4 w-4" />
              Categories
            </CardTitle>
            <CardDescription>
              {userCategories.length} custom, {defaultCategories.length} default
            </CardDescription>
          </div>
          <ManageCategoriesDialog
            categories={localCategories}
            onSuccess={(updated) => updated && setLocalCategories(updated)}
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userCategories.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Your Categories</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {userCategories.map((category) => (
                    <Badge key={category.id} variant="outline" className="gap-1">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: category.color || '#4f46e5' }}
                      />
                      {category.name}
                      <span className="text-xs opacity-60">({category.type})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Default Categories</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {defaultCategories.map((category) => (
                  <Badge key={category.id} variant="secondary">
                    {category.name}
                    <span className="ml-1 text-xs opacity-60">({category.type})</span>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4" />
              Tags
            </CardTitle>
            <CardDescription>
              {localTags.length} tag{localTags.length !== 1 ? 's' : ''} created
            </CardDescription>
          </div>
          <ManageTagsDialog
            tags={localTags}
            onSuccess={(updated) => updated && setLocalTags(updated)}
          />
        </CardHeader>
        <CardContent>
          {localTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {localTags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="gap-1">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color || '#4f46e5' }}
                  />
                  {tag.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No tags created yet. Tags help you organize transactions beyond categories.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
