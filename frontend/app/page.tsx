import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Wallet, 
  TrendingUp, 
  Target, 
  Sparkles, 
  ArrowRight,
  PieChart,
  Upload,
  RefreshCw 
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold text-foreground">Wallet</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Take control of your finances with AI-powered insights
            </h1>
            <p className="mt-6 text-pretty text-lg text-muted-foreground sm:text-xl">
              Track expenses, manage income, set financial goals, and let AI help categorize 
              your transactions. Your personal finance manager, reimagined.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/auth/sign-up">
                  Start for free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/auth/login">Sign in to your account</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-muted/30 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-semibold text-foreground sm:text-3xl">
              Everything you need to manage your money
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold text-card-foreground">Track Transactions</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Log income and expenses with custom categories and tags for detailed tracking.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold text-card-foreground">AI Suggestions</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Let AI automatically suggest categories based on your transaction descriptions.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold text-card-foreground">Financial Goals</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Set savings goals with deadlines and track your progress towards achieving them.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <PieChart className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold text-card-foreground">Visual Dashboard</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    See your spending patterns with beautiful charts and insightful analytics.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold text-card-foreground">Import Data</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Import transactions from CSV or JSON files to quickly populate your history.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <RefreshCw className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold text-card-foreground">Recurring Transactions</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Set up automatic entries for subscriptions, salary, and regular bills.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Ready to take control?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Join thousands of users who have transformed their financial habits with Wallet.
            </p>
            <Button size="lg" className="mt-8" asChild>
              <Link href="/auth/sign-up">
                Create your free account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-6xl text-center text-sm text-muted-foreground">
          <p>Built with care for your financial wellbeing.</p>
        </div>
      </footer>
    </div>
  )
}
