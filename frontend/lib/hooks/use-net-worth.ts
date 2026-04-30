import { useEffect, useState } from "react"

interface NetWorthData {
  total_net_worth: number
  base_currency: string
  currency_breakdown: Record<string, number>
}

export function useNetWorth() {
  const [data, setData] = useState<NetWorthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchNetWorth = async () => {
      try {
        const response = await fetch("/api/networth", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        if (!response.ok) throw new Error("Failed to fetch net worth")
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchNetWorth()
  }, [])

  return { data, loading, error }
}
