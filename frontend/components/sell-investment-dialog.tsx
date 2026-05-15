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

export function SellInvestmentDialog({
  investment,
  maxUnits,
  onSuccess
}: {
  investment: any
  maxUnits?: number
  onSuccess?: () => void
}) {
  const round2 = (n: number) => Math.round(n * 100) / 100
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([])
  const [accountId, setAccountId] = useState('')
  const [showAccountError, setShowAccountError] = useState(false)
  const availableUnits = round2(maxUnits ?? (investment.quantity ?? 1))
  const minUnits = 0.01
  const stepUnits = 0.01
  const [quantity, setQuantity] = useState(String(availableUnits > 0 ? availableUnits : minUnits))
  const [price, setPrice] = useState(String(investment.invested_amount))
  const [commission, setCommission] = useState('0')
  const value = (() => {
    const qty = Number.parseFloat(quantity)
    const unitPrice = Number.parseFloat(price)
    const comm = Number.parseFloat(commission) || 0
    if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return '0.00'
    return (Math.round((qty * unitPrice - comm) * 100) / 100).toFixed(2)
  })()

  const normalizeUnits = (value: string) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return String(minUnits)
    const clamped = Math.min(Math.max(round2(n), minUnits), availableUnits)
    return clamped.toFixed(2).replace(/\.?0+$/, '')
  }

  useEffect(() => {
    if (!open) return
    const defaultQty = availableUnits > 0 ? availableUnits : minUnits
    setQuantity(defaultQty.toFixed(2).replace(/\.?0+$/, ''))
    setAccountId(investment.linked_account_id ?? '')
    setShowAccountError(false)
    fetch('/api/accounts', { headers: { Authorization: `Bearer ${document.cookie.match(/(?:^|;\s*)aku_token=([^;]+)/)?.[1] || ''}` } })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setAccounts(list)
        if (investment.linked_account_id && list.some((a) => a.id === investment.linked_account_id)) {
          setAccountId(investment.linked_account_id)
        }
      })
      .catch(() => setAccounts([]))
  }, [open])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId) {
      setShowAccountError(true)
      toast.error('Linked Account is required')
      return
    }
    const qty = round2(parseFloat(quantity))
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Units must be greater than 0')
      return
    }
    if (qty > round2(availableUnits)) {
      toast.error(`You can sell at most ${availableUnits} units`)
      return
    }
    setIsPending(true)
    try {
      await sellInvestment(investment.id, {
        account_id: accountId,
        quantity: qty,
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
            <Select value={accountId} onValueChange={(value) => { setAccountId(value); setShowAccountError(false) }}>
              <SelectTrigger
                className={showAccountError && !accountId ? 'border-destructive focus-visible:ring-destructive' : ''}
              >
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
            {showAccountError && !accountId ? (
              <p className="text-sm text-destructive">Linked Account is required.</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Units (shares to sell)</Label>
              <Input
                type="number"
                step={String(stepUnits)}
                min={String(minUnits)}
                max={availableUnits}
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                onBlur={e => setQuantity(normalizeUnits(e.target.value))}
                required
              />
            </div>
            <div className="space-y-2"><Label>Price / Unit</Label><Input type="number" step="0.01" min="0.01" value={price} onChange={e => setPrice(e.target.value)} required /></div>
          </div>
          <div className="space-y-2"><Label>Commission</Label><Input type="number" step="0.01" min="0" value={commission} onChange={e => setCommission(e.target.value)} /></div>
          <div className="space-y-2"><Label>Value</Label><Input type="number" step="0.01" value={value} readOnly disabled /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Selling...</> : <><HandCoins className="mr-2 h-4 w-4" />Sell</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
