import { ImportTransactions } from '@/components/import-transactions'

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Import Transactions</h1>
        <p className="mt-1 text-muted-foreground">
          Import your transactions from CSV or JSON files
        </p>
      </div>

      <ImportTransactions />
    </div>
  )
}
