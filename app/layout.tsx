import type { Metadata } from 'next'
import '@/app/globals.css'

export const metadata: Metadata = {
  title: 'Admin Dashboard | Divija Old Age Home',
  description: 'Donations management dashboard for Divija Old Age Home',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased dark:bg-gray-950">
        {children}
      </body>
    </html>
  )
}