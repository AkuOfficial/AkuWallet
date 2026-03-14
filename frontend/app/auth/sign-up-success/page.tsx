import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Thank you for signing up!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your account has been created. You can now sign in.
              </p>
              <Button asChild className="w-full">
                <Link href="/auth/login">Sign in now</Link>
              </Button>
              <div className="text-center text-sm">
                <Link href="/" className="underline underline-offset-4 text-muted-foreground">Back to home</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
