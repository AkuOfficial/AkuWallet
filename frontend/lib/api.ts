import type { 
  Transaction, 
  Category, 
  Tag, 
  Goal, 
  TransactionType, 
  RecurrenceType,
  ImportedTransaction,
  UserSettings,
  AutomationRule,
  ExportPayload
} from '@/lib/types'

async function getAuthHeader(): Promise<Record<string, string>> {
  let token: string | undefined
  if (typeof window !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)aku_token=([^;]+)/)
    token = match ? decodeURIComponent(match[1]) : undefined
  } else {
    const { cookies } = await import('next/headers')
    token = (await cookies()).get('aku_token')?.value
  }

  if (!token) throw new Error('Not authenticated')

  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeader()
  
  // Use absolute URL on server, relative URL in browser
  const baseUrl = typeof window === 'undefined' 
    ? (process.env.BACKEND_URL || 'http://localhost:8000')
    : '/api'
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || 'Request failed')
  }
  
  return response.json()
}

// Transactions
export async function getTransactions(params?: {
  limit?: number
  offset?: number
  type?: TransactionType
  start_date?: string
  end_date?: string
  account_ids?: string
  category_ids?: string
}): Promise<Transaction[]> {
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())
  if (params?.type) searchParams.set('type', params.type)
  if (params?.start_date) searchParams.set('start_date', params.start_date)
  if (params?.end_date) searchParams.set('end_date', params.end_date)
  if (params?.account_ids) searchParams.set('account_ids', params.account_ids)
  if (params?.category_ids) searchParams.set('category_ids', params.category_ids)
  
  const query = searchParams.toString()
  return apiRequest<Transaction[]>(`/transactions${query ? `?${query}` : ''}`)
}

export async function createTransaction(data: {
  type: TransactionType
  amount: number
  currency?: string
  description?: string
  category_id?: string
  date: string
  recurrence?: RecurrenceType
  recurrence_end_date?: string
  tag_ids?: string[]
}): Promise<Transaction> {
  return apiRequest<Transaction>('/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateTransaction(
  id: string,
  data: {
    type: TransactionType
    amount: number
    description?: string
    category_id?: string
    date: string
    recurrence?: RecurrenceType
    recurrence_end_date?: string
    tag_ids?: string[]
  }
): Promise<Transaction> {
  return apiRequest<Transaction>(`/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteTransaction(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/transactions/${id}`, {
    method: 'DELETE',
  })
}

// Categories
export async function getCategories(): Promise<Category[]> {
  return apiRequest<Category[]>('/categories')
}

export async function createCategory(data: {
  name: string
  type: TransactionType
  icon?: string
  color?: string
}): Promise<Category> {
  return apiRequest<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteCategory(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/categories/${id}`, {
    method: 'DELETE',
  })
}

// Tags
export async function getTags(): Promise<Tag[]> {
  return apiRequest<Tag[]>('/tags')
}

export async function createTag(data: {
  name: string
  color?: string
}): Promise<Tag> {
  return apiRequest<Tag>('/tags', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteTag(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/tags/${id}`, {
    method: 'DELETE',
  })
}

// Goals
export async function getGoals(): Promise<Goal[]> {
  return apiRequest<Goal[]>('/goals')
}

export async function createGoal(data: {
  name: string
  target_amount: number
  current_amount?: number
  deadline?: string
}): Promise<Goal> {
  return apiRequest<Goal>('/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateGoal(
  id: string,
  data: {
    name: string
    target_amount: number
    current_amount: number
    deadline?: string
  }
): Promise<Goal> {
  return apiRequest<Goal>(`/goals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteGoal(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/goals/${id}`, {
    method: 'DELETE',
  })
}

// Import
export async function importTransactions(
  transactions: ImportedTransaction[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  return apiRequest<{ success: number; failed: number; errors: string[] }>('/import', {
    method: 'POST',
    body: JSON.stringify(transactions),
  })
}

// Stats
export async function getStats(params?: {
  start_date?: string
  end_date?: string
}): Promise<{
  total_income: number
  total_expense: number
  balance: number
  expense_by_category: Record<string, number>
  by_date: Record<string, { income: number; expense: number }>
  transaction_count: number
}> {
  const searchParams = new URLSearchParams()
  if (params?.start_date) searchParams.set('start_date', params.start_date)
  if (params?.end_date) searchParams.set('end_date', params.end_date)
  
  const query = searchParams.toString()
  return apiRequest(`/stats${query ? `?${query}` : ''}`)
}

// Auth
export async function changePassword(data: {
  current_password: string
  new_password: string
}): Promise<{ success: boolean }> {
  return apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function logout(): Promise<{ success: boolean }> {
  return apiRequest('/auth/logout', { method: 'POST' })
}

export async function logoutAllDevices(): Promise<{ success: boolean }> {
  return apiRequest('/auth/logout-all', { method: 'POST' })
}

export async function getMe(): Promise<{ user: { id: string; email: string; created_at: string } }> {
  return apiRequest('/auth/me', { method: 'GET' })
}

// Settings
export async function getUserSettings(): Promise<UserSettings> {
  return apiRequest<UserSettings>('/settings')
}

export async function updateUserSettings(data: {
  base_currency: string
}): Promise<UserSettings> {
  return apiRequest<UserSettings>('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// Categories (update missing in original)
export async function updateCategory(
  id: string,
  data: { name: string; type: TransactionType; icon?: string | null; color?: string | null }
): Promise<Category> {
  return apiRequest<Category>(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// Automation rules
export async function listAutomationRules(): Promise<AutomationRule[]> {
  return apiRequest<AutomationRule[]>('/automation-rules')
}

export async function createAutomationRule(data: {
  name?: string | null
  match_contains: string
  category_id: string
  enabled?: boolean
}): Promise<AutomationRule> {
  return apiRequest<AutomationRule>('/automation-rules', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateAutomationRule(
  id: string,
  data: { name?: string | null; match_contains: string; category_id: string; enabled?: boolean }
): Promise<AutomationRule> {
  return apiRequest<AutomationRule>(`/automation-rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteAutomationRule(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/automation-rules/${id}`, { method: 'DELETE' })
}

// Data management
export async function exportAllData(): Promise<ExportPayload> {
  return apiRequest<ExportPayload>('/settings/export?format=json')
}

export async function clearAllTransactions(): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>('/settings/clear-transactions', { method: 'POST' })
}

export async function deleteAccount(data: { password?: string; confirm?: string }): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>('/settings/delete-account', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// AI Suggest Category
export async function suggestCategory(data: {
  transactions: { description: string; type: TransactionType }[]
  categories: Category[]
}): Promise<{ suggestedCategory: string | null; confidence: number; reasoning: string }[]> {
  return apiRequest('/suggest-category', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
