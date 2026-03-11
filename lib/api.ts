import type { 
  Transaction, 
  Category, 
  Tag, 
  Goal, 
  TransactionType, 
  RecurrenceType,
  ImportedTransaction 
} from '@/lib/types'

async function getAuthHeader(): Promise<Record<string, string>> {
  // const supabase = createClient()
  // const { data: { session } } = await supabase.auth.getSession()
  // if (!session?.access_token) throw new Error('Not authenticated')
  // return { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }

  let token: string | undefined
  if (typeof window !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)aku_token=([^;]+)/)
    token = match ? decodeURIComponent(match[1]) : undefined
  } else {
    const { cookies } = await import('next/headers')
    token = cookies().get('aku_token')?.value
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
  
  const response = await fetch(`/api${endpoint}`, {
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
}): Promise<Transaction[]> {
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())
  if (params?.type) searchParams.set('type', params.type)
  if (params?.start_date) searchParams.set('start_date', params.start_date)
  if (params?.end_date) searchParams.set('end_date', params.end_date)
  
  const query = searchParams.toString()
  return apiRequest<Transaction[]>(`/transactions${query ? `?${query}` : ''}`)
}

export async function createTransaction(data: {
  type: TransactionType
  amount: number
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

// AI Suggest Category
export async function suggestCategory(data: {
  description: string
  type: TransactionType
  categories: Category[]
}): Promise<{
  suggestedCategory: string | null
  confidence: number
  reasoning: string
}> {
  return apiRequest('/suggest-category', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
