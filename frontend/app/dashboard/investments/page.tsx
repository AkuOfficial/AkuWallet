"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Pencil } from "lucide-react"
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
  is_automated: boolean
}

interface InvestmentSummary {
  base_currency: string
  total_invested: number
  total_current: number
  profit_loss: number
  profit_loss_percent: number
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [summary, setSummary] = useState<InvestmentSummary | null>(null)
  const [editing, setEditing] = useState<Investment | null>(null)

  const load = useCallback(() => {
    apiRequest<Investment[]>("/investments")
      .then(setInvestments)
      .catch(() => setInvestments([]))
    apiRequest<InvestmentSummary>("/investments/summary")
      .then(setSummary)
      .catch(() => setSummary(null))
  }, [])

  useEffect(() => { load() }, [load])

  const calcInvested = (inv: Investment) =>
    inv.quantity != null ? inv.invested_amount * inv.quantity : inv.invested_amount

  const baseCurrency = summary?.base_currency ?? ""
  const totalInvested = summary?.total_invested ?? 0
  const totalCurrent = summary?.total_current ?? 0
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
          <CardContent><div className="text-2xl font-bold">{totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrency}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Current Value</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalCurrent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrency}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Profit/Loss</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-2 ${totalPL >= 0 ? "text-green-600" : "text-red-600"}`}>
              {totalPL >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {totalPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrency} ({totalPLPercent.toFixed(2)}%)
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Portfolio</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Ticker</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price / Unit</TableHead>
                <TableHead className="text-right">Total Invested</TableHead>
                <TableHead className="text-right">Current Value</TableHead>
                <TableHead className="text-right">P/L</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.map((inv) => {
                const totalInv = calcInvested(inv)
                const pl = inv.current_value - totalInv
                const plPercent = totalInv > 0 ? (pl / totalInv) * 100 : 0
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.name}</TableCell>
                    <TableCell>{inv.type}</TableCell>
                    <TableCell>{inv.ticker || "-"}</TableCell>
                    <TableCell>{inv.currency}</TableCell>
                    <TableCell className="text-right">{inv.quantity != null ? inv.quantity.toLocaleString() : "-"}</TableCell>
                    <TableCell className="text-right">{inv.invested_amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{totalInv.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{inv.current_value.toLocaleString()}</TableCell>
                    <TableCell className={`text-right ${pl >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {pl.toLocaleString()} ({plPercent.toFixed(2)}%)
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(inv)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
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
