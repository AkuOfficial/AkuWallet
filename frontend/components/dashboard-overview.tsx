'use client'

import { useMemo, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Wallet, Receipt } from 'lucide-react'
import type { Transaction } from '@/lib/types'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  TooltipProps,
} from 'recharts'

interface DashboardOverviewProps {
  transactions: Transaction[]
}

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444']

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(p.value as number)}
          </span>
        </div>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.payload.color }} />
        <span className="text-muted-foreground">{item.payload.name}:</span>
        <span className="font-medium text-foreground">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(item.value as number)}
        </span>
      </div>
    </div>
  )
}

export function DashboardOverview({ transactions }: DashboardOverviewProps) {
  const [tickColor, setTickColor] = useState('#888')

  useEffect(() => {
    const update = () => {
      const isDark = document.documentElement.classList.contains('dark')
      setTickColor(isDark ? '#a1a1aa' : '#71717a')
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = transactions.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const totalIncome = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const totalExpenses = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses, transactionCount: thisMonth.length }
  }, [transactions])

  const categoryBreakdown = useMemo(() => {
    const now = new Date()
    const thisMonth = transactions.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.type === 'expense'
    })
    const byCategory = thisMonth.reduce((acc, t) => {
      const name = t.category?.name || 'Uncategorized'
      acc[name] = (acc[name] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)
    return Object.entries(byCategory)
      .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [transactions])

  const monthlyData = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const month = date.toLocaleDateString('en-US', { month: 'short' })
      const monthTx = transactions.filter(t => {
        const d = new Date(t.date)
        return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear()
      })
      return {
        month,
        Income: monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        Expenses: monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      }
    })
  }, [transactions])

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-income" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-income">{fmt(stats.totalIncome)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-expense" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense">{fmt(stats.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-income' : 'text-expense'}`}>
              {fmt(stats.balance)}
            </div>
            <p className="text-xs text-muted-foreground">Net this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.transactionCount}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.some(d => d.Income > 0 || d.Expenses > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData} barCategoryGap="30%" barGap={4}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={tickColor} strokeOpacity={0.3} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: tickColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: tickColor }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                    width={48}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: tickColor, opacity: 0.08 }} />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                No transaction data yet
              </div>
            )}
            <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#10b981]" />Income</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ef4444]" />Expenses</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="45%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      dataKey="value"
                      stroke="none"
                      paddingAngle={2}
                    >
                      {categoryBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {categoryBreakdown.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="truncate text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="ml-2 shrink-0 font-medium text-foreground">{fmt(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                No expense data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
