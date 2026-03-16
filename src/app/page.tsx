"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Map,
  Building2,
  Shield,
  Menu,
  LogOut,
  Search,
  TrendingUp,
  ChevronRight,
  Crown,
  Layers,
  AlertTriangle,
  Lock,
  Sparkles,
  X,
  MessageCircle,
} from "lucide-react"
import { AuthModal } from "@/components/auth/AuthModal"
import { FilterPanel } from "@/components/layout/FilterPanel"
import { PropertyCard } from "@/components/property/PropertyCard"
import { PropertyDetail } from "@/components/property/PropertyDetail"
import { AdminPanel } from "@/components/admin/AdminPanel"
import { VendorPanel } from "@/components/vendor/VendorPanel"
import { Property } from "@/types"
import { useToast } from "@/hooks/use-toast"

// Dynamically import the map component with no SSR
const PropertyMap = dynamic(
  () => import("@/components/map/PropertyMap").then((mod) => mod.PropertyMap),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center text-muted-foreground">Loading map...</div>,
  }
)

type ViewType = "landing" | "map" | "property" | "admin" | "vendor"

// US States with coordinates for SEO and navigation
const US_STATES: Record<string, { coords: [number, number]; zoom: number }> = {
  "California": { coords: [36.7783, -119.4179], zoom: 7 },
  "Texas": { coords: [31.9686, -99.9018], zoom: 6 },
  "Florida": { coords: [27.6648, -81.5158], zoom: 7 },
  "New York": { coords: [40.7128, -74.006], zoom: 8 },
  "Colorado": { coords: [39.5501, -105.7821], zoom: 7 },
  "Arizona": { coords: [34.0489, -111.0937], zoom: 7 },
  "Nevada": { coords: [39.8283, -116.6314], zoom: 7 },
  "Washington": { coords: [47.7511, -120.7401], zoom: 7 },
  "Oregon": { coords: [43.8041, -120.5542], zoom: 7 },
}

// Free user limit
const FREE_USER_PROPERTY_LIMIT = 10

export default function HomePage() {
  const { data: session, status } = useSession()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentView, setCurrentView] = useState<ViewType>("landing")
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState({ lat: 39.8283, lng: -98.5795 })
  const [mapZoom, setMapZoom] = useState(4)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [viewedCount, setViewedCount] = useState(0)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [activeLayer, setActiveLayer] = useState<string | null>(null)
  const { toast } = useToast()
  
  // Use ref to prevent infinite loops
  const hasFetchedInitial = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Check if user is premium
  const isPremium = session?.user?.role === "PREMIUM_USER" ||
                    session?.user?.role === "PREMIUM_VENDOR" ||
                    session?.user?.role === "ADMIN"

  const requireAuthentication = useCallback((context: string) => {
    if (session) {
      return true
    }

    setShowAuthModal(true)
    toast({
      title: "Sign in required",
      description: `Please sign in to ${context}.`,
      variant: "destructive",
    })

    return false
  }, [session, toast])

  // Fetch properties with proper cleanup and debouncing
  const fetchProperties = useCallback(async (bounds?: { north: number; south: number; east: number; west: number }, region?: string) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setLoading(true)
    try {
      const params = new URLSearchParams()

      if (region) {
        params.append("state", region)
      }

      if (bounds) {
        params.append("north", bounds.north.toString())
        params.append("south", bounds.south.toString())
        params.append("east", bounds.east.toString())
        params.append("west", bounds.west.toString())
      }

      const response = await fetch(`/api/properties?${params.toString()}`, {
        signal: abortControllerRef.current.signal
      })
      
      if (response.ok) {
        const data = await response.json()
        setProperties(data)
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error("Failed to fetch properties:", error)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Only fetch when view changes to map - with guard against infinite loops
  useEffect(() => {
    if (currentView === "map" && !hasFetchedInitial.current) {
      hasFetchedInitial.current = true
      fetchProperties()
    }
  }, [currentView, fetchProperties])

  // Reset fetch flag when leaving map view
  useEffect(() => {
    if (currentView !== "map") {
      hasFetchedInitial.current = false
    }
  }, [currentView])

  // Guard protected views for unauthenticated users
  useEffect(() => {
    if (status === "loading") {
      return
    }

    if (!session && currentView !== "landing") {
      setCurrentView("landing")
      setSelectedPropertyId(null)
      setSidebarOpen(false)
    }
  }, [currentView, session, status])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const handleMapMove = useCallback(
    (center: { lat: number; lng: number }, zoom: number, bounds: { north: number; south: number; east: number; west: number }) => {
      setMapCenter(center)
      setMapZoom(zoom)
      // Only fetch when zoomed in enough (performance optimization)
      if (zoom >= 6) {
        fetchProperties(bounds, selectedRegion || undefined)
      }
    },
    [fetchProperties, selectedRegion]
  )

  const handlePropertyClick = (property: Property) => {
    // Check view limit for non-premium users
    if (!isPremium && viewedCount >= FREE_USER_PROPERTY_LIMIT) {
      setShowLimitModal(true)
      return
    }

    setViewedCount(prev => prev + 1)
    setSelectedPropertyId(property.id)
    setCurrentView("property")
  }

  const handleSearch = (query: string) => {
    if (!requireAuthentication("search properties on the map")) {
      return
    }

    const normalizedQuery = query.toLowerCase().trim()

    // Find matching state
    for (const [state, data] of Object.entries(US_STATES)) {
      if (normalizedQuery.includes(state.toLowerCase()) || state.toLowerCase().includes(normalizedQuery)) {
        setMapCenter({ lat: data.coords[0], lng: data.coords[1] })
        setMapZoom(data.zoom)
        setSelectedRegion(state)
        setCurrentView("map")
        hasFetchedInitial.current = false
        return
      }
    }

    // Default search
    setCurrentView("map")
    hasFetchedInitial.current = false
  }

  const handleRegionSelect = (region: string) => {
    if (!requireAuthentication("browse properties by region")) {
      return
    }

    const data = US_STATES[region]
    if (data) {
      setMapCenter({ lat: data.coords[0], lng: data.coords[1] })
      setMapZoom(data.zoom)
      setSelectedRegion(region)
      setCurrentView("map")
      hasFetchedInitial.current = false
    }
  }

  const handleLogout = async () => {
    await signOut({ redirect: false })
    setCurrentView("landing")
    setViewedCount(0)
  }

  const handleBackToMap = () => {
    setCurrentView("map")
    setSelectedPropertyId(null)
  }

  // Landing Page
  if (currentView === "landing") {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Premium Feature Banner */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 px-4 text-center text-sm">
          <Sparkles className="w-4 h-4 inline mr-2" />
          <span className="font-medium">NEW: Premium Layer Analysis</span>
          <span className="mx-2">•</span>
          <span>Check soil quality, crime rates & more for any property</span>
          <Button 
            variant="link" 
            className="text-white underline ml-2 p-0 h-auto"
            onClick={() => setShowPremiumModal(true)}
          >
            Learn More →
          </Button>
        </div>

        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <Map className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">LandMap</span>
              <Badge variant="outline" className="ml-2 text-xs border-amber-500 text-amber-400">
                BETA
              </Badge>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-slate-300 hover:text-white transition-colors">
                Features
              </a>
              <a href="#regions" className="text-slate-300 hover:text-white transition-colors">
                Browse by Region
              </a>
              <button 
                onClick={() => setShowPremiumModal(true)}
                className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
              >
                <Crown className="w-4 h-4" />
                Premium
              </button>
            </nav>

            <div className="flex items-center gap-3">
              {session ? (
                <>
                  <Button
                    variant="ghost"
                    className="text-slate-300 hover:text-white"
                    onClick={() => {
                      setCurrentView("map")
                      hasFetchedInitial.current = false
                    }}
                  >
                    Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-600 text-white hover:bg-slate-700"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="text-slate-300 hover:text-white"
                    onClick={() => setShowAuthModal(true)}
                  >
                    Sign In
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
                    onClick={() => setShowAuthModal(true)}
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1">
          <section className="container mx-auto px-4 py-20 md:py-32">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-6 bg-red-500/20 text-red-400 border-red-500/30">
                <TrendingUp className="w-3 h-3 mr-1" />
                Military-Style Real Estate Intelligence
              </Badge>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                Find Your Perfect
                <span className="block bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                  Land & Property
                </span>
              </h1>

              <p className="text-lg md:text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
                Navigate the real estate market like never before with our tactical map interface.
                Filter by location, track bids, and discover properties with military precision.
              </p>

              {/* Premium Feature Highlight */}
              <Card className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30 mb-8">
                <CardContent className="p-4 flex items-center gap-4 justify-center">
                  <div className="w-12 h-12 rounded-full bg-amber-500/30 flex items-center justify-center">
                    <Layers className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold flex items-center gap-2">
                      New: Multi-Layer Property Analysis
                      <Badge className="bg-amber-500 text-white text-xs">PREMIUM</Badge>
                    </div>
                    <div className="text-slate-300 text-sm">
                      Check soil quality, crime rates, flood zones & more for any property
                    </div>
                  </div>
                  <Button 
                    className="bg-amber-500 hover:bg-amber-600 text-white ml-4"
                    onClick={() => setShowPremiumModal(true)}
                  >
                    Try Now
                  </Button>
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white text-lg px-8"
                  onClick={() => {
                    if (session) {
                      setCurrentView("map")
                      hasFetchedInitial.current = false
                    } else {
                      setShowAuthModal(true)
                    }
                  }}
                >
                  <Map className="w-5 h-5 mr-2" />
                  Explore Map
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-600 text-white hover:bg-slate-700 text-lg px-8"
                  onClick={() => setShowPremiumModal(true)}
                >
                  <Crown className="w-5 h-5 mr-2 text-amber-400" />
                  View Premium Features
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
                <div>
                  <div className="text-3xl md:text-4xl font-bold text-white">10K+</div>
                  <div className="text-slate-400">Properties</div>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-bold text-white">50+</div>
                  <div className="text-slate-400">States</div>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-bold text-white">$2B+</div>
                  <div className="text-slate-400">Listed Value</div>
                </div>
              </div>
            </div>
          </section>

          {/* Browse by Region Section */}
          <section id="regions" className="py-20 bg-slate-800/50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Browse by Region
                </h2>
                <p className="text-slate-400 max-w-2xl mx-auto">
                  Select a state to explore properties. Our region-based navigation ensures fast loading times.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
                {Object.entries(US_STATES).map(([state, data]) => (
                  <Card 
                    key={state}
                    className="bg-slate-800/50 border-slate-700 hover:border-red-500/50 transition-all cursor-pointer hover:scale-105"
                    onClick={() => handleRegionSelect(state)}
                  >
                    <CardContent className="p-4 text-center">
                      <Map className="w-8 h-8 text-red-400 mx-auto mb-2" />
                      <div className="font-medium text-white">{state}</div>
                      <div className="text-xs text-slate-400 mt-1">{session ? "Click to explore" : "Sign in to explore"}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="features" className="py-20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Powerful Features
                </h2>
                <p className="text-slate-400 max-w-2xl mx-auto">
                  Everything you need to find, analyze, and acquire the perfect property
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <Card className="bg-slate-800/50 border-slate-700 hover:border-red-500/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center mb-4">
                      <Map className="w-6 h-6 text-red-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Tactical Map View
                    </h3>
                    <p className="text-slate-400">
                      Navigate properties with our military-style map interface.
                      Color-coded markers show status at a glance.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700 hover:border-orange-500/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center mb-4">
                      <TrendingUp className="w-6 h-6 text-orange-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Live Bidding
                    </h3>
                    <p className="text-slate-400">
                      Participate in real-time property auctions.
                      Track bids and stay informed on market activity.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700 hover:border-amber-500/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center mb-4">
                      <Layers className="w-6 h-6 text-amber-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Multi-Layer Analysis
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-amber-500 text-white text-xs">PREMIUM</Badge>
                    </div>
                    <p className="text-slate-400">
                      Check soil quality, crime rates, flood zones & environmental data.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700 hover:border-green-500/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
                      <Building2 className="w-6 h-6 text-green-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Partition Buying
                    </h3>
                    <p className="text-slate-400">
                      Buy a portion of large properties. Clear boundary visualization
                      helps you understand exactly what you're purchasing.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                      <Shield className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Verified Listings
                    </h3>
                    <p className="text-slate-400">
                      All properties are verified by our team. Document verification
                      ensures accurate boundaries and legal compliance.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                      <Crown className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Premium Benefits
                    </h3>
                    <p className="text-slate-400">
                      Unlimited property views, advanced analytics, priority support
                      and exclusive pre-market listings.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Status Legend */}
          <section className="py-20 bg-slate-800/50">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                  Property Status at a Glance
                </h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-4 h-4 rounded-full bg-red-500" />
                      <div>
                        <div className="font-semibold text-white">Available</div>
                        <div className="text-sm text-slate-400">Ready to buy</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-4 h-4 rounded-full bg-gray-500" />
                      <div>
                        <div className="font-semibold text-white">Bidding</div>
                        <div className="text-sm text-slate-400">Active auction</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-4 h-4 rounded-full bg-green-500" />
                      <div>
                        <div className="font-semibold text-white">Sold</div>
                        <div className="text-sm text-slate-400">Transaction complete</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-700/50 bg-slate-900/80 py-8">
          <div className="container mx-auto px-4 text-center text-slate-400">
            <p>© 2024 LandMap. All rights reserved.</p>
          </div>
        </footer>

        <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} onSuccess={() => {
          setCurrentView("map")
          hasFetchedInitial.current = false
        }} />
        
        {/* Premium Modal */}
        <Dialog open={showPremiumModal} onOpenChange={setShowPremiumModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Upgrade to Premium
              </DialogTitle>
              <DialogDescription>
                Unlock powerful features for smarter property decisions
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5 text-amber-500" />
                  <div>
                    <div className="font-medium">Multi-Layer Analysis</div>
                    <div className="text-sm text-muted-foreground">Soil quality, crime rates, flood zones</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-amber-500" />
                  <div>
                    <div className="font-medium">Unlimited Property Views</div>
                    <div className="text-sm text-muted-foreground">No daily limits on property access</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                  <div>
                    <div className="font-medium">Advanced Analytics</div>
                    <div className="text-sm text-muted-foreground">Market trends and price predictions</div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold">$9.99<span className="text-base font-normal text-muted-foreground">/month</span></div>
              </div>

              <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade Now
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Map View
  if (currentView === "map") {
    return (
      <div className="h-screen flex flex-col">
        {/* Top Navigation */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
          <div className="h-14 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <div className="py-4 space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                        <Map className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xl font-bold">LandMap</span>
                    </div>

                    {/* Premium Banner in Sidebar */}
                    {!isPremium && (
                      <Card className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30 mx-2">
                        <CardContent className="p-3">
                          <div className="text-sm font-medium flex items-center gap-2">
                            <Crown className="w-4 h-4 text-amber-500" />
                            Upgrade to Premium
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Unlimited views + layer analysis
                          </div>
                          <Button size="sm" className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-white">
                            Upgrade
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    <div className="space-y-1 pt-4">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          handleBackToMap()
                          setSidebarOpen(false)
                        }}
                      >
                        <Map className="w-4 h-4 mr-2" />
                        Map View
                      </Button>
                      {(session?.user?.role === "VENDOR" || session?.user?.role === "PREMIUM_VENDOR") && (
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => {
                            setCurrentView("vendor")
                            setSidebarOpen(false)
                          }}
                        >
                          <Building2 className="w-4 h-4 mr-2" />
                          My Properties
                        </Button>
                      )}
                      {session?.user?.role === "ADMIN" && (
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => {
                            setCurrentView("admin")
                            setSidebarOpen(false)
                          }}
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Admin Panel
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          toast({
                            title: "Contact Us",
                            description: "Email: support@landmap.com | Phone: 1-800-LANDMAP",
                          })
                        }}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Contact
                      </Button>
                    </div>

                    {/* Region Quick Access */}
                    <div className="pt-4 border-t">
                      <div className="text-xs font-medium text-muted-foreground px-2 mb-2">QUICK ACCESS</div>
                      <div className="space-y-1">
                        {Object.entries(US_STATES).slice(0, 5).map(([state]) => (
                          <Button
                            key={state}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-sm"
                            onClick={() => {
                              handleRegionSelect(state)
                              setSidebarOpen(false)
                            }}
                          >
                            {state}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                  <Map className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold hidden sm:inline">LandMap</span>
                {selectedRegion && (
                  <Badge variant="outline" className="ml-2">
                    {selectedRegion}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-4 w-4 ml-1"
                      onClick={() => {
                        setSelectedRegion(null)
                        setMapCenter({ lat: 39.8283, lng: -98.5795 })
                        setMapZoom(4)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Layer Toggle Button */}
              <Button
                variant="outline"
                size="sm"
                className={`gap-2 ${isPremium ? '' : 'opacity-50'}`}
                onClick={() => isPremium ? setShowLayerPanel(!showLayerPanel) : setShowPremiumModal(true)}
              >
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">Layers</span>
                {!isPremium && <Lock className="w-3 h-3" />}
              </Button>

              {/* View Counter for Free Users */}
              {!isPremium && (
                <Badge variant="outline" className="text-xs">
                  {viewedCount}/{FREE_USER_PROPERTY_LIMIT} views
                </Badge>
              )}

              {(session?.user?.role === "VENDOR" || session?.user?.role === "PREMIUM_VENDOR") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentView("vendor")}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Vendor
                </Button>
              )}
              {session?.user?.role === "ADMIN" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentView("admin")}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Filters & Property List */}
          <div className="w-full md:w-96 border-r flex flex-col bg-background">
            <div className="p-4 border-b">
              <FilterPanel
                onSearch={handleSearch}
                onFilterChange={() => {
                  hasFetchedInitial.current = false
                  fetchProperties()
                }}
                onReset={() => {
                  hasFetchedInitial.current = false
                  fetchProperties()
                }}
                propertyCount={properties.length}
              />
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <div className="h-48 bg-muted rounded-t-lg" />
                        <CardContent className="p-4">
                          <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : properties.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium">No properties found</p>
                      <p className="text-muted-foreground text-sm">
                        Try adjusting your search or zoom in on the map
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  properties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      onClick={() => handlePropertyClick(property)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Map */}
          <div className="hidden md:block flex-1 relative">
            <PropertyMap
              properties={properties}
              onPropertyClick={handlePropertyClick}
              center={mapCenter}
              zoom={mapZoom}
              onMapMove={handleMapMove}
              onZoomChange={setMapZoom}
              showBoundaries={true}
              activeLayer={activeLayer}
            />

            {/* Layer Panel Overlay */}
            {showLayerPanel && isPremium && (
              <Card className="absolute top-4 right-4 w-64 z-[1000]">
                <CardContent className="p-4">
                  <div className="font-semibold mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Map Layers
                  </div>
                  <div className="space-y-2">
                    {['Satellite', 'Land Types', 'Topographic'].map((layer) => (
                      <label key={layer} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="mapLayer"
                          checked={activeLayer === layer}
                          onChange={() => setActiveLayer(activeLayer === layer ? null : layer)}
                          className="accent-primary"
                        />
                        <span className="text-sm">{layer}</span>
                      </label>
                    ))}
                  </div>
                  {activeLayer && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-2 text-xs"
                      onClick={() => setActiveLayer(null)}
                    >
                      Clear Layer
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* View Limit Modal */}
        <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                Daily Limit Reached
              </DialogTitle>
              <DialogDescription>
                You've viewed {FREE_USER_PROPERTY_LIMIT} properties today
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Free users can view up to {FREE_USER_PROPERTY_LIMIT} properties per day. 
                Upgrade to Premium for unlimited property access and advanced features.
              </p>
              
              <div className="bg-muted rounded-lg p-4">
                <div className="font-medium mb-2">Premium Benefits:</div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Unlimited property views</li>
                  <li>• Multi-layer analysis (soil, crime, flood)</li>
                  <li>• Advanced search filters</li>
                  <li>• Priority customer support</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowLimitModal(false)}
                >
                  Maybe Later
                </Button>
                <Button 
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                  onClick={() => {
                    setShowLimitModal(false)
                    setShowPremiumModal(true)
                  }}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Property Detail View
  if (currentView === "property" && selectedPropertyId) {
    return (
      <div className="h-screen flex flex-col">
        <PropertyDetail
          propertyId={selectedPropertyId}
          userId={session?.user?.id || null}
          userRole={session?.user?.role || "USER"}
          onBack={handleBackToMap}
          isPremium={isPremium}
        />
      </div>
    )
  }

  // Admin Panel View
  if (currentView === "admin" && session?.user?.role === "ADMIN") {
    return (
      <div className="h-screen flex flex-col">
        <AdminPanel userId={session.user.id} onBack={handleBackToMap} />
      </div>
    )
  }

  // Vendor Panel View
  if (currentView === "vendor" && (session?.user?.role === "VENDOR" || session?.user?.role === "PREMIUM_VENDOR")) {
    return (
      <div className="h-screen flex flex-col">
        <VendorPanel userId={session.user.id} onBack={handleBackToMap} />
      </div>
    )
  }

  // Fallback - redirect to landing
  return null
}
