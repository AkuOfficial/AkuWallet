'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'
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
  })

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
    if (!form.ticker) return
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
  }, [form.ticker])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPending(true)
    try {
      await createInvestment({
        name: form.name,
        type: form.type,
        ticker: form.ticker || undefined,
        currency: form.currency,
        invested_amount: parseFloat(form.invested_amount),
        current_value: parseFloat(form.current_value),
        quantity: form.quantity ? parseFloat(form.quantity) : undefined,
        commission: parseFloat(form.commission) || 0,
      })
      toast.success('Investment added')
      setForm({ name: '', type: 'Stock', ticker: '', currency: 'USD', invested_amount: '', current_value: '', quantity: '', commission: '0' })
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
              <Input type="number" step="0.01" min="0" placeholder="1000" value={form.invested_amount} onChange={e => set('invested_amount', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Quantity (optional)</Label>
              <Input type="number" step="any" min="0" placeholder="10" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Value</Label>
              <Input type="number" step="0.01" min="0" placeholder="1200" value={form.current_value} onChange={e => set('current_value', e.target.value)} required />
            </div>
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
