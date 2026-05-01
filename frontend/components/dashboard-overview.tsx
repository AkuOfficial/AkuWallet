'use client'

import { useMemo, useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Receipt } from 'lucide-react'
import type { Transaction } from '@/lib/types'
import { useFilters } from '@/lib/contexts/filter-context'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Sector,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
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
  const { timeSpan, accountIds } = useFilters()
  const [cashFlowRows, setCashFlowRows] = useState<Array<{ date: string; income: number; expense: number }>>([])
  const [netWorthRows, setNetWorthRows] = useState<Array<{ date: string; net_worth: number }>>([])
  const [baseCurrency, setBaseCurrency] = useState<string>('USD')
  const [statsData, setStatsData] = useState<{ totalIncome: number; totalExpenses: number; balance: number; transactionCount: number } | null>(null)
  const [categoryBreakdown, setCategoryBreakdown] = useState<{ expense: Record<string, number>; income: Record<string, number> }>({ expense: {}, income: {} })

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

  const getTokenFromCookie = () => {
    if (typeof document === 'undefined') return null
    const match = document.cookie.match(/(?:^|;\s*)aku_token=([^;]+)/)
    return match ? decodeURIComponent(match[1]) : null
  }

  const range = useMemo(() => {
    const now = new Date()
    // Use local calendar date to avoid UTC day-shift (toISOString() can move date by 1 day in non-UTC timezones)
    const iso = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
    const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
    const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0)

    switch (timeSpan) {
      case 'current_month': {
        const s = startOfMonth(now)
        const e = endOfMonth(now)
        return { start: iso(s), end: iso(e), granularity: 'day' as const }
      }
      case 'last_month': {
        const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const s = startOfMonth(d)
        const e = endOfMonth(d)
        return { start: iso(s), end: iso(e), granularity: 'day' as const }
      }
      case 'last_6_months': {
        const s = new Date(now.getFullYear(), now.getMonth() - 5, 1)
        const e = endOfMonth(now)
        return { start: iso(s), end: iso(e), granularity: 'month' as const }
      }
      case 'last_year': {
        const s = new Date(now.getFullYear() - 1, now.getMonth(), 1)
        const e = endOfMonth(now)
        return { start: iso(s), end: iso(e), granularity: 'month' as const }
      }
      case 'max': {
        return { start: undefined, end: undefined, granularity: 'month' as const }
      }
      default: {
        const s = startOfMonth(now)
        const e = endOfMonth(now)
        return { start: iso(s), end: iso(e), granularity: 'day' as const }
      }
    }
  }, [timeSpan])

  useEffect(() => {
    const token = getTokenFromCookie()
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined
    const params = new URLSearchParams()
    if (range.start) params.set('start_date', range.start)
    if (range.end) params.set('end_date', range.end)
    if (accountIds.length > 0) params.set('account_ids', accountIds.join(','))

    fetch(`/api/stats${params.toString() ? `?${params.toString()}` : ''}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.base_currency) setBaseCurrency(data.base_currency)
        setStatsData({
          totalIncome: data?.total_income ?? 0,
          totalExpenses: data?.total_expense ?? 0,
          balance: data?.balance ?? 0,
          transactionCount: data?.transaction_count ?? 0,
        })
        setCategoryBreakdown({
          expense: data?.expense_by_category ?? {},
          income: data?.income_by_category ?? {},
        })
        const by = (data?.by_date ?? {}) as Record<string, { income: number; expense: number }>
        const rows = Object.keys(by)
          .sort()
          .map((d) => ({ date: d, income: by[d]?.income ?? 0, expense: by[d]?.expense ?? 0 }))
        setCashFlowRows(rows)
      })
      .catch(() => setCashFlowRows([]))
  }, [range.start, range.end, accountIds])

  useEffect(() => {
    const token = getTokenFromCookie()
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined
    const params = new URLSearchParams()
    if (range.start) params.set('start_date', range.start)
    if (range.end) params.set('end_date', range.end)
    if (accountIds.length > 0) params.set('account_ids', accountIds.join(','))

    fetch(`/api/networth/timeseries${params.toString() ? `?${params.toString()}` : ''}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setBaseCurrency(data?.base_currency || 'USD')
        setNetWorthRows(Array.isArray(data?.series) ? data.series : [])
      })
      .catch(() => setNetWorthRows([]))
  }, [range.start, range.end, accountIds])

  const stats = useMemo(() => {
    if (statsData) return statsData
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { 
      totalIncome, 
      totalExpenses, 
      balance: totalIncome - totalExpenses, 
      transactionCount: transactions.length,
    }
  }, [transactions, statsData])

  const buildBreakdown = useCallback((type: 'expense' | 'income') => {
    const byCategory = categoryBreakdown[type]
    return Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))
  }, [categoryBreakdown])

  const cashFlowChart = useMemo(() => {
    const fmtDay = (d: string) => {
      const dt = new Date(d)
      return `${dt.getDate()}`
    }
    const fmtMonth = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short' })

    if (range.granularity === 'day') {
      return cashFlowRows.map((r) => ({
        x: fmtDay(r.date),
        income: r.income,
        expenses: r.expense,
      }))
    }

    // bucket into months
    const buckets = new Map<string, { income: number; expenses: number; date: string }>()
    for (const r of cashFlowRows) {
      const dt = new Date(r.date)
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      const baseDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-01`
      const cur = buckets.get(key) || { income: 0, expenses: 0, date: baseDate }
      cur.income += r.income
      cur.expenses += r.expense
      buckets.set(key, cur)
    }
    return Array.from(buckets.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((b) => ({ x: fmtMonth(b.date), income: b.income, expenses: b.expenses }))
  }, [cashFlowRows, range.granularity])

  const netWorthChart = useMemo(() => {
    const fmtDay = (d: string) => {
      const dt = new Date(d)
      return `${dt.getDate()}`
    }
    const fmtMonth = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short' })

    if (range.granularity === 'day') {
      return netWorthRows.map((r) => ({ x: fmtDay(r.date), netWorth: r.net_worth }))
    }

    // bucket: take last value per month
    const buckets = new Map<string, { date: string; netWorth: number }>()
    for (const r of netWorthRows) {
      const dt = new Date(r.date)
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      const monthEndSortKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      const cur = buckets.get(key)
      if (!cur || monthEndSortKey.localeCompare(cur.date) > 0) {
        buckets.set(key, { date: monthEndSortKey, netWorth: r.net_worth })
      }
    }
    return Array.from(buckets.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((b) => ({ x: fmtMonth(b.date), netWorth: b.netWorth }))
  }, [netWorthRows, range.granularity])

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: baseCurrency || 'USD', minimumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className={`text-lg font-bold ${stats.balance >= 0 ? 'text-income' : 'text-expense'}`}>
                {fmt(stats.balance)}
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              0.0%
            </Badge>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Income</p>
              <p className="text-lg font-bold text-income">{fmt(stats.totalIncome)}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              0.0%
            </Badge>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="text-lg font-bold text-expense">{fmt(stats.totalExpenses)}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              0.0%
            </Badge>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="text-lg font-bold text-foreground">{stats.transactionCount}</p>
            </div>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
      </div>

      <Tabs defaultValue="cashflow" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="networth">Net Worth</TabsTrigger>
        </TabsList>

        <div className="grid gap-6 lg:grid-cols-2">
          <TabsContent value="cashflow" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Cash Flow</CardTitle>
              </CardHeader>
              <CardContent>
                {cashFlowChart.some(d => d.income !== 0 || d.expenses !== 0) ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={cashFlowChart} barGap={6} barCategoryGap="15%">
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={tickColor} strokeOpacity={0.3} />
                      <XAxis dataKey="x" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 11, fill: tickColor }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}`}
                        width={48}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null
                          const p = payload.reduce((acc, item) => {
                            acc[item.dataKey as string] = item.value as number
                            return acc
                          }, {} as Record<string, number>)
                          return (
                            <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
                              <p className="mb-1 font-medium text-foreground">{label}</p>
                              <div className="space-y-1">
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Income:</span>
                                  <span className="font-medium text-income">{fmt(p.income || 0)}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Expenses:</span>
                                  <span className="font-medium text-expense">{fmt(p.expenses || 0)}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Net:</span>
                                  <span className="font-medium">{fmt((p.income || 0) - (p.expenses || 0))}</span>
                                </div>
                              </div>
                            </div>
                          )
                        }}
                        cursor={{ fill: 'transparent' }}
                      />
                      <Bar dataKey="income" fill="#10b981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                    No transaction data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="networth" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={netWorthChart}>
                    <defs>
                      <linearGradient id="assetsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={tickColor} strokeOpacity={0.3} />
                    <XAxis dataKey="x" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: tickColor }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}`}
                      width={48}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        const v = (payload[0]?.value as number) ?? 0
                        return (
                          <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
                            <p className="mb-1 font-medium text-foreground">{label}</p>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Net Worth:</span>
                              <span className="font-medium">{fmt(v)}</span>
                            </div>
                          </div>
                        )
                      }}
                      cursor={{ stroke: tickColor, strokeWidth: 1, strokeDasharray: '3 3' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="netWorth" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      fill="url(#assetsGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <CategoryBreakdownCard transactions={transactions} buildBreakdown={buildBreakdown} fmt={fmt} />
        </div>
      </Tabs>
    </div>
  )
}

type BreakdownItem = { name: string; value: number; color: string }

function renderActiveShape(props: Record<string, number> & { name: string; value: number; fill: string; isActive: boolean; opacity?: number }) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, isActive, opacity = 1 } = props
  const r = isActive ? outerRadius + 6 : outerRadius
  return (
    <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={r} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={opacity} />
  )
}

function CategoryBreakdownCard({
  transactions: _transactions,
  buildBreakdown,
  fmt,
}: {
  transactions: Transaction[]
  buildBreakdown: (type: 'expense' | 'income') => BreakdownItem[]
  fmt: (n: number) => string
}) {
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const data = useMemo(() => buildBreakdown(type), [buildBreakdown, type])

  // Reset selection when type changes
  useEffect(() => { setSelected(new Set()) }, [type])

  const hasSelection = selected.size > 0

  const displayedSum = useMemo(() => {
    if (!hasSelection) return data.reduce((s, d) => s + d.value, 0)
    return data.filter(d => selected.has(d.name)).reduce((s, d) => s + d.value, 0)
  }, [data, selected, hasSelection])

  const toggle = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const chartData = data.map(d => ({
    ...d,
    fill: hasSelection && !selected.has(d.name) ? '#3f3f46' : d.color,
    isActive: hasSelection && selected.has(d.name),
    opacity: hasSelection && !selected.has(d.name) ? 0.35 : 1,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Category Breakdown</CardTitle>
          <ToggleGroup
            type="single"
            value={type}
            onValueChange={(v) => v && setType(v as 'expense' | 'income')}
            variant="outline"
            size="sm"
            className="h-7"
          >
            <ToggleGroupItem value="expense" className="text-xs px-3 h-7">Expenses</ToggleGroupItem>
            <ToggleGroupItem value="income" className="text-xs px-3 h-7">Income</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center">
              <div className="relative">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={80}
                      dataKey="value"
                      stroke="none"
                      paddingAngle={2}
                      isAnimationActive
                      activeShape={(props: unknown) => {
                        const p = props as Record<string, number> & { name: string; value: number; fill: string; isActive: boolean; opacity?: number }
                        return renderActiveShape(p)
                      }}
                      activeIndex={chartData.map((_, i) => i)}
                    >
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const item = payload[0]
                        return (
                          <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.payload.color }} />
                              <span className="text-muted-foreground">{item.payload.name}:</span>
                              <span className="font-medium text-foreground">{fmt(item.value as number)}</span>
                            </div>
                          </div>
                        )
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">
                    {hasSelection ? `${selected.size} selected` : 'Total'}
                  </span>
                  <span className="text-base font-bold text-foreground leading-tight">{fmt(displayedSum)}</span>
                </div>
              </div>
            </div>

            {/* Category badges */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {data.map((item) => {
                const isOn = !hasSelection || selected.has(item.name)
                return (
                  <button
                    key={item.name}
                    onClick={() => toggle(item.name)}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all ${
                      selected.has(item.name)
                        ? 'border-transparent text-foreground'
                        : hasSelection
                        ? 'border-border text-muted-foreground opacity-50'
                        : 'border-border text-muted-foreground hover:border-foreground/30'
                    }`}
                    style={selected.has(item.name) ? { backgroundColor: item.color + '33', borderColor: item.color } : {}}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full transition-colors"
                      style={{ backgroundColor: isOn ? item.color : '#52525b' }}
                    />
                    <span>{item.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            No data for this period
          </div>
        )}
      </CardContent>
    </Card>
  )
}
