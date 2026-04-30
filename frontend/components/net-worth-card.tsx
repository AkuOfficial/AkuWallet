import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { TrendingUp } from "lucide-react"
import { cookies } from "next/headers"

interface NetWorthData {
  total_net_worth: number
  base_currency: string
  currency_breakdown: Record<string, number>
  currency_breakdown_in_base: Record<string, number>
}

export async function NetWorthCard() {
  const token = (await cookies()).get("aku_token")?.value
  if (!token) return null

  const resp = await fetch(`${process.env.BACKEND_URL || "http://localhost:8000"}/networth`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (!resp.ok) return null

  const data = (await resp.json()) as NetWorthData

  if (!data) return null

  const otherCurrencies = Object.entries(data.currency_breakdown ?? {})
    .filter(([currency]) => currency !== data.base_currency)
    .slice(0, 3)

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Total Net Worth
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-3">
          <div className="text-4xl font-bold">
            {data.total_net_worth?.toLocaleString() ?? 0}
          </div>
          <Badge variant="outline" className="text-lg font-semibold px-3 py-1">
            {data.base_currency ?? 'USD'}
          </Badge>
        </div>
        
        {otherCurrencies.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Currency Breakdown</p>
            <div className="flex flex-wrap gap-3">
              {otherCurrencies.map(([currency, amount]) => (
                <div key={currency} className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2">
                  <span className="font-medium">{currency}:</span>
                  <span className="font-semibold">{amount.toLocaleString()}</span>
                  <span className="text-muted-foreground">({(data.currency_breakdown_in_base?.[currency] ?? 0).toLocaleString()} {data.base_currency})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
