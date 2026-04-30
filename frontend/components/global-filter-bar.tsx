"use client"

import { useFilters } from "@/lib/contexts/filter-context"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { useEffect, useMemo, useState } from "react"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"

const TIME_PRESETS = [
  { value: "current_month", label: "Current Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "last_year", label: "Last Year" },
  { value: "max", label: "All Time" },
]

type Account = { id: string; name: string; currency: string; balance: number; type: string }

function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/(?:^|;\s*)aku_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function GlobalFilterBar({
  sticky = true,
  className = "",
}: {
  sticky?: boolean
  className?: string
}) {
  const { timeSpan, setTimeSpan, accountIds, setAccountIds, resetFilters } = useFilters()
  const [accounts, setAccounts] = useState<Account[]>([])

  useEffect(() => {
    const token = getTokenFromCookie()
    fetch("/api/accounts", {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => setAccounts([]))
  }, [])

  const selectedLabel = useMemo(() => {
    if (!accounts.length) return "Accounts"
    if (!accountIds.length) return "All Accounts"
    const selected = accounts.filter((a) => accountIds.includes(a.id))
    if (selected.length === 0) return "All Accounts"
    if (selected.length === 1) return selected[0].name
    return `${selected.length} accounts`
  }, [accounts, accountIds])

  return (
    <div
      className={
        sticky
          ? `sticky top-16 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className}`.trim()
          : `rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className}`.trim()
      }
    >
      <div className="flex h-14 items-center gap-4 px-4">
        <Select value={timeSpan} onValueChange={setTimeSpan}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Time Period" />
          </SelectTrigger>
          <SelectContent>
            {TIME_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {selectedLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Accounts</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {accounts.length === 0 ? (
              <div className="px-2 py-2 text-sm text-muted-foreground">No accounts</div>
            ) : (
              accounts.map((a) => {
                const checked = accountIds.length === 0 ? true : accountIds.includes(a.id)
                return (
                  <DropdownMenuCheckboxItem
                    key={a.id}
                    checked={checked}
                    onCheckedChange={(next) => {
                      // accountIds=[] means "all"; once user changes anything, we switch to explicit list
                      const current = accountIds.length === 0 ? accounts.map((x) => x.id) : accountIds
                      const set = new Set(current)
                      if (next) set.add(a.id)
                      else set.delete(a.id)
                      const nextIds = Array.from(set)
                      // if user ended up selecting all, store as [] (all)
                      setAccountIds(nextIds.length === accounts.length ? [] : nextIds)
                    }}
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="truncate">{a.name}</span>
                      <span className="text-xs text-muted-foreground">{a.currency}</span>
                    </div>
                  </DropdownMenuCheckboxItem>
                )
              })
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" onClick={resetFilters}>
          Reset Filters
        </Button>
      </div>
    </div>
  )
}
