export type TransactionType = 'income' | 'expense'

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface Category {
  id: string
  name: string
  type: TransactionType
  icon: string | null
  color: string | null
  user_id: string | null
  is_default: boolean
  created_at: string
}

export interface Tag {
  id: string
  name: string
  color: string | null
  user_id: string
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  currency?: string
  account_id?: string | null
  description: string | null
  category_id: string | null
  date: string
  recurrence: RecurrenceType
  recurrence_end_date: string | null
  parent_transaction_id: string | null
  created_at: string
  updated_at: string
  category?: Category
  tags?: Tag[]
}

export interface TransactionTag {
  transaction_id: string
  tag_id: string
}

export interface Goal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  created_at: string
  updated_at: string
}

export interface TransactionWithRelations extends Transaction {
  category: Category | null
  tags: Tag[]
}

export interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  balance: number
  transactionCount: number
}

export interface CategoryBreakdown {
  category: string
  amount: number
  percentage: number
  color: string
}

export interface ImportedTransaction {
  type: TransactionType
  amount: number
  description: string
  category?: string
  date: string
  tags?: string[]
}

export interface UserSettings {
  user_id: string
  base_currency: string
  created_at?: string
  updated_at?: string | null
}

export interface AutomationRule {
  id: string
  user_id: string
  name: string | null
  match_contains: string
  category_id: string
  enabled: boolean | number
  created_at: string
  updated_at: string | null
  category_name?: string
  category_type?: TransactionType
}

export interface ExportPayload {
  user: { id: string; email: string; created_at: string }
  settings: UserSettings | null
  categories: Category[]
  tags: Tag[]
  goals: Goal[]
  accounts: any[]
  investments: any[]
  transactions: Transaction[]
  transaction_tags: any[]
  automation_rules: any[]
  exported_at: string
}
