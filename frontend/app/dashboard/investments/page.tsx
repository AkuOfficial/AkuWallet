"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Pencil, ChevronDown, ChevronRight } from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { AddInvestmentDialog } from "@/components/add-investment-dialog"
import { EditInvestmentDialog } from "@/components/edit-investment-dialog"
import { apiRequest } from "@/lib/api"

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
  name: string
  type: string
  ticker: string | null
  currency: string
  transactions: Investment[]
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [summary, setSummary] = useState<InvestmentSummary | null>(null)
  const [editing, setEditing] = useState<Investment | null>(null)
  const [tickerPrices, setTickerPrices] = useState<Record<string, number>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const fetchTickerPrices = useCallback((invs: Investment[]) => {
    const tickers = [...new Set(invs.map(i => i.ticker).filter(Boolean) as string[])]
    tickers.forEach(ticker =>
      apiRequest<{ ticker: string; price: number }>(`/investments/price/${ticker}`)
        .then(({ price }) => setTickerPrices(prev => ({ ...prev, [ticker]: price })))
        .catch(() => {})
    )
  }, [])

  const load = useCallback(() => {
    apiRequest<Investment[]>("/investments")
      .then(invs => { setInvestments(invs); fetchTickerPrices(invs) })
      .catch(() => setInvestments([]))
    apiRequest<InvestmentSummary>("/investments/summary")
      .then(setSummary)
      .catch(() => setSummary(null))
  }, [fetchTickerPrices])

  useEffect(() => { load() }, [load])

  const calcInvested = (inv: Investment) =>
    inv.quantity != null ? inv.invested_amount * inv.quantity : inv.invested_amount

  const getCurrentValue = (inv: Investment) => {
    const livePrice = inv.ticker ? tickerPrices[inv.ticker] : undefined
    return livePrice != null && inv.quantity != null
      ? livePrice * inv.quantity
      : livePrice != null ? livePrice : inv.current_value
  }

  const grouped: GroupedAsset[] = Object.values(
    investments.reduce<Record<string, GroupedAsset>>((acc, inv) => {
      if (!acc[inv.name]) {
        acc[inv.name] = { name: inv.name, type: inv.type, ticker: inv.ticker, currency: inv.currency, transactions: [] }
      }
      acc[inv.name].transactions.push(inv)
      return acc
    }, {})
  )

  const toggleExpand = (name: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const baseCurrency = summary?.base_currency ?? ""
  const totalPL = summary?.profit_loss ?? 0
  const totalPLPercent = summary?.profit_loss_percent ?? 0

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Investments</h1>
        <AddInvestmentDialog onSuccess={load} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Total Invested</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(summary?.total_invested ?? 0)} {baseCurrency}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Current Value</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(summary?.total_current ?? 0)} {baseCurrency}</div></CardContent>
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
          <Table className="w-full min-w-[900px] table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead className="w-[14%]">Name</TableHead>
                <TableHead className="w-[9%]">Type</TableHead>
                <TableHead className="w-[9%]">Ticker</TableHead>
                <TableHead className="w-[8%]">Currency</TableHead>
                <TableHead className="w-[9%] text-right">Total Qty</TableHead>
                <TableHead className="w-[11%] text-right">Price / Unit</TableHead>
                <TableHead className="w-[12%] text-right">Total Invested</TableHead>
                <TableHead className="w-[12%] text-right">Value</TableHead>
                <TableHead className="w-[13%] text-right">P/L</TableHead>
                <TableHead className="w-[52px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.map((group) => {
                const isExpanded = expanded.has(group.name)
                const totalInv = group.transactions.reduce((s, inv) => s + calcInvested(inv), 0)
                const totalCommission = group.transactions.reduce((s, inv) => s + (inv.commission ?? 0), 0)
                const totalQty = group.transactions.reduce((s, inv) => s + (inv.quantity ?? 0), 0)
                const livePrice = group.ticker ? tickerPrices[group.ticker] : undefined
                const currentVal = livePrice != null && totalQty > 0
                  ? livePrice * totalQty
                  : group.transactions.reduce((s, inv) => s + getCurrentValue(inv), 0)
                const pl = currentVal - totalInv - totalCommission
                const plPercent = totalInv > 0 ? (pl / totalInv) * 100 : 0

                const subRows = isExpanded ? group.transactions.map((inv) => {
                  const invTotal = calcInvested(inv)
                  const invCurrent = getCurrentValue(inv)
                  const invPl = invCurrent - invTotal - (inv.commission ?? 0)
                  const invPlPct = invTotal > 0 ? (invPl / invTotal) * 100 : 0
                  return (
                    <TableRow key={inv.id} className="bg-muted/30 text-sm">
                      <TableCell />
                      <TableCell className="pl-6 text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{inv.type}</TableCell>
                      <TableCell>{inv.ticker || "-"}</TableCell>
                      <TableCell>{inv.currency}</TableCell>
                      <TableCell className="text-right">{inv.quantity != null ? inv.quantity.toLocaleString() : "-"}</TableCell>
                      <TableCell className="text-right">{fmt(inv.invested_amount)}</TableCell>
                      <TableCell className="text-right">
                        {fmt(invTotal)}
                        {(inv.commission ?? 0) > 0 && (
                          <span className="text-muted-foreground text-xs ml-1">(+{fmt(inv.commission)} comm.)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{fmt(invCurrent - (inv.commission ?? 0))}</TableCell>
                      <TableCell className={`text-right ${invPl >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {fmt(invPl)} ({invPlPct.toFixed(2)}%)
                      </TableCell>
                      <TableCell className="w-[52px] text-right">
                        <Button
                          variant="ghost" size="icon"
                          onClick={e => { e.stopPropagation(); setEditing(inv) }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                }) : []

                return [
                  <TableRow
                    key={group.name}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpand(group.name)}
                  >
                    <TableCell>
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>{group.type}</TableCell>
                    <TableCell>{group.ticker || "-"}</TableCell>
                    <TableCell>{group.currency}</TableCell>
                    <TableCell className="text-right">{totalQty > 0 ? totalQty.toLocaleString() : "-"}</TableCell>
                    <TableCell className="text-right">
                      {livePrice != null ? fmt(livePrice) : "-"}
                    </TableCell>
                    <TableCell className="text-right">{fmt(totalInv)}</TableCell>
                    <TableCell className="text-right">{fmt(currentVal - totalCommission)}</TableCell>
                    <TableCell className={`text-right ${pl >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {fmt(pl)} ({plPercent.toFixed(2)}%)
                    </TableCell>
                    <TableCell className="w-[52px]" />
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
