'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HandCoins, Loader2 } from 'lucide-react'
import { sellInvestment } from '@/lib/api'
import { toast } from 'sonner'

export function SellInvestmentDialog({ investment, onSuccess }: { investment: any; onSuccess?: () => void }) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([])
  const [accountId, setAccountId] = useState('')
  const [quantity, setQuantity] = useState(investment.quantity ? String(investment.quantity) : '1')
  const [price, setPrice] = useState(String(investment.invested_amount))
  const [commission, setCommission] = useState('0')

  useEffect(() => {
    if (!open) return
    fetch('/api/accounts', { headers: { Authorization: `Bearer ${document.cookie.match(/(?:^|;\s*)aku_token=([^;]+)/)?.[1] || ''}` } })
      .then(r => r.json())
      .then(data => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => setAccounts([]))
  }, [open])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPending(true)
    try {
      await sellInvestment(investment.id, {
        account_id: accountId,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        commission: parseFloat(commission) || 0,
        currency: investment.currency,
      })
      toast.success('Sell transaction created')
      setOpen(false)
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sell investment')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon"><HandCoins className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Sell Investment</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Linked Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" step="any" min="0.0000001" value={quantity} onChange={e => setQuantity(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Price / Unit</Label><Input type="number" step="0.01" min="0.01" value={price} onChange={e => setPrice(e.target.value)} required /></div>
          </div>
          <div className="space-y-2"><Label>Commission</Label><Input type="number" step="0.01" min="0" value={commission} onChange={e => setCommission(e.target.value)} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !accountId}>
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Selling...</> : <><HandCoins className="mr-2 h-4 w-4" />Sell</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

