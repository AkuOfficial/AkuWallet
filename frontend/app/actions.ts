'use server'

import { revalidatePath } from 'next/cache'
import { createGoal as apiCreateGoal, updateGoal as apiUpdateGoal, createCategory as apiCreateCategory, deleteCategory as apiDeleteCategory, createTag as apiCreateTag, deleteTag as apiDeleteTag, importTransactions as apiImportTransactions } from '@/lib/api'
import type { ImportedTransaction } from '@/lib/types'

export async function addGoal(formData: FormData) {
  const name = formData.get('name') as string
  const targetAmount = parseFloat(formData.get('targetAmount') as string)
  const currentAmount = parseFloat(formData.get('currentAmount') as string) || 0
  const deadline = formData.get('deadline') as string | null

  await apiCreateGoal({
    name,
    target_amount: targetAmount,
    current_amount: currentAmount,
    deadline: deadline || undefined,
  })

  revalidatePath('/dashboard/goals')
}

export async function updateGoal(id: string, formData: FormData) {
  const name = formData.get('name') as string
  const targetAmount = parseFloat(formData.get('targetAmount') as string)
  const currentAmount = parseFloat(formData.get('currentAmount') as string)
  const deadline = formData.get('deadline') as string | null

  await apiUpdateGoal(id, {
    name,
    target_amount: targetAmount,
    current_amount: currentAmount,
    deadline: deadline || undefined,
  })

  revalidatePath('/dashboard/goals')
}

export async function addCategory(formData: FormData) {
  const name = formData.get('name') as string
  const type = formData.get('type') as 'income' | 'expense'
  const color = formData.get('color') as string

  await apiCreateCategory({
    name,
    type,
    color,
  })

  revalidatePath('/dashboard/transactions')
}

export async function deleteCategory(id: string) {
  await apiDeleteCategory(id)
  revalidatePath('/dashboard/transactions')
}

export async function addTag(formData: FormData) {
  const name = formData.get('name') as string
  const color = formData.get('color') as string

  await apiCreateTag({
    name,
    color,
  })

  revalidatePath('/dashboard/transactions')
}

export async function deleteTag(id: string) {
  await apiDeleteTag(id)
  revalidatePath('/dashboard/transactions')
}

export async function importTransactions(transactions: ImportedTransaction[]) {
  const result = await apiImportTransactions(transactions)
  revalidatePath('/dashboard/transactions')
  return result
}
