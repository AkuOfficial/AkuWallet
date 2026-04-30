"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, TrendingUp, TrendingDown } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])

  useEffect(() => {
    fetch("/api/investments", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => r.json())
      .then((data) => setInvestments(Array.isArray(data) ? data : []))
      .catch(() => setInvestments([]))
  }, [])

  const totalInvested = investments.reduce((sum, inv) => sum + inv.invested_amount, 0)
  const totalCurrent = investments.reduce((sum, inv) => sum + inv.current_value, 0)
  const totalPL = totalCurrent - totalInvested
  const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Investments</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Investment
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvested.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Current Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCurrent.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Profit/Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-2 ${totalPL >= 0 ? "text-green-600" : "text-red-600"}`}>
              {totalPL >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {totalPL.toLocaleString()} ({totalPLPercent.toFixed(2)}%)
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Ticker</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Invested</TableHead>
                <TableHead className="text-right">Current Value</TableHead>
                <TableHead className="text-right">P/L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.map((inv) => {
                const pl = inv.current_value - inv.invested_amount
                const plPercent = inv.invested_amount > 0 ? (pl / inv.invested_amount) * 100 : 0
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.name}</TableCell>
                    <TableCell>{inv.type}</TableCell>
                    <TableCell>{inv.ticker || "-"}</TableCell>
                    <TableCell>{inv.currency}</TableCell>
                    <TableCell className="text-right">{inv.invested_amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{inv.current_value.toLocaleString()}</TableCell>
                    <TableCell className={`text-right ${pl >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {pl.toLocaleString()} ({plPercent.toFixed(2)}%)
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
