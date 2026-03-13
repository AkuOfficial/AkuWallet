'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Upload, FileJson, FileSpreadsheet, CheckCircle2, XCircle, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { importTransactions as apiImportTransactions, suggestCategory, getCategories } from '@/lib/api'
import type { ImportedTransaction, TransactionType, Category } from '@/lib/types'
import { cn } from '@/lib/utils'

type ImportStep = 'upload' | 'preview' | 'result'

interface ImportResult {
  success: number
  failed: number
  errors: string[]
}

export function ImportTransactions() {
  const [step, setStep] = useState<ImportStep>('upload')
  const [parsedTransactions, setParsedTransactions] = useState<ImportedTransaction[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isCategorizingAI, setIsCategorizingAI] = useState(false)

  const parseCSV = (content: string): ImportedTransaction[] => {
    const lines = content.trim().split('\n')
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const requiredHeaders = ['type', 'amount', 'date']
    
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        throw new Error(`CSV must have a "${required}" column`)
      }
    }

    const transactions: ImportedTransaction[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length !== headers.length) continue

      const row: Record<string, string> = {}
      headers.forEach((h, idx) => {
        row[h] = values[idx]
      })

      const type = row.type?.toLowerCase()
      if (type !== 'income' && type !== 'expense') continue

      const amount = parseFloat(row.amount)
      if (isNaN(amount) || amount <= 0) continue

      transactions.push({
        type: type as TransactionType,
        amount,
        description: row.description || '',
        category: row.category || undefined,
        date: row.date,
        tags: row.tags ? row.tags.split(';').map(t => t.trim()) : undefined,
      })
    }

    return transactions
  }

  const parseJSON = (content: string): ImportedTransaction[] => {
    const data = JSON.parse(content)
    const items = Array.isArray(data) ? data : data.transactions || []

    return items.map((item: Record<string, unknown>) => ({
      type: (item.type as string)?.toLowerCase() === 'income' ? 'income' : 'expense',
      amount: parseFloat(String(item.amount)) || 0,
      description: String(item.description || ''),
      category: item.category ? String(item.category) : undefined,
      date: String(item.date || new Date().toISOString().split('T')[0]),
      tags: Array.isArray(item.tags) ? item.tags.map(String) : undefined,
    })).filter((t: ImportedTransaction) => t.amount > 0)
  }

  const handleFile = useCallback((file: File) => {
    setError(null)
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        let transactions: ImportedTransaction[]

        if (file.name.endsWith('.csv')) {
          transactions = parseCSV(content)
        } else if (file.name.endsWith('.json')) {
          transactions = parseJSON(content)
        } else {
          throw new Error('Unsupported file format. Please use CSV or JSON.')
        }

        if (transactions.length === 0) {
          throw new Error('No valid transactions found in file')
        }

        setParsedTransactions(transactions)
        setStep('preview')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse file')
      }
    }

    reader.onerror = () => {
      setError('Failed to read file')
    }

    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleAICategorize = async () => {
    setIsCategorizingAI(true)
    try {
      const categories: Category[] = await getCategories()
      const suggestions = await suggestCategory({
        transactions: parsedTransactions.map(tx => ({ description: tx.description || '', type: tx.type })),
        categories,
      })
      setParsedTransactions(prev => prev.map((tx, i) => ({
        ...tx,
        category: suggestions[i]?.suggestedCategory ?? tx.category,
      })))
      toast.success('AI categorization complete')
    } catch {
      toast.error('AI categorization failed')
    } finally {
      setIsCategorizingAI(false)
    }
  }

  const handleImport = async () => {
    setIsPending(true)
    try {
      const result = await apiImportTransactions(parsedTransactions)
      setResult(result)
      setStep('result')
      toast.success(`Imported ${result.success} transactions`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import transactions')
      toast.error('Failed to import transactions')
    } finally {
      setIsPending(false)
    }
  }

  const handleReset = () => {
    setStep('upload')
    setParsedTransactions([])
    setResult(null)
    setError(null)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 'upload' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card
            className={cn(
              'border-2 border-dashed transition-colors',
              isDragging && 'border-primary bg-primary/5'
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Upload your file
              </h3>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Drag and drop your CSV or JSON file here, or click to browse
              </p>
              <label className="mt-4">
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <Button variant="outline" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">File Format Guide</CardTitle>
              <CardDescription>
                Your file should include these columns/fields
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">CSV Format</p>
                  <p className="text-sm text-muted-foreground">
                    Required: type, amount, date
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Optional: description, category, tags (semicolon-separated)
                  </p>
                  <code className="mt-2 block rounded bg-muted p-2 text-xs">
                    type,amount,date,description,category<br />
                    expense,50.00,2024-01-15,Groceries,Food
                  </code>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileJson className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">JSON Format</p>
                  <p className="text-sm text-muted-foreground">
                    Array of objects or {`{ transactions: [...] }`}
                  </p>
                  <code className="mt-2 block rounded bg-muted p-2 text-xs">
                    {`[{ "type": "expense", "amount": 50, "date": "2024-01-15" }]`}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'preview' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Preview Import</CardTitle>
              <CardDescription>
                {parsedTransactions.length} transaction{parsedTransactions.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                Cancel
              </Button>
              <Button variant="outline" onClick={handleAICategorize} disabled={isCategorizingAI || isPending}>
                {isCategorizingAI ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Categorizing...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" />AI Categorize</>
                )}
              </Button>
              <Button onClick={handleImport} disabled={isPending || isCategorizingAI}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import All
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedTransactions.slice(0, 10).map((tx, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            tx.type === 'income'
                              ? 'border-income text-income'
                              : 'border-expense text-expense'
                          )}
                        >
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell>{tx.date}</TableCell>
                      <TableCell>{tx.description || '-'}</TableCell>
                      <TableCell>{tx.category || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedTransactions.length > 10 && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                ...and {parsedTransactions.length - 10} more transactions
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'result' && result && (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            {result.failed === 0 ? (
              <CheckCircle2 className="h-16 w-16 text-income" />
            ) : result.success === 0 ? (
              <XCircle className="h-16 w-16 text-destructive" />
            ) : (
              <AlertCircle className="h-16 w-16 text-chart-4" />
            )}

            <h3 className="mt-4 text-xl font-semibold text-foreground">
              Import Complete
            </h3>

            <div className="mt-4 flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-income">{result.success}</p>
                <p className="text-sm text-muted-foreground">Imported</p>
              </div>
              {result.failed > 0 && (
                <div>
                  <p className="text-2xl font-bold text-destructive">{result.failed}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="mt-4 max-h-40 w-full overflow-y-auto rounded bg-muted p-3">
                {result.errors.map((err, idx) => (
                  <p key={idx} className="text-xs text-muted-foreground">
                    {err}
                  </p>
                ))}
              </div>
            )}

            <Button className="mt-6" onClick={handleReset}>
              Import More
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
