"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  changePassword,
  clearAllTransactions,
  createAutomationRule,
  createCategory,
  deleteAccount,
  deleteAutomationRule,
  deleteCategory,
  exportAllData,
  getCategories,
  getMe,
  getUserSettings,
  listAutomationRules,
  logoutAllDevices,
  updateAutomationRule,
  updateCategory,
  updateUserSettings,
} from "@/lib/api"
import type { AutomationRule, Category, TransactionType, UserSettings } from "@/lib/types"

import { CURRENCIES } from "@/lib/currencies"

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function clearAuthCookie() {
  document.cookie = "aku_token=; Path=/; Max-Age=0; SameSite=Lax"
}

export default function SettingsPage() {
  const [meEmail, setMeEmail] = useState<string | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [rules, setRules] = useState<AutomationRule[]>([])

  const [baseCurrency, setBaseCurrency] = useState("PLN")

  const [isSavingCurrency, setIsSavingCurrency] = useState(false)
  const [isBusy, setIsBusy] = useState(false)

  // Password form
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")

  // Category form
  const [catName, setCatName] = useState("")
  const [catType, setCatType] = useState<TransactionType>("expense")
  const [catIcon, setCatIcon] = useState("")
  const [catColor, setCatColor] = useState("#3B82F6")
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)

  // Rule form
  const [ruleName, setRuleName] = useState("")
  const [ruleMatch, setRuleMatch] = useState("")
  const [ruleCategoryId, setRuleCategoryId] = useState<string>("")
  const [ruleEnabled, setRuleEnabled] = useState(true)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)

  // Danger zone
  const [deleteAccountConfirmText, setDeleteAccountConfirmText] = useState("")
  const [clearTxConfirmText, setClearTxConfirmText] = useState("")

  const userCategories = useMemo(
    () => categories.filter((c) => !c.is_default),
    [categories]
  )

  async function refreshAll() {
    const [me, s, cats, rs] = await Promise.all([
      getMe(),
      getUserSettings(),
      getCategories(),
      listAutomationRules(),
    ])
    setMeEmail(me.user.email || null)
    setSettings(s)
    setBaseCurrency(s.base_currency)
    setCategories(cats)
    setRules(rs)
    if (!ruleCategoryId && cats.length) {
      const firstExpense = cats.find((c) => c.type === "expense") || cats[0]
      setRuleCategoryId(firstExpense.id)
    }
  }

  useEffect(() => {
    refreshAll().catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to load settings"))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveCurrency = async () => {
    setIsSavingCurrency(true)
    try {
      const updated = await updateUserSettings({ base_currency: baseCurrency })
      setSettings(updated)
      toast.success("Preferences saved.")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setIsSavingCurrency(false)
    }
  }

  const handleChangePassword = async () => {
    setIsBusy(true)
    try {
      if (newPassword !== repeatPassword) throw new Error("New passwords do not match")
      await changePassword({ current_password: currentPassword, new_password: newPassword })
      setCurrentPassword("")
      setNewPassword("")
      setRepeatPassword("")
      toast.success("Password changed.")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to change password")
    } finally {
      setIsBusy(false)
    }
  }

  const handleLogoutAll = async () => {
    setIsBusy(true)
    try {
      await logoutAllDevices()
      clearAuthCookie()
      window.location.href = "/auth/login"
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to logout")
    } finally {
      setIsBusy(false)
    }
  }

  const startEditCategory = (c: Category) => {
    setEditingCategoryId(c.id)
    setCatName(c.name)
    setCatType(c.type)
    setCatIcon(c.icon || "")
    setCatColor(c.color || "#3B82F6")
  }

  const resetCategoryForm = () => {
    setEditingCategoryId(null)
    setCatName("")
    setCatType("expense")
    setCatIcon("")
    setCatColor("#3B82F6")
  }

  const handleSaveCategory = async () => {
    setIsBusy(true)
    try {
      if (!catName.trim()) throw new Error("Category name is required")
      if (editingCategoryId) {
        await updateCategory(editingCategoryId, {
          name: catName.trim(),
          type: catType,
          icon: catIcon.trim() || null,
          color: catColor || null,
        })
      } else {
        await createCategory({
          name: catName.trim(),
          type: catType,
          icon: catIcon.trim() || undefined,
          color: catColor || undefined,
        })
      }
      await refreshAll()
      resetCategoryForm()
      toast.success("Category saved.")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save category")
    } finally {
      setIsBusy(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm("Delete this category? This will not delete existing transactions.")) return
    setIsBusy(true)
    try {
      await deleteCategory(id)
      await refreshAll()
      toast.success("Category deleted.")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete category")
    } finally {
      setIsBusy(false)
    }
  }

  const startEditRule = (r: AutomationRule) => {
    setEditingRuleId(r.id)
    setRuleName(r.name || "")
    setRuleMatch(r.match_contains)
    setRuleCategoryId(r.category_id)
    setRuleEnabled(Boolean(r.enabled))
  }

  const resetRuleForm = () => {
    setEditingRuleId(null)
    setRuleName("")
    setRuleMatch("")
    setRuleEnabled(true)
  }

  const handleSaveRule = async () => {
    setIsBusy(true)
    try {
      if (!ruleMatch.trim()) throw new Error("Match text is required")
      if (!ruleCategoryId) throw new Error("Category is required")
      if (editingRuleId) {
        await updateAutomationRule(editingRuleId, {
          name: ruleName.trim() || null,
          match_contains: ruleMatch.trim(),
          category_id: ruleCategoryId,
          enabled: ruleEnabled,
        })
      } else {
        await createAutomationRule({
          name: ruleName.trim() || null,
          match_contains: ruleMatch.trim(),
          category_id: ruleCategoryId,
          enabled: ruleEnabled,
        })
      }
      await refreshAll()
      resetRuleForm()
      toast.success("Rule saved.", { description: "It will be used by AI Smart Import." })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save rule")
    } finally {
      setIsBusy(false)
    }
  }

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm("Delete this rule?")) return
    setIsBusy(true)
    try {
      await deleteAutomationRule(id)
      await refreshAll()
      toast.success("Rule deleted.")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete rule")
    } finally {
      setIsBusy(false)
    }
  }

  const handleExport = async () => {
    setIsBusy(true)
    try {
      const payload = await exportAllData()
      downloadJson(`akuwallet-export-${new Date().toISOString().slice(0, 10)}.json`, payload)
      toast.success("Export downloaded", { description: "Your data was saved as JSON." })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to export")
    } finally {
      setIsBusy(false)
    }
  }

  const handleClearTransactions = async () => {
    setIsBusy(true)
    try {
      await clearAllTransactions()
      toast.success("Transactions cleared", { description: "All transactions were deleted." })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to clear transactions")
    } finally {
      setIsBusy(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsBusy(true)
    try {
      await deleteAccount({ confirm: "DELETE" })
      clearAuthCookie()
      window.location.href = "/"
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete account")
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Email</Label>
          <div className="text-sm font-medium">{meEmail || "—"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Finance Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Base Currency</Label>
              <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Net Worth and conversions use this currency.
              </p>
            </div>
          </div>

          <Button onClick={handleSaveCurrency} disabled={isSavingCurrency}>
            {isSavingCurrency ? "Saving..." : "Save preferences"}
          </Button>

          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Categories</h3>
              <p className="text-sm text-muted-foreground">Create, edit colors/icons, delete unused.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-2 md:col-span-2">
                <Label>Name</Label>
                <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder='e.g. "Hobby - LEGO"' />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={catType} onValueChange={(v) => setCatType(v as TransactionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">expense</SelectItem>
                    <SelectItem value="income">income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Input value={catIcon} onChange={(e) => setCatIcon(e.target.value)} placeholder="Lucide name" />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input value={catColor} onChange={(e) => setCatColor(e.target.value)} placeholder="#3B82F6" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleSaveCategory} disabled={isBusy}>
                {editingCategoryId ? "Update category" : "Add category"}
              </Button>
              {editingCategoryId && (
                <Button variant="outline" onClick={resetCategoryForm} disabled={isBusy}>
                  Cancel edit
                </Button>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Icon</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      No custom categories yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  userCategories.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.type}</TableCell>
                      <TableCell>{c.icon || "—"}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ background: c.color || "#999" }} />
                          <span className="text-sm">{c.color || "—"}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => startEditCategory(c)} disabled={isBusy}>
                            Edit
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteCategory(c.id)} disabled={isBusy}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Automation Rules</h3>
              <p className="text-sm text-muted-foreground">
                Used by AI Smart Import to assign categories.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-6">
              <div className="space-y-2 md:col-span-2">
                <Label>Rule name (optional)</Label>
                <Input value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="e.g. Groceries matcher" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>If description contains</Label>
                <Input value={ruleMatch} onChange={(e) => setRuleMatch(e.target.value)} placeholder="e.g. Biedronka" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Assign category</Label>
                <Select value={ruleCategoryId} onValueChange={setRuleCategoryId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSaveRule} disabled={isBusy}>
                {editingRuleId ? "Update rule" : "Add rule"}
              </Button>
              <Button
                variant={ruleEnabled ? "outline" : "secondary"}
                onClick={() => setRuleEnabled((v) => !v)}
                disabled={isBusy}
              >
                {ruleEnabled ? "Enabled" : "Disabled"}
              </Button>
              {editingRuleId && (
                <Button variant="outline" onClick={resetRuleForm} disabled={isBusy}>
                  Cancel edit
                </Button>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      No rules yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.match_contains}</TableCell>
                      <TableCell>{r.category_name || r.category_id}</TableCell>
                      <TableCell>{Boolean(r.enabled) ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => startEditRule(r)} disabled={isBusy}>
                            Edit
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteRule(r.id)} disabled={isBusy}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-1">
              <Label>Current password</Label>
              <Input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type="password" />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label>New password</Label>
              <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label>Repeat new password</Label>
              <Input value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} type="password" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleChangePassword} disabled={isBusy || !currentPassword || !newPassword || !repeatPassword}>
              Change password
            </Button>
            <Button variant="outline" onClick={handleLogoutAll} disabled={isBusy}>
              Sign out from all devices
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={handleExport} disabled={isBusy}>
              Download all data (JSON)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Permanently deletes all transactions.</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isBusy}>
                  Clear all transactions
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all transactions</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all transactions. Type DELETE to confirm.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                  <Label>Type DELETE</Label>
                  <Input
                    value={clearTxConfirmText}
                    onChange={(e) => setClearTxConfirmText(e.target.value)}
                    placeholder="DELETE"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setClearTxConfirmText("")}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={clearTxConfirmText.trim().toUpperCase() !== "DELETE" || isBusy}
                    onClick={async () => {
                      await handleClearTransactions()
                      setClearTxConfirmText("")
                    }}
                  >
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Permanently deletes your account and all data, then signs you out.</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isBusy}>
                  Delete account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete account</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes your data and signs you out. Type DELETE to confirm.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                  <Label>Type DELETE</Label>
                  <Input
                    value={deleteAccountConfirmText}
                    onChange={(e) => setDeleteAccountConfirmText(e.target.value)}
                    placeholder="DELETE"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteAccountConfirmText("")}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={deleteAccountConfirmText.trim().toUpperCase() !== "DELETE" || isBusy}
                    onClick={async () => {
                      await handleDeleteAccount()
                      setDeleteAccountConfirmText("")
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
