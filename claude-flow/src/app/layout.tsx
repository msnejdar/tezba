import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/providers/LanguageProvider'
import { SearchProvider } from '@/providers/SearchProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EuroSnapper Search',
  description: 'Advanced Czech/English knowledge search with AI-powered recommendations',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${inter.className} h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden`}>
        <LanguageProvider>
          <SearchProvider>
            <div className="h-full relative">
              {/* Glass background effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-indigo-900/20 backdrop-blur-3xl" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent" />
              
              {/* Main content */}
              <div className="relative z-10 h-full">
                {children}
              </div>
            </div>
          </SearchProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}