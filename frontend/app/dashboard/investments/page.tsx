"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Pencil, ChevronDown, ChevronRight, Trash2, Loader2 } from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { AddInvestmentDialog } from "@/components/add-investment-dialog"
import { EditInvestmentDialog } from "@/components/edit-investment-dialog"
import { apiRequest, deleteInvestment } from "@/lib/api"
import { SellInvestmentDialog } from "@/components/sell-investment-dialog"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface Investment {
  id: string
  name: string
  type: string
  ticker: string | null
  currency: string
  invested_amount: number
  current_value: number
  quantity: number | null
  commission: number
  is_automated: boolean
  linked_account_id: string | null
  created_at: string
}

interface InvestmentSummary {
  base_currency: string
  total_invested: number
  total_current: number
  profit_loss: number
  profit_loss_percent: number
}

interface GroupedAsset {
  key: string
  name: string
  type: string
  ticker: string | null
  currency: string
  linkedAccountId: string | null
  transactions: Investment[]
  isCurrent: boolean
  currentTransactionIds: string[]
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [summary, setSummary] = useState<InvestmentSummary | null>(null)
  const [editing, setEditing] = useState<Investment | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [tickerPrices, setTickerPrices] = useState<Record<string, number>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [accountsById, setAccountsById] = useState<Record<string, string>>({})
  const [showHistory, setShowHistory] = useState(false)

  const fetchTickerPrices = useCallback((invs: Investment[]) => {
    const tickers = [...new Set(invs.map(i => i.ticker).filter(Boolean) as string[])]
    tickers.forEach(ticker =>
      apiRequest<{ ticker: string; price: number }>(`/investments/price/${ticker}`)
        .then(({ price }) => setTickerPrices(prev => ({ ...prev, [ticker]: price })))
        .catch(() => {})
    )
  }, [])

  const load = useCallback(() => {
    apiRequest<Investment[]>(`/investments${showHistory ? "?show_history=true" : ""}`)
      .then(invs => { setInvestments(invs); fetchTickerPrices(invs) })
      .catch(() => setInvestments([]))
    apiRequest<InvestmentSummary>("/investments/summary")
      .then(setSummary)
      .catch(() => setSummary(null))
    apiRequest<Array<{ id: string; name: string }>>("/accounts")
      .then((accounts) => {
        const mapped = accounts.reduce<Record<string, string>>((acc, account) => {
          acc[account.id] = account.name
          return acc
        }, {})
        setAccountsById(mapped)
      })
      .catch(() => setAccountsById({}))
  }, [fetchTickerPrices, showHistory])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await deleteInvestment(id)
      toast.success('Investment deleted')
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete investment')
    } finally {
      setDeleting(null)
    }
  }


  const calcInvestedBase = (inv: Investment) =>
    inv.quantity != null ? inv.invested_amount * inv.quantity : inv.invested_amount

  const calcInvested = (inv: Investment) =>
    calcInvestedBase(inv) + (inv.commission ?? 0)

  const getCurrentValue = (inv: Investment) => {
    const livePrice = inv.ticker ? tickerPrices[inv.ticker] : undefined
    return livePrice != null && inv.quantity != null
      ? livePrice * inv.quantity
      : livePrice != null ? livePrice : inv.current_value
  }

  const grouped: GroupedAsset[] = useMemo(() => {
    const groups = Object.values(
      investments.reduce<Record<string, GroupedAsset>>((acc, inv) => {
        const groupKey = `${inv.name}::${inv.linked_account_id ?? "no-account"}`
        if (!acc[groupKey]) {
          acc[groupKey] = {
            key: groupKey,
            name: inv.name,
            type: inv.type,
            ticker: inv.ticker,
            currency: inv.currency,
            linkedAccountId: inv.linked_account_id,
            transactions: [],
            isCurrent: false,
            currentTransactionIds: [],
          }
        }
        acc[groupKey].transactions.push(inv)
        return acc
      }, {})
    )

    return groups
      .map((group) => {
        const chronological = [...group.transactions].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        let runningQty = 0
        let lastFlatIndex = -1
        chronological.forEach((inv, index) => {
          runningQty += inv.quantity ?? 1
          if (runningQty <= 0) lastFlatIndex = index
        })
        const cycle = chronological.slice(lastFlatIndex + 1)
        const currentQty = cycle.reduce((s, inv) => s + (inv.quantity ?? 1), 0)
        const isCurrent = currentQty > 0
        const currentTransactionIds = cycle.map((inv) => inv.id)
        const transactions = showHistory
          ? [...chronological].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          : cycle.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        return { ...group, transactions, isCurrent, currentTransactionIds }
      })
      .filter((group) => showHistory || group.isCurrent)
  }, [investments, showHistory])

  const toggleExpand = (groupKey: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey)
      return next
    })
  }

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Calculate summary from frontend data to match table calculations
  const calculatedSummary = useMemo(() => {
    const totalInv = investments.reduce((s, inv) => s + calcInvested(inv), 0)
    const totalCurr = investments.reduce((s, inv) => s + getCurrentValue(inv), 0)
    const pl = totalCurr - totalInv
    const plPercent = totalInv > 0 ? (pl / totalInv) * 100 : 0
    return {
      total_invested: totalInv,
      total_current: totalCurr,
      profit_loss: pl,
      profit_loss_percent: plPercent
    }
  }, [investments, tickerPrices])

  const baseCurrency = summary?.base_currency ?? ""
  const totalPL = calculatedSummary.profit_loss
  const totalPLPercent = calculatedSummary.profit_loss_percent

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Investments</h1>
        <AddInvestmentDialog onSuccess={load} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Total Invested</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(calculatedSummary.total_invested)} {baseCurrency}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Current Value</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(calculatedSummary.total_current)} {baseCurrency}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Profit/Loss</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-2 ${totalPL >= 0 ? "text-green-600" : "text-red-600"}`}>
              {totalPL >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {fmt(totalPL)} {baseCurrency} ({totalPLPercent.toFixed(2)}%)
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Portfolio</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Switch id="show-history" checked={showHistory} onCheckedChange={setShowHistory} />
            <Label htmlFor="show-history">Show history</Label>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead className="w-[12%]">Name</TableHead>
                <TableHead className="w-[10%]">Account</TableHead>
                <TableHead className="w-[8%]">Type</TableHead>
                <TableHead className="w-[7%]">Ticker</TableHead>
                <TableHead className="w-[7%]">Currency</TableHead>
                <TableHead className="w-[8%] text-right">Total Qty</TableHead>
                <TableHead className="w-[10%] text-right">Price / Unit</TableHead>
                <TableHead className="w-[11%] text-right">Total Invested</TableHead>
                <TableHead className="w-[10%] text-right">Value</TableHead>
                <TableHead className="w-[12%] text-right">P/L</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.map((group) => {
                const isExpanded = expanded.has(group.key)
                const totalInv = group.transactions.reduce((s, inv) => s + calcInvested(inv), 0)
                const totalQty = group.transactions.reduce((s, inv) => s + (inv.quantity ?? 1), 0)
                const livePrice = group.ticker ? tickerPrices[group.ticker] : undefined
                const currentVal = livePrice != null && totalQty > 0
                  ? livePrice * totalQty
                  : group.transactions.reduce((s, inv) => s + getCurrentValue(inv), 0)
                const pl = currentVal - totalInv
                const plPercent = totalInv > 0 ? (pl / totalInv) * 100 : 0

                const subRows = isExpanded ? group.transactions.map((inv) => {
                  const isHistoricalTxn = showHistory && !group.currentTransactionIds.includes(inv.id)
                  const invBaseTotal = calcInvestedBase(inv)
                  const invTotal = calcInvested(inv)
                  const invCurrent = getCurrentValue(inv)
                  const invPl = invCurrent - invTotal
                  const invPlPct = invTotal > 0 ? (invPl / invTotal) * 100 : 0
                  return (
                    <TableRow key={inv.id} className={`bg-muted/30 text-sm ${isHistoricalTxn ? "opacity-50" : ""}`}>
                      <TableCell />
                      <TableCell className="pl-6 text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                      <TableCell />
                      <TableCell>{inv.type}</TableCell>
                      <TableCell>{inv.ticker || "-"}</TableCell>
                      <TableCell>{inv.currency}</TableCell>
                      <TableCell className="text-right">{(inv.quantity ?? 1).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{fmt(inv.invested_amount)}</TableCell>
                      <TableCell className="text-right">
                        {fmt(invBaseTotal)}
                        {(inv.commission ?? 0) > 0 && (
                          <span className="text-muted-foreground text-xs ml-1">(+{fmt(inv.commission)} comm.)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{fmt(invCurrent)}</TableCell>
                      <TableCell className={`text-right ${invPl >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {fmt(invPl)} ({invPlPct.toFixed(2)}%)
                      </TableCell>
                      <TableCell className="w-20 text-right">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost" size="icon"
                            onClick={e => { e.stopPropagation(); setEditing(inv) }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Investment</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this investment transaction? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(inv.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deleting === inv.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                }) : []

                return [
                  <TableRow
                    key={group.key}
                    className={`cursor-pointer hover:bg-muted/50 ${group.isCurrent ? "" : "opacity-50"}`}
                    onClick={() => toggleExpand(group.key)}
                  >
                    <TableCell>
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>{group.linkedAccountId ? (accountsById[group.linkedAccountId] ?? "Unknown") : "-"}</TableCell>
                    <TableCell>{group.type}</TableCell>
                    <TableCell>{group.ticker || "-"}</TableCell>
                    <TableCell>{group.currency}</TableCell>
                    <TableCell className="text-right">{totalQty > 0 ? totalQty.toLocaleString() : "-"}</TableCell>
                    <TableCell className="text-right">
                      {livePrice != null ? fmt(livePrice) : "-"}
                    </TableCell>
                    <TableCell className="text-right">{fmt(totalInv)}</TableCell>
                    <TableCell className="text-right">{fmt(currentVal)}</TableCell>
                    <TableCell className={`text-right ${pl >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {fmt(pl)} ({plPercent.toFixed(2)}%)
                    </TableCell>
                    <TableCell className="w-20">
                      <div className="flex items-center justify-end" onClick={e => e.stopPropagation()}>
                        {group.isCurrent ? (
                          <SellInvestmentDialog
                            investment={group.transactions[0]}
                            maxUnits={totalQty}
                            onSuccess={load}
                          />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>,
                  ...subRows,
                ]
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing && (
        <EditInvestmentDialog
          investment={editing}
          open={!!editing}
          onOpenChange={open => !open && setEditing(null)}
          onSuccess={load}
        />
      )}
    </div>
  )
}
