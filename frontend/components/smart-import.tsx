"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Upload, Check, X } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"

interface ReviewTransaction {
  type: string
  amount: number
  currency: string
  description: string
  category: string | null
  date: string
  confidence: number
}

export function SmartImport() {
  const [file, setFile] = useState<File | null>(null)
  const [transactions, setTransactions] = useState<ReviewTransaction[]>([])
  const [loading, setLoading] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    setLoading(true)

    const formData = new FormData()
    formData.append("file", uploadedFile)

    try {
      const response = await fetch("/api/smart-import/analyze", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      })
      const data = await response.json()
      setTransactions(data.transactions)
    } catch (error) {
      console.error("Import failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await fetch("/api/smart-import/confirm", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transactions }),
      })
      setTransactions([])
      setFile(null)
    } catch (error) {
      console.error("Confirm failed:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          AI Smart Import
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.txt"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag & drop your bank statement or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Supports CSV, Excel, and text files
            </p>
          </label>
        </div>

        {loading && <p className="text-center">Analyzing with AI...</p>}

        {transactions.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Review {transactions.length} Transactions</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setTransactions([])}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleConfirm}>
                  <Check className="h-4 w-4 mr-2" />
                  Confirm Import
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{tx.date}</TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell>{tx.category || "Uncategorized"}</TableCell>
                    <TableCell>{tx.type}</TableCell>
                    <TableCell className="text-right">
                      {tx.amount} {tx.currency}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={tx.confidence > 0.7 ? "text-green-600" : "text-yellow-600"}>
                        {(tx.confidence * 100).toFixed(0)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  )
}
