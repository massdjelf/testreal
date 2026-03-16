import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "@/components/providers/SessionProvider"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "LandMap - Tactical Real Estate Intelligence",
  description: "Military-style map interface for finding and acquiring land and real estate properties. Filter by location, track bids, and discover opportunities.",
  keywords: ["Real Estate", "Land", "Property", "Map", "Military", "Tactical", "Bidding"],
  authors: [{ name: "LandMap Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "LandMap - Tactical Real Estate Intelligence",
    description: "Find your perfect land and property with military precision",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
