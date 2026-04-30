"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"

interface FilterState {
  timeSpan: string
  accountIds: string[]
  categoryIds: string[]
}

interface FilterContextType extends FilterState {
  setTimeSpan: (span: string) => void
  setAccountIds: (ids: string[]) => void
  setCategoryIds: (ids: string[]) => void
  resetFilters: () => void
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export function FilterProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [filters, setFilters] = useState<FilterState>({
    timeSpan: searchParams.get("timeSpan") || "current_month",
    accountIds: searchParams.get("accounts")?.split(",").filter(Boolean) || [],
    categoryIds: searchParams.get("categories")?.split(",").filter(Boolean) || [],
  })

  const updateURL = (newFilters: FilterState) => {
    const params = new URLSearchParams()
    if (newFilters.timeSpan) params.set("timeSpan", newFilters.timeSpan)
    if (newFilters.accountIds.length) params.set("accounts", newFilters.accountIds.join(","))
    if (newFilters.categoryIds.length) params.set("categories", newFilters.categoryIds.join(","))
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const setTimeSpan = (span: string) => {
    const newFilters = { ...filters, timeSpan: span }
    setFilters(newFilters)
    updateURL(newFilters)
  }

  const setAccountIds = (ids: string[]) => {
    const newFilters = { ...filters, accountIds: ids }
    setFilters(newFilters)
    updateURL(newFilters)
  }

  const setCategoryIds = (ids: string[]) => {
    const newFilters = { ...filters, categoryIds: ids }
    setFilters(newFilters)
    updateURL(newFilters)
  }

  const resetFilters = () => {
    const newFilters: FilterState = {
      timeSpan: "current_month",
      accountIds: [],
      categoryIds: [],
    }
    setFilters(newFilters)
    updateURL(newFilters)
  }

  return (
    <FilterContext.Provider
      value={{ ...filters, setTimeSpan, setAccountIds, setCategoryIds, resetFilters }}
    >
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  const context = useContext(FilterContext)
  if (!context) throw new Error("useFilters must be used within FilterProvider")
  return context
}
