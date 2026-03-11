'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, Folder, Tag } from 'lucide-react'
import { ManageCategoriesDialog } from '@/components/manage-categories-dialog'
import { ManageTagsDialog } from '@/components/manage-tags-dialog'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Category, Tag as TagType } from '@/lib/types'

interface SettingsFormProps {
  user: SupabaseUser
  categories: Category[]
  tags: TagType[]
}

export function SettingsForm({ user, categories, tags }: SettingsFormProps) {
  const userCategories = categories.filter(c => !c.is_default)
  const defaultCategories = categories.filter(c => c.is_default)

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
              {new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
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
          <ManageCategoriesDialog categories={categories} />
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
              {tags.length} tag{tags.length !== 1 ? 's' : ''} created
            </CardDescription>
          </div>
          <ManageTagsDialog tags={tags} />
        </CardHeader>
        <CardContent>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
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
