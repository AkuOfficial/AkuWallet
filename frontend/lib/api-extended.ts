export async function getAccounts() {
  const token = localStorage.getItem("token")
  const response = await fetch("/api/accounts", {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.json()
}

export async function createAccount(data: {
  name: string
  type: string
  currency: string
  balance: number
}) {
  const token = localStorage.getItem("token")
  const response = await fetch("/api/accounts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
  return response.json()
}

export async function getInvestments() {
  const token = localStorage.getItem("token")
  const response = await fetch("/api/investments", {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.json()
}

export async function createInvestment(data: {
  name: string
  type: string
  ticker?: string
  currency: string
  invested_amount: number
  current_value: number
  quantity?: number
  is_automated: boolean
}) {
  const token = localStorage.getItem("token")
  const response = await fetch("/api/investments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
  return response.json()
}

export async function getNetWorth() {
  const token = localStorage.getItem("token")
  const response = await fetch("/api/networth", {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.json()
}

export async function getUserSettings() {
  const token = localStorage.getItem("token")
  const response = await fetch("/api/settings", {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.json()
}

export async function updateUserSettings(data: {
  base_currency: string
}) {
  const token = localStorage.getItem("token")
  const response = await fetch("/api/settings", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
  return response.json()
}
