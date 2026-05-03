'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateInvestment, getTickerPrice } from '@/lib/api'
import { CURRENCIES } from '@/lib/currencies'

const INVESTMENT_TYPES = ['Stock', 'ETF', 'Crypto', 'Bond', 'Real Estate', 'Commodity', 'Other']

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
}

interface Props {
  investment: Investment
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditInvestmentDialog({ investment, open, onOpenChange, onSuccess }: Props) {
  const [isPending, setIsPending] = useState(false)
  const [form, setForm] = useState({
    name: investment.name,
    type: investment.type,
    ticker: investment.ticker ?? '',
    currency: investment.currency,
    invested_amount: investment.invested_amount.toString(),
    current_value: investment.current_value.toString(),
    quantity: investment.quantity?.toString() ?? '',
    commission: (investment.commission ?? 0).toString(),
    linked_account_id: '',
  })
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([])
  const [prevTicker, setPrevTicker] = useState(investment.ticker ?? '')

  useEffect(() => {
    if (!open) return
    fetch('/api/accounts', { headers: { Authorization: `Bearer ${document.cookie.match(/(?:^|;\s*)aku_token=([^;]+)/)?.[1] || ''}` } })
      .then(r => r.json())
      .then(data => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => setAccounts([]))
  }, [open])

  useEffect(() => {
    setForm({
      name: investment.name,
      type: investment.type,
      ticker: investment.ticker ?? '',
      currency: investment.currency,
      invested_amount: investment.invested_amount.toString(),
      current_value: investment.current_value.toString(),
      quantity: investment.quantity?.toString() ?? '',
      commission: (investment.commission ?? 0).toString(),
      linked_account_id: '',
    })
    setPrevTicker(investment.ticker ?? '')
  }, [investment])

  const calculateValue = (price: string, qty: string, comm: string) => {
    if (!price) return ''
    const p = parseFloat(price)
    const q = qty ? parseFloat(qty) : 1
    const c = comm ? parseFloat(comm) : 0
    return String(p * q + c)
  }

  const set = (key: string, value: string) => setForm(f => {
    const updated = { ...f, [key]: value }
    if (['invested_amount', 'quantity', 'commission'].includes(key)) {
      updated.current_value = calculateValue(
        updated.invested_amount,
        updated.quantity,
        updated.commission
      )
    }
    return updated
  })

  useEffect(() => {
    if (!form.ticker || form.ticker === prevTicker) return
    setPrevTicker(form.ticker)
    const timer = setTimeout(async () => {
      try {
        const data = await getTickerPrice(form.ticker)
        setForm(f => {
          const updated = {
            ...f,
            name: data.name,
            invested_amount: data.price.toString(),
            currency: data.currency
          }
          updated.current_value = calculateValue(
            updated.invested_amount,
            updated.quantity,
            updated.commission
          )
          return updated
        })
      } catch {}
    }, 500)
    return () => clearTimeout(timer)
  }, [form.ticker, prevTicker])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPending(true)
    try {
      await updateInvestment(investment.id, {
        name: form.name,
        type: form.type,
        ticker: form.ticker || null,
        currency: form.currency,
        invested_amount: parseFloat(form.invested_amount),
        current_value: parseFloat(form.current_value),
        quantity: form.quantity ? parseFloat(form.quantity) : null,
        commission: parseFloat(form.commission) || 0,
        is_automated: investment.is_automated,
      })
      toast.success('Investment updated')
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update investment')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit Investment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => set('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INVESTMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ticker (optional)</Label>
              <Input placeholder="e.g. AAPL" value={form.ticker} onChange={e => set('ticker', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price / Unit</Label>
              <Input type="number" step="0.01" min="0" value={form.invested_amount} onChange={e => set('invested_amount', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Quantity (optional)</Label>
              <Input type="number" step="any" min="0" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Commission</Label>
              <Input type="number" step="0.01" min="0" placeholder="0" value={form.commission} onChange={e => set('commission', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={v => set('currency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Linked Account</Label>
            <Select value={form.linked_account_id} onValueChange={v => set('linked_account_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Value</Label>
            <Input type="number" step="0.01" min="0" value={form.current_value} onChange={e => set('current_value', e.target.value)} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
