'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, Loader2, CircleHelp } from 'lucide-react'
import { toast } from 'sonner'
import { createInvestment, getTickerPrice } from '@/lib/api'
import { CURRENCIES } from '@/lib/currencies'

const INVESTMENT_TYPES = ['Stock', 'ETF', 'Crypto', 'Bond', 'Real Estate', 'Commodity', 'Other']

interface Props {
  onSuccess?: () => void
}

export function AddInvestmentDialog({ onSuccess }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [form, setForm] = useState({
    name: '', type: 'Stock', ticker: '', currency: 'USD',
    invested_amount: '', current_value: '', quantity: '', commission: '0',
    linked_account_id: '',
  })
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([])
  const [showAccountError, setShowAccountError] = useState(false)

  const calculateValue = (price: string, qty: string, comm: string) => {
    if (!price) return ''
    const p = parseFloat(price)
    const q = qty ? parseFloat(qty) : 1
    return (Math.round((p * q) * 100) / 100).toFixed(2)
  }

  const formatTickerPrice = (price: number) => price.toFixed(2)

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
    if (!open) return
    fetch('/api/accounts', { headers: { Authorization: `Bearer ${document.cookie.match(/(?:^|;\s*)aku_token=([^;]+)/)?.[1] || ''}` } })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setAccounts(list)
        setForm(f => ({ ...f, linked_account_id: list[0]?.id || '' }))
      })
      .catch(() => setAccounts([]))
  }, [open])

  useEffect(() => {
    if (!form.ticker) return
    const timer = setTimeout(async () => {
      try {
        const data = await getTickerPrice(form.ticker)
        setForm(f => {
          const updated = {
            ...f,
            name: data.name,
            invested_amount: formatTickerPrice(data.price),
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
  }, [form.ticker])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.linked_account_id) {
      setShowAccountError(true)
      toast.error('Linked Account is required')
      return
    }
    setIsPending(true)
    try {
      const currentValue = parseFloat(form.current_value)
      if (!Number.isFinite(currentValue) || !/^\d+(\.\d{1,2})?$/.test(form.current_value)) {
        toast.error('Value can have at most 2 decimal places')
        return
      }
      await createInvestment({
        name: form.name,
        type: form.type,
        ticker: form.ticker || undefined,
        currency: form.currency,
        invested_amount: parseFloat(form.invested_amount),
        current_value: currentValue,
        quantity: form.quantity ? parseFloat(form.quantity) : undefined,
        commission: parseFloat(form.commission) || 0,
        linked_account_id: form.linked_account_id,
      })
      toast.success('Investment added')
      setForm({ name: '', type: 'Stock', ticker: '', currency: 'USD', invested_amount: '', current_value: '', quantity: '', commission: '0', linked_account_id: '' })
      setShowAccountError(false)
      setOpen(false)
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add investment')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />Add Investment</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Investment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input placeholder="e.g. Apple Inc." value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => set('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INVESTMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label>Ticker (optional)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                      <CircleHelp className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-64">
                    Enter a symbol (e.g., AAPL) to auto-fill asset name, price, and currency via Yahoo Finance.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input placeholder="e.g. AAPL" value={form.ticker} onChange={e => set('ticker', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Linked Account</Label>
            <Select value={form.linked_account_id} onValueChange={v => { set('linked_account_id', v); setShowAccountError(false) }}>
              <SelectTrigger
                className={showAccountError && !form.linked_account_id ? 'border-destructive focus-visible:ring-destructive' : ''}
              >
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {showAccountError && !form.linked_account_id ? (
              <p className="text-sm text-destructive">Linked Account is required.</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price / Unit</Label>
              <Input type="number" step="0.01" min="0" placeholder="0" value={form.invested_amount} onChange={e => set('invested_amount', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Quantity (optional)</Label>
              <Input type="number" step="0.01" min="0.01" placeholder="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
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
            <Label>Value</Label>
            <Input type="number" step="0.01" min="0" placeholder="0" value={form.current_value} onChange={e => set('current_value', e.target.value)} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : <><Plus className="mr-2 h-4 w-4" />Add</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
