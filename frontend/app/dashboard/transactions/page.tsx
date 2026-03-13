'use client'

import { useEffect, useState } from 'react'
import { TransactionsList } from '@/components/transactions-list'
import { AddTransactionDialog } from '@/components/add-transaction-dialog'
import { ManageCategoriesDialog } from '@/components/manage-categories-dialog'
import { ManageTagsDialog } from '@/components/manage-tags-dialog'
import { getTransactions, getCategories, getTags } from '@/lib/api'
import type { Category, Tag, Transaction } from '@/lib/types'
import { Loader2 } from 'lucide-react'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [txData, catData, tagData] = await Promise.all([
        getTransactions({ limit: 100 }),
        getCategories(),
        getTags(),
      ])
      setTransactions(txData)
      setCategories(catData)
      setTags(tagData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your income and expenses
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ManageTagsDialog tags={tags} onSuccess={loadData} />
          <ManageCategoriesDialog categories={categories} onSuccess={loadData} />
          <AddTransactionDialog
            categories={categories}
            tags={tags}
            onSuccess={loadData}
          />
        </div>
      </div>

      <TransactionsList
        transactions={transactions}
        categories={categories}
        tags={tags}
        onSuccess={loadData}
      />
    </div>
  )
}
