import { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemePanel } from './theme-panel'

export const metadata: Metadata = {
  title: 'Settings | Meridians',
  description: 'Manage your application preferences',
}

export default function SettingsPage() {
  return (
    <div className="container mx-auto max-w-4xl py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences.
        </p>
      </div>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Theme Preferences</CardTitle>
            <CardDescription>
              Customize the appearance of the application. Automatically switches between light and dark themes when system is selected.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemePanel />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
