"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Wallet } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { CURRENCIES } from "@/lib/currencies"

interface Account {
  id: string
  name: string
  type: string
  currency: string
  balance: number
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<Account | null>(null)
  const [transferTo, setTransferTo] = useState("")
  const [form, setForm] = useState({ name: "", type: "Checking", currency: "USD", balance: "0" })
  const normalizedName = form.name.trim().toLowerCase()
  const nameExists = normalizedName.length > 0 && accounts.some(a => a.name.trim().toLowerCase() === normalizedName && a.id !== selected?.id)

  const load = () => {
    fetch("/api/accounts", {
      headers: { Authorization: `Bearer ${document.cookie.match(/(?:^|;\s*)aku_token=([^;]+)/)?.[1] || ""}` },
    })
      .then((r) => r.json())
      .then((data) => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => setAccounts([]))
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    fetch("/api/settings", { headers: { Authorization: `Bearer ${document.cookie.match(/(?:^|;\s*)aku_token=([^;]+)/)?.[1] || ""}` } })
      .then(r => r.json())
      .then(s => setForm(f => ({ ...f, currency: s?.base_currency || "USD" })))
      .catch(() => {})
  }, [])

  const addAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nameExists) {
      toast.error("Account with this name already exists")
      return
    }
    try {
      const token = document.cookie.match(/(?:^|;\s*)aku_token=([^;]+)/)?.[1] || ""
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          currency: form.currency,
          balance: parseFloat(form.balance) || 0,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || "Failed to create account")
      }
      toast.success("Account added")
      setOpen(false)
      setForm({ name: "", type: "Checking", currency: form.currency || "USD", balance: "0" })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create account")
    }
  }
  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    if (nameExists) {
      toast.error("Account with this name already exists")
      return
    }
    const token = document.cookie.match(/(?:^|;\s*)aku_token=([^;]+)/)?.[1] || ""
    const res = await fetch(`/api/accounts/${selected.id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, type: form.type, currency: form.currency, balance: parseFloat(form.balance) || 0 }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return toast.error(err?.detail || "Failed to update account")
    }
    toast.success("Account updated")
    setEditOpen(false); setSelected(null); load()
  }
  const removeAccount = async () => {
    if (!selected || !transferTo) return
    const token = document.cookie.match(/(?:^|;\s*)aku_token=([^;]+)/)?.[1] || ""
    const res = await fetch(`/api/accounts/${selected.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ transfer_to_account_id: transferTo }),
    })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      return toast.error(e.detail || "Failed to delete account")
    }
    toast.success("Account deleted")
    setDeleteOpen(false); setSelected(null); setTransferTo(""); load()
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Accounts</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Account</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Add Account</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={addAccount}>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={nameExists ? "border-red-500 focus-visible:ring-red-500" : ""}
                  required
                />
                {nameExists ? <p className="text-xs text-red-600">Account with this name already exists.</p> : null}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Checking">Checking</SelectItem>
                      <SelectItem value="Savings">Savings</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Balance</Label><Input type="number" step="0.01" value={form.balance} onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))} /></div>
              <div className="flex justify-end"><Button type="submit" disabled={nameExists}>Save</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <Card key={account.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                {account.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {account.balance.toLocaleString()} {account.currency}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{account.type}</div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setSelected(account); setForm({ name: account.name, type: account.type, currency: account.currency, balance: String(account.balance) }); setEditOpen(true) }}>Edit</Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={accounts.length <= 1}
                  onClick={() => { setSelected(account); setDeleteOpen(true) }}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={saveEdit}>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={nameExists ? "border-red-500 focus-visible:ring-red-500" : ""}
                required
              />
              {nameExists ? <p className="text-xs text-red-600">Account with this name already exists.</p> : null}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label><Input value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Currency</Label><Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Balance</Label><Input type="number" step="0.01" value={form.balance} onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))} /></div>
            <div className="flex justify-end"><Button type="submit" disabled={nameExists}>Save</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Delete Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">Select account to transfer all related operations before deletion.</div>
            <Select value={transferTo} onValueChange={setTransferTo}>
              <SelectTrigger><SelectValue placeholder="Transfer to account" /></SelectTrigger>
              <SelectContent>
                {accounts.filter(a => a.id !== selected?.id).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex justify-end"><Button variant="destructive" onClick={removeAccount} disabled={!transferTo}>Delete</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
