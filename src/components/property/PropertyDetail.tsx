"use client"

import { useState, useEffect } from "react"
import { Property, Bid } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  MapPin,
  AreaChart,
  DollarSign,
  Bed,
  Bath,
  Calendar,
  User,
  Phone,
  ArrowLeft,
  Clock,
  TrendingUp,
  FileText,
  CheckCircle,
  XCircle,
  Crown,
  Layers,
  Lock,
  Scissors,
  AlertTriangle,
  ChevronRight,
  Pencil,
  Zap,
  MessageCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import dynamic from "next/dynamic"

// Dynamically import the partition drawing map component
const PartitionDrawingMap = dynamic(
  () => import("@/components/map/PartitionDrawingMap").then((mod) => mod.PartitionDrawingMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
        <div className="text-muted-foreground">Loading map...</div>
      </div>
    ),
  }
)

interface PropertyDetailProps {
  propertyId: string
  userId: string | null
  userRole: string
  onBack: () => void
  isPremium?: boolean
}

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-red-500",
  SOLD: "bg-green-500",
  BIDDING: "bg-gray-500",
  PENDING: "bg-orange-500",
}

const statusLabels: Record<string, string> = {
  AVAILABLE: "Available for Purchase",
  SOLD: "Sold",
  BIDDING: "Currently in Bidding",
  PENDING: "Pending Verification",
}

const typeLabels: Record<string, string> = {
  LAND: "Land",
  HOUSE: "House",
  APARTMENT: "Apartment",
  COMMERCIAL: "Commercial",
  INDUSTRIAL: "Industrial",
}

export function PropertyDetail({ propertyId, userId, userRole, onBack, isPremium = false }: PropertyDetailProps) {
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [bidAmount, setBidAmount] = useState("")
  const [bidMessage, setBidMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showPartitionModal, setShowPartitionModal] = useState(false)
  const [partitionSize, setPartitionSize] = useState("")
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [partitionDrawingMode, setPartitionDrawingMode] = useState(false)
  const [partitionPoints, setPartitionPoints] = useState<[number, number][]>([])
  const [calculatedPartitionArea, setCalculatedPartitionArea] = useState(0)
  const [showInstantBuyConfirm, setShowInstantBuyConfirm] = useState(false)
  const [imageError, setImageError] = useState(false)
  const { toast } = useToast()
  
  const MIN_PARTITION_SIZE = 100 // 100m² minimum

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await fetch(`/api/properties/${propertyId}`)
        if (response.ok) {
          const data = await response.json()
          setProperty(data)
        }
      } catch (error) {
        console.error("Failed to fetch property:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProperty()
  }, [propertyId])

  const handlePlaceBid = async (partitionData?: { size: number }) => {
    if (!userId) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to place a bid",
        variant: "destructive",
      })
      return
    }

    const amount = partitionData 
      ? parseFloat(bidAmount) || (property!.pricePerSqm * partitionData.size)
      : parseFloat(bidAmount)

    if (!amount || amount <= 0) {
      toast({
        title: "Invalid bid amount",
        description: "Please enter a valid bid amount",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          userId,
          amount: amount,
          message: bidMessage,
          partitionSize: partitionData?.size,
        }),
      })

      if (response.ok) {
        toast({
          title: "Bid Placed!",
          description: `Your bid of $${amount.toLocaleString()} has been submitted.`,
        })
        setBidAmount("")
        setBidMessage("")
        setShowPartitionModal(false)
        // Refresh property data
        const propResponse = await fetch(`/api/properties/${propertyId}`)
        if (propResponse.ok) {
          setProperty(await propResponse.json())
        }
      } else {
        const data = await response.json()
        throw new Error(data.error || "Failed to place bid")
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Failed to place bid",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Calculate area from polygon points
  const calculatePolygonArea = (points: [number, number][]): number => {
    if (points.length < 3) return 0
    
    // Shoelace formula for calculating polygon area
    let area = 0
    const n = points.length
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      area += points[i][1] * points[j][0]
      area -= points[j][1] * points[i][0]
    }
    area = Math.abs(area) / 2
    
    // Convert to square meters (approximate)
    const avgLat = points.reduce((sum, p) => sum + p[0], 0) / n
    const latMeters = 111320
    const lngMeters = 111320 * Math.cos(avgLat * Math.PI / 180)
    
    return Math.round(area * latMeters * lngMeters)
  }

  // Handle partition points change
  const handlePartitionPointsChange = (points: [number, number][]) => {
    setPartitionPoints(points)
    const area = calculatePolygonArea(points)
    setCalculatedPartitionArea(area)
    setPartitionSize(area.toString())
  }

  // Handle instant buy for premium users
  const handleInstantBuy = async () => {
    if (!userId) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to purchase",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          userId,
          amount: property!.totalPrice,
          message: "Instant buy from premium user",
          isInstantBuy: true,
        }),
      })

      if (response.ok) {
        toast({
          title: "Purchase Request Submitted!",
          description: "Your instant buy request has been submitted. The seller will review and complete the transaction.",
        })
        setShowInstantBuyConfirm(false)
        // Refresh property data
        const propResponse = await fetch(`/api/properties/${propertyId}`)
        if (propResponse.ok) {
          setProperty(await propResponse.json())
        }
      } else {
        const data = await response.json()
        throw new Error(data.error || "Failed to submit purchase")
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Failed to submit purchase",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Parse layer data
  const soilQuality = property?.soilQuality ? JSON.parse(property.soilQuality) : null
  const crimeRate = property?.crimeRate ? JSON.parse(property.crimeRate) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Property not found</p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    )
  }

  // Parse images safely with validation
  const PLACEHOLDER_IMAGES = [
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
  ]
  
  let images: string[] = []
  try {
    if (property.images) {
      const parsed = JSON.parse(property.images)
      if (Array.isArray(parsed)) {
        images = parsed.filter((img: unknown) => 
          typeof img === 'string' && 
          (img.startsWith('http://') || img.startsWith('https://')) &&
          !img.startsWith('blob:')
        )
      }
    }
  } catch {
    // Invalid JSON, use empty array
  }
  
  // Fallback to placeholder if no valid images
  const displayImage = !imageError && images.length > 0 
    ? images[0] 
    : PLACEHOLDER_IMAGES[Math.floor(property.title.length % PLACEHOLDER_IMAGES.length)]
  
  const priceFor100sqm = property.pricePerSqm * 100
  const highestBid = property.bids?.[0]
  const isPartitionable = property.isPartitionable || property.areaSqm > 1000
  
  // Check if user is a buyer (regular user or premium user) - vendors and admins shouldn't bid
  const isBuyer = userRole === "USER" || userRole === "PREMIUM_USER"
  const isVendorOrAdmin = userRole === "VENDOR" || userRole === "PREMIUM_VENDOR" || userRole === "ADMIN"
  
  // Parse boundary coordinates for drawing
  const propertyBoundary = property.boundaryCoords ? (() => {
    try {
      return JSON.parse(property.boundaryCoords)
    } catch {
      return null
    }
  })() : null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate">{property.title}</h1>
          <p className="text-sm text-muted-foreground truncate">
            {property.address}, {property.city}, {property.state}
          </p>
        </div>
        <Badge className={`${statusColors[property.status]} text-white`}>
          {statusLabels[property.status]}
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Main Image */}
          <div className="aspect-video rounded-lg overflow-hidden bg-muted relative">
            <img 
              src={displayImage} 
              alt={property.title} 
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
            {isPartitionable && (
              <Badge className="absolute bottom-2 left-2 bg-blue-500 text-white">
                <Scissors className="w-3 h-3 mr-1" />
                Partitionable
              </Badge>
            )}
          </div>

          {/* Premium Layer Data Banner */}
          {isPremium && (soilQuality || crimeRate) && (
            <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-5 h-5 text-amber-500" />
                  <span className="font-medium">Property Analysis</span>
                  <Badge className="bg-amber-500 text-white text-xs">PREMIUM</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {soilQuality && (
                    <div>
                      <div className="text-sm text-muted-foreground">Soil Quality</div>
                      <div className="font-medium">{soilQuality.type || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">Rating: {soilQuality.rating || 'N/A'}/10</div>
                    </div>
                  )}
                  {crimeRate && (
                    <div>
                      <div className="text-sm text-muted-foreground">Crime Rate</div>
                      <div className="font-medium">{crimeRate.rate || 'Low'}</div>
                      <div className="text-xs text-muted-foreground">Safety: {crimeRate.safetyScore || 'N/A'}/10</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Premium Upsell Banner */}
          {!isPremium && (
            <Card className="bg-gradient-to-r from-slate-800 to-slate-700 border-slate-600 cursor-pointer hover:border-amber-500/50 transition-colors" onClick={() => setShowPremiumModal(true)}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-amber-500" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white flex items-center gap-2">
                    Unlock Property Analysis
                    <Crown className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-sm text-slate-400">
                    View soil quality, crime rates, flood zones & more
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </CardContent>
            </Card>
          )}

          {/* Price Card */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-primary">
                ${property.totalPrice.toLocaleString()}
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                <span>${property.pricePerSqm.toLocaleString()}/m²</span>
                <span>${property.pricePerSqf.toLocaleString()}/ft²</span>
              </div>
              <div className="mt-3 pt-3 border-t border-primary/20">
                <div className="text-xs text-muted-foreground mb-1">Average purchase (100m²)</div>
                <div className="text-lg font-semibold">${priceFor100sqm.toLocaleString()}</div>
              </div>
            </CardContent>
          </Card>

          {/* Instant Buy for Premium Users */}
          {property.status === "AVAILABLE" && !isVendorOrAdmin && (
            isPremium ? (
              <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    <span className="font-semibold">Instant Buy</span>
                    <Badge className="bg-amber-500 text-white text-xs">PREMIUM</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Skip the bidding process! Purchase this property instantly at the listed price.
                  </p>
                  <Button 
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                    onClick={() => setShowInstantBuyConfirm(true)}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Buy Now for ${property.totalPrice.toLocaleString()}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-slate-700 bg-slate-800/50 cursor-pointer hover:border-amber-500/50 transition-colors" onClick={() => setShowPremiumModal(true)}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      Instant Buy Available
                      <Crown className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-sm text-slate-400">
                      Upgrade to Premium to skip bidding
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </CardContent>
              </Card>
            )
          )}

          {/* Partition Buying Section - Only for buyers */}
          {isPartitionable && property.status === "AVAILABLE" && isBuyer && !isVendorOrAdmin && (
            <Card className="border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-blue-500" />
                  Partition Purchase
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This property can be purchased in sections. Buy only what you need!
                </p>
                
                <div className="bg-blue-500/10 rounded-lg p-3">
                  <div className="text-sm font-medium">Minimum Partition Size</div>
                  <div className="text-lg font-bold text-blue-500">
                    {property.minPartitionSize || 100} m²
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Starting from ${(property.pricePerSqm * (property.minPartitionSize || 100)).toLocaleString()}
                  </div>
                </div>

                <Button 
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => setShowPartitionModal(true)}
                >
                  <Scissors className="w-4 h-4 mr-2" />
                  Request Partition Purchase
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Property Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Property Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <AreaChart className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Area</div>
                    <div className="font-medium">{property.areaSqm.toLocaleString()} m²</div>
                    <div className="text-xs text-muted-foreground">{property.areaSqf.toLocaleString()} ft²</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Type</div>
                  <Badge variant="outline">{typeLabels[property.type]}</Badge>
                </div>
              </div>

              {property.type !== "LAND" && (
                <div className="grid grid-cols-3 gap-4">
                  {property.bedrooms && (
                    <div className="flex items-center gap-2">
                      <Bed className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Bedrooms</div>
                        <div className="font-medium">{property.bedrooms}</div>
                      </div>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="flex items-center gap-2">
                      <Bath className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Bathrooms</div>
                        <div className="font-medium">{property.bathrooms}</div>
                      </div>
                    </div>
                  )}
                  {property.yearBuilt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Year Built</div>
                        <div className="font-medium">{property.yearBuilt}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              <div>
                <div className="text-sm text-muted-foreground mb-1">Location</div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div>{property.address}</div>
                    <div>{property.city}, {property.state} {property.zipCode}</div>
                    <div>{property.country}</div>
                  </div>
                </div>
              </div>

              {property.description && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Description</div>
                    <p className="text-sm whitespace-pre-wrap">{property.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Seller Info - Show for all users */}
          {property.owner && !isVendorOrAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Seller Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{property.owner.name || "Anonymous Seller"}</div>
                    <div className="text-sm text-muted-foreground">{property.owner.email}</div>
                  </div>
                </div>
                {property.owner.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{property.owner.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bidding Section - Only for buyers */}
          {(property.status === "AVAILABLE" || property.status === "BIDDING") && isBuyer && !isVendorOrAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Place a Bid
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {highestBid && (
                  <div className="bg-muted rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Current Highest Bid</div>
                    <div className="text-xl font-bold">${highestBid.amount.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      by {highestBid.user?.name || highestBid.user?.email}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="bid-amount">Your Bid ($)</Label>
                  <Input
                    id="bid-amount"
                    type="number"
                    placeholder={highestBid ? (highestBid.amount * 1.05).toFixed(0) : property.totalPrice.toString()}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bid-message">Message (optional)</Label>
                  <Textarea
                    id="bid-message"
                    placeholder="Include any details or questions..."
                    value={bidMessage}
                    onChange={(e) => setBidMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={() => handlePlaceBid()}
                  disabled={submitting || !userId}
                >
                  {submitting ? "Submitting..." : "Submit Bid"}
                </Button>

                {!userId && (
                  <p className="text-xs text-center text-muted-foreground">
                    Please log in to place a bid
                  </p>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Bid History */}
          {property.bids && property.bids.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Bid History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-3">
                    {property.bids.map((bid, index) => (
                      <div
                        key={bid.id}
                        className={`p-3 rounded-lg ${
                          index === 0 ? "bg-primary/10 border border-primary/20" : "bg-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">
                            ${bid.amount.toLocaleString()}
                            {bid.partitionSize && (
                              <span className="text-sm font-normal text-muted-foreground ml-2">
                                ({bid.partitionSize} m² partition)
                              </span>
                            )}
                          </div>
                          <Badge
                            variant={bid.status === "ACCEPTED" ? "default" : "secondary"}
                            className={
                              bid.status === "ACCEPTED"
                                ? "bg-green-500 text-white"
                                : bid.status === "REJECTED"
                                ? "bg-red-500 text-white"
                                : ""
                            }
                          >
                            {bid.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {bid.user?.name || bid.user?.email}
                        </div>
                        {bid.message && (
                          <div className="text-sm mt-2 italic text-muted-foreground">
                            "{bid.message}"
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(bid.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Verification Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Verification Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {property.isVerified ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-600 font-medium">Verified Property</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-orange-500" />
                    <span className="text-orange-600 font-medium">Pending Verification</span>
                  </>
                )}
              </div>
              {property.verifiedAt && (
                <div className="text-sm text-muted-foreground mt-2">
                  Verified on {new Date(property.verifiedAt).toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Partition Purchase Modal */}
      <Dialog open={showPartitionModal} onOpenChange={(open) => {
        setShowPartitionModal(open)
        if (!open) {
          setPartitionDrawingMode(false)
          setPartitionPoints([])
          setCalculatedPartitionArea(0)
          setPartitionSize("")
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-blue-500" />
              Request Partition Purchase
            </DialogTitle>
            <DialogDescription>
              Draw the area you want to purchase on the map or enter the size manually
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="bg-muted rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Total Property Size</div>
              <div className="text-xl font-bold">{property.areaSqm.toLocaleString()} m²</div>
              <div className="text-sm text-muted-foreground mt-1">
                Minimum partition: {property.minPartitionSize || MIN_PARTITION_SIZE} m²
              </div>
            </div>

            {/* Drawing Mode Toggle */}
            <div className="flex gap-2">
              <Button 
                variant={partitionDrawingMode ? "default" : "outline"}
                className="flex-1"
                onClick={() => {
                  setPartitionDrawingMode(true)
                  setPartitionSize("")
                }}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Draw on Map
              </Button>
              <Button 
                variant={!partitionDrawingMode ? "default" : "outline"}
                className="flex-1"
                onClick={() => {
                  setPartitionDrawingMode(false)
                  setPartitionPoints([])
                  setCalculatedPartitionArea(0)
                }}
              >
                <AreaChart className="w-4 h-4 mr-2" />
                Enter Size
              </Button>
            </div>

            {/* Drawing Mode */}
            {partitionDrawingMode && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Pencil className="w-4 h-4" />
                  Draw Your Desired Partition
                </Label>
                <div className="border rounded-lg overflow-hidden">
                  <PartitionDrawingMap
                    points={partitionPoints}
                    onPointsChange={handlePartitionPointsChange}
                    center={{ lat: property.latitude, lng: property.longitude }}
                    propertyBoundary={property.boundaryCoords ? JSON.parse(property.boundaryCoords) : undefined}
                  />
                </div>
                
                {calculatedPartitionArea > 0 && (
                  <div className={`rounded-lg p-3 ${calculatedPartitionArea >= MIN_PARTITION_SIZE ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Drawn Area:</span>
                      <span className={`font-bold ${calculatedPartitionArea >= MIN_PARTITION_SIZE ? 'text-green-600' : 'text-red-600'}`}>
                        {calculatedPartitionArea.toLocaleString()} m²
                      </span>
                    </div>
                    {calculatedPartitionArea < MIN_PARTITION_SIZE && (
                      <div className="text-sm text-red-600 mt-1">
                        ⚠️ Minimum partition size is {MIN_PARTITION_SIZE} m²
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Manual Size Input Mode */}
            {!partitionDrawingMode && (
              <div className="space-y-2">
                <Label htmlFor="partition-size">Your Desired Size (m²)</Label>
                <Input
                  id="partition-size"
                  type="number"
                  min={property.minPartitionSize || MIN_PARTITION_SIZE}
                  max={property.areaSqm}
                  placeholder={`Min: ${property.minPartitionSize || MIN_PARTITION_SIZE} m²`}
                  value={partitionSize}
                  onChange={(e) => setPartitionSize(e.target.value)}
                />
                <div className="text-xs text-muted-foreground">
                  Minimum: {property.minPartitionSize || MIN_PARTITION_SIZE} m² • Maximum: {property.areaSqm.toLocaleString()} m²
                </div>
              </div>
            )}

            {/* Price Calculation */}
            {((partitionDrawingMode && calculatedPartitionArea >= MIN_PARTITION_SIZE) || 
              (!partitionDrawingMode && partitionSize && parseFloat(partitionSize) >= MIN_PARTITION_SIZE)) && (
              <div className="bg-blue-500/10 rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Estimated Price</div>
                <div className="text-2xl font-bold text-blue-500">
                  ${((partitionDrawingMode ? calculatedPartitionArea : parseFloat(partitionSize)) * property.pricePerSqm).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {(partitionDrawingMode ? calculatedPartitionArea : parseFloat(partitionSize)).toLocaleString()} m² × ${property.pricePerSqm}/m²
                </div>
              </div>
            )}

            {/* Validation Error */}
            {partitionDrawingMode && calculatedPartitionArea > 0 && calculatedPartitionArea < MIN_PARTITION_SIZE && (
              <div className="bg-red-500/10 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <div className="text-sm text-red-600">
                  The drawn area ({calculatedPartitionArea} m²) is below the minimum requirement of {MIN_PARTITION_SIZE} m².
                </div>
              </div>
            )}

            <div className="bg-amber-500/10 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="text-sm text-muted-foreground">
                Partition purchases require seller approval. The exact boundary will be determined during the sale process.
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                setShowPartitionModal(false)
                setPartitionDrawingMode(false)
                setPartitionPoints([])
                setCalculatedPartitionArea(0)
                setPartitionSize("")
              }}>
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                disabled={
                  (partitionDrawingMode && calculatedPartitionArea < MIN_PARTITION_SIZE) ||
                  (!partitionDrawingMode && (!partitionSize || parseFloat(partitionSize) < MIN_PARTITION_SIZE))
                }
                onClick={() => handlePlaceBid({ size: partitionDrawingMode ? calculatedPartitionArea : parseFloat(partitionSize) })}
              >
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Modal */}
      <Dialog open={showPremiumModal} onOpenChange={setShowPremiumModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Unlock Property Analysis
            </DialogTitle>
            <DialogDescription>
              Get detailed insights about this property
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-amber-500" />
                <div>
                  <div className="font-medium">Soil Quality Analysis</div>
                  <div className="text-sm text-muted-foreground">Type, rating, building suitability</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-amber-500" />
                <div>
                  <div className="font-medium">Crime Rate Data</div>
                  <div className="text-sm text-muted-foreground">Local safety scores and trends</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-amber-500" />
                <div>
                  <div className="font-medium">Flood Zone Information</div>
                  <div className="text-sm text-muted-foreground">Risk assessment and history</div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold">$9.99<span className="text-base font-normal text-muted-foreground">/month</span></div>
            </div>

            <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
              <Crown className="w-4 w-4 mr-2" />
              Upgrade to Premium
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Instant Buy Confirmation Dialog */}
      <Dialog open={showInstantBuyConfirm} onOpenChange={setShowInstantBuyConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Confirm Instant Purchase
            </DialogTitle>
            <DialogDescription>
              Review your purchase details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="bg-muted rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Property</span>
                  <span className="font-medium">{property?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium">{property?.city}, {property?.state}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Area</span>
                  <span className="font-medium">{property?.areaSqm.toLocaleString()} m²</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total Price</span>
                  <span className="font-bold text-primary">${property?.totalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-500/10 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="text-sm text-muted-foreground">
                This will submit a purchase request to the seller. The transaction will be completed after seller approval.
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowInstantBuyConfirm(false)}>
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                onClick={handleInstantBuy}
                disabled={submitting}
              >
                {submitting ? "Processing..." : "Confirm Purchase"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
