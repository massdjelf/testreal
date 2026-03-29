"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Plus,
  Building2,
  FileText,
  MapPin,
  Trash2,
  Eye,
  ArrowLeft,
  CheckCircle,
  Clock,
  AreaChart,
  AlertTriangle,
  Upload,
  Pencil,
  ShieldAlert,
  Map as MapIcon,
  Crosshair,
  Trash,
  Scissors,
  DollarSign,
  User,
  X,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Property } from "@/types"
import dynamic from "next/dynamic"

// Dynamically import the drawing map component
const BoundaryDrawingMap = dynamic(
  () => import("@/components/map/BoundaryDrawingMap").then((mod) => mod.BoundaryDrawingMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
        <div className="text-muted-foreground">Loading map...</div>
      </div>
    ),
  }
)

// Partition Offer interface
interface PartitionOffer {
  id: string
  propertyId: string
  property?: Property
  userId: string
  user?: { name: string | null; email: string }
  amount: number
  partitionSize: number
  message?: string
  status: string
  createdAt: string
  partitionCoords?: string
}

// Document interface
interface Document {
  id: string
  name: string
  type: string
  status: string
  url: string
  uploadedAt: string
  propertyId: string
  property?: { title: string }
}

interface VendorPanelProps {
  userId: string
  onBack: () => void
}

const propertyTypes = [
  { value: "LAND", label: "Land" },
  { value: "HOUSE", label: "House" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "INDUSTRIAL", label: "Industrial" },
]

export function VendorPanel({ userId, onBack }: VendorPanelProps) {
  const [activeTab, setActiveTab] = useState("my-properties")
  const [properties, setProperties] = useState<Property[]>([])
  const [partitionOffers, setPartitionOffers] = useState<PartitionOffer[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showBoundaryWarning, setShowBoundaryWarning] = useState(false)
  const [showDrawingTool, setShowDrawingTool] = useState(false)
  const [boundaryMethod, setBoundaryMethod] = useState<"draw" | "manual" | null>(null)
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([])
  const [manualPoints, setManualPoints] = useState<{ lat: string; lng: string }[]>([
    { lat: "", lng: "" },
  ])
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [selectedDocProperty, setSelectedDocProperty] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "LAND",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "USA",
    latitude: "",
    longitude: "",
    areaSqm: "",
    pricePerSqm: "",
    bedrooms: "",
    bathrooms: "",
    yearBuilt: "",
    isPartitionable: false,
    minPartitionSize: "",
    boundaryCoords: "",
  })

  useEffect(() => {
    fetchMyProperties()
    fetchPartitionOffers()
    fetchDocuments()
  }, [])

  const fetchMyProperties = async () => {
    setLoading(true)
    try {
      // Fetch properties owned by this vendor, including unverified
      const response = await fetch(`/api/properties?ownerId=${userId}&includeUnverified=true`)
      if (response.ok) {
        const myProperties = await response.json()
        setProperties(myProperties)
      }
    } catch (error) {
      console.error("Failed to fetch properties:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPartitionOffers = async () => {
    try {
      // Fetch partition offers for this vendor's properties
      const response = await fetch(`/api/bids?partition=true&vendorId=${userId}`)
      if (response.ok) {
        const offers = await response.json()
        setPartitionOffers(offers)
      }
    } catch (error) {
      console.error("Failed to fetch partition offers:", error)
    }
  }

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/documents?userId=${userId}`)
      if (response.ok) {
        const docs = await response.json()
        setDocuments(docs)
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error)
    }
  }

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedDocProperty) return

    setUploadingDoc(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("propertyId", selectedDocProperty)
      formData.append("userId", userId)
      formData.append("type", "deed")

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        toast({
          title: "Document Uploaded",
          description: "Your document has been uploaded for verification",
        })
        fetchDocuments()
        setSelectedDocProperty(null)
      } else {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Upload failed")
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      })
    } finally {
      setUploadingDoc(false)
    }
  }

  const handlePartitionOfferStatus = async (offerId: string, accept: boolean) => {
    try {
      const response = await fetch(`/api/bids/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: accept ? "ACCEPTED" : "REJECTED" }),
      })

      if (response.ok) {
        toast({
          title: accept ? "Offer Accepted" : "Offer Rejected",
          description: accept 
            ? "The buyer will be notified of your acceptance" 
            : "The buyer will be notified of your rejection",
        })
        fetchPartitionOffers()
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to update offer status",
        variant: "destructive",
      })
    }
  }

  const calculatePrices = () => {
    const area = parseFloat(formData.areaSqm) || 0
    const pricePerSqm = parseFloat(formData.pricePerSqm) || 0
    const totalPrice = area * pricePerSqm
    const areaSqf = area * 10.7639
    const pricePerSqf = pricePerSqm / 10.7639

    return {
      totalPrice: totalPrice.toFixed(2),
      areaSqf: areaSqf.toFixed(2),
      pricePerSqf: pricePerSqf.toFixed(2),
    }
  }

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImage(true)
    try {
      const uploadData = new FormData()
      const availableSlots = Math.max(0, 5 - uploadedImages.length)
      const filesToUpload = Array.from(files).slice(0, availableSlots)

      filesToUpload.forEach((file) => {
        uploadData.append("files", file)
      })

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: uploadData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload images")
      }

      const newImages: string[] = Array.isArray(data.urls) ? data.urls : []
      setUploadedImages(prev => [...prev, ...newImages].slice(0, 5))
      
      toast({
        title: "Images Added",
        description: `${newImages.length} image(s) uploaded. ${5 - uploadedImages.length - newImages.length} more slots available.`,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to upload images",
        variant: "destructive",
      })
    } finally {
      setUploadingImage(false)
      // Reset the input
      e.target.value = ""
    }
  }

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleOpenAddDialog = () => {
    setShowBoundaryWarning(true)
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
    
    // Convert to square meters (approximate, assuming coordinates are in degrees)
    // This is a rough estimation; for accurate results, use proper geospatial calculations
    const avgLat = points.reduce((sum, p) => sum + p[0], 0) / n
    const latMeters = 111320 // meters per degree latitude
    const lngMeters = 111320 * Math.cos(avgLat * Math.PI / 180) // meters per degree longitude
    
    return Math.round(area * latMeters * lngMeters)
  }

  // Get center point from polygon
  const getPolygonCenter = (points: [number, number][]): { lat: number; lng: number } => {
    if (points.length === 0) return { lat: 39.8283, lng: -98.5795 }
    const sum = points.reduce((acc, p) => ({ lat: acc.lat + p[0], lng: acc.lng + p[1] }), { lat: 0, lng: 0 })
    return { lat: sum.lat / points.length, lng: sum.lng / points.length }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const prices = calculatePrices()
    
    // Determine boundary coordinates based on method
    let boundaryCoords = ""
    let finalLat = formData.latitude
    let finalLng = formData.longitude
    let finalArea = formData.areaSqm
    
    if (boundaryMethod === "draw" && drawnPoints.length >= 3) {
      boundaryCoords = JSON.stringify(drawnPoints)
      const center = getPolygonCenter(drawnPoints)
      finalLat = center.lat.toString()
      finalLng = center.lng.toString()
      finalArea = calculatePolygonArea(drawnPoints).toString()
    } else if (boundaryMethod === "manual") {
      const validPoints = manualPoints.filter(p => p.lat && p.lng)
      if (validPoints.length >= 3) {
        const coords: [number, number][] = validPoints.map(p => [parseFloat(p.lat), parseFloat(p.lng)])
        boundaryCoords = JSON.stringify(coords)
        const center = getPolygonCenter(coords)
        finalLat = center.lat.toString()
        finalLng = center.lng.toString()
        finalArea = calculatePolygonArea(coords).toString()
      }
    }

    try {
      const response = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          ...prices,
          latitude: finalLat || 39.8283,
          longitude: finalLng || -98.5795,
          areaSqm: finalArea || formData.areaSqm,
          ownerId: userId,
          minPartitionSize: formData.minPartitionSize ? parseFloat(formData.minPartitionSize) : null,
          boundaryCoords,
          isPartitionable: formData.isPartitionable,
          images: JSON.stringify(uploadedImages),
        }),
      })

      if (response.ok) {
        toast({
          title: "Property Listed!",
          description: "Your property has been submitted for verification.",
        })
        setShowAddDialog(false)
        setShowDrawingTool(false)
        setDrawnPoints([])
        setManualPoints([{ lat: "", lng: "" }])
        setBoundaryMethod(null)
        setUploadedImages([])
        fetchMyProperties()
        // Reset form
        setFormData({
          title: "",
          description: "",
          type: "LAND",
          address: "",
          city: "",
          state: "",
          zipCode: "",
          country: "USA",
          latitude: "",
          longitude: "",
          areaSqm: "",
          pricePerSqm: "",
          bedrooms: "",
          bathrooms: "",
          yearBuilt: "",
          isPartitionable: false,
          minPartitionSize: "",
          boundaryCoords: "",
        })
      } else {
        throw new Error("Failed to create property")
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to list property. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (propertyId: string) => {
    if (!confirm("Are you sure you want to delete this property?")) return

    try {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Property Deleted",
          description: "Your property has been removed.",
        })
        fetchMyProperties()
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to delete property",
        variant: "destructive",
      })
    }
  }

  const addManualPoint = () => {
    setManualPoints([...manualPoints, { lat: "", lng: "" }])
  }

  const removeManualPoint = (index: number) => {
    setManualPoints(manualPoints.filter((_, i) => i !== index))
  }

  const updateManualPoint = (index: number, field: "lat" | "lng", value: string) => {
    const updated = [...manualPoints]
    updated[index] = { ...updated[index], [field]: value }
    setManualPoints(updated)
  }

  const prices = calculatePrices()
  const calculatedPolygonArea = boundaryMethod === "draw" && drawnPoints.length >= 3
    ? calculatePolygonArea(drawnPoints)
    : boundaryMethod === "manual"
    ? calculatePolygonArea(manualPoints.filter(p => p.lat && p.lng).map(p => [parseFloat(p.lat), parseFloat(p.lng)]))
    : 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">Vendor Panel</h1>
            <p className="text-sm text-muted-foreground">Manage your property listings</p>
          </div>
        </div>
        <Button onClick={handleOpenAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </div>

      {/* Boundary Warning Dialog - Fixed hydration error by not using AlertDialogDescription with divs */}
      <Dialog open={showBoundaryWarning} onOpenChange={setShowBoundaryWarning}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
              Important: Property Boundaries
            </DialogTitle>
            <DialogDescription className="sr-only">
              Choose how to define your property boundaries
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-2">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="font-medium text-amber-700 mb-2">⚠️ Warning: Legal Implications</div>
              <p className="text-sm text-muted-foreground">
                Providing inaccurate property boundaries may result in legal penalties, fines, 
                and potential lawsuits. Incorrect boundaries can delay or void property transactions.
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="font-medium">Choose your boundary method:</div>
              
              <button
                className="w-full bg-muted hover:bg-muted/80 rounded-lg p-4 text-left transition-colors border-2 border-transparent hover:border-primary"
                onClick={() => {
                  setShowBoundaryWarning(false)
                  setBoundaryMethod("manual")
                  setShowAddDialog(true)
                }}
              >
                <div className="flex items-start gap-3">
                  <Crosshair className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Enter Coordinates Manually</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Best for: Houses, apartments, and simple rectangular lots. 
                      Enter latitude/longitude points for each corner.
                    </p>
                  </div>
                </div>
              </button>
              
              <button
                className="w-full bg-muted hover:bg-muted/80 rounded-lg p-4 text-left transition-colors border-2 border-transparent hover:border-primary"
                onClick={() => {
                  setShowBoundaryWarning(false)
                  setBoundaryMethod("draw")
                  setShowAddDialog(true)
                }}
              >
                <div className="flex items-start gap-3">
                  <Pencil className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Draw on Map (Recommended for Land)</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Best for: Land with irregular shapes. Draw the exact boundary 
                      using your mouse on our interactive map.
                    </p>
                  </div>
                </div>
              </button>
              
              <button
                className="w-full bg-muted hover:bg-muted/80 rounded-lg p-4 text-left transition-colors border-2 border-transparent hover:border-primary"
                onClick={() => {
                  setShowBoundaryWarning(false)
                  setBoundaryMethod(null)
                  setShowAddDialog(true)
                  toast({
                    title: "Document Upload",
                    description: "Document upload feature coming soon!",
                  })
                }}
              >
                <div className="flex items-start gap-3">
                  <Upload className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Upload Documents (Safest)</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload deed, survey, or title documents. Our team will 
                      set the correct boundaries for you.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setShowBoundaryWarning(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Property Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>List New Property</DialogTitle>
            <DialogDescription>
              Fill in the details to list your property. It will be reviewed before appearing on the map.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Boundary Reminder */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium text-amber-700">Remember: </span>
                <span className="text-muted-foreground">
                  Ensure your property boundaries are accurate. Incorrect boundaries may result in fines.
                </span>
              </div>
            </div>

            {/* Boundary Drawing Section */}
            {boundaryMethod === "draw" && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <MapIcon className="w-4 h-4" />
                  Draw Property Boundary
                </Label>
                <div className="border rounded-lg overflow-hidden">
                  <BoundaryDrawingMap
                    points={drawnPoints}
                    onPointsChange={setDrawnPoints}
                    center={
                      formData.latitude && formData.longitude
                        ? { lat: parseFloat(formData.latitude), lng: parseFloat(formData.longitude) }
                        : undefined
                    }
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">
                    <span className="font-medium">{drawnPoints.length}</span> points drawn
                    {drawnPoints.length >= 3 && (
                      <span className="ml-2">
                        • Area: <span className="font-medium">{calculatedPolygonArea.toLocaleString()} m²</span>
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDrawnPoints([])}
                    disabled={drawnPoints.length === 0}
                  >
                    <Trash className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            )}

            {/* Manual Coordinates Section */}
            {boundaryMethod === "manual" && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4" />
                  Property Corner Coordinates
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enter the latitude and longitude for each corner of your property in order (clockwise or counter-clockwise).
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {manualPoints.map((point, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm font-medium w-8">#{index + 1}</span>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Latitude"
                        value={point.lat}
                        onChange={(e) => updateManualPoint(index, "lat", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        step="any"
                        placeholder="Longitude"
                        value={point.lng}
                        onChange={(e) => updateManualPoint(index, "lng", e.target.value)}
                        className="flex-1"
                      />
                      {manualPoints.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeManualPoint(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <Button type="button" variant="outline" size="sm" onClick={addManualPoint}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Point
                  </Button>
                  {manualPoints.filter(p => p.lat && p.lng).length >= 3 && (
                    <span className="text-sm text-muted-foreground">
                      Area: <span className="font-medium">{calculatedPolygonArea.toLocaleString()} m²</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="title">Property Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Beautiful land in Texas"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Property Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="areaSqm">Area (m²) {!boundaryMethod && "*"}</Label>
                <Input
                  id="areaSqm"
                  type="number"
                  value={boundaryMethod && calculatedPolygonArea > 0 ? calculatedPolygonArea : formData.areaSqm}
                  onChange={(e) => setFormData({ ...formData, areaSqm: e.target.value })}
                  placeholder="1000"
                  required={!boundaryMethod}
                  disabled={!!boundaryMethod && calculatedPolygonArea > 0}
                />
                {boundaryMethod && calculatedPolygonArea > 0 && (
                  <p className="text-xs text-muted-foreground">Auto-calculated from boundary</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricePerSqm">Price per m² ($) *</Label>
                <Input
                  id="pricePerSqm"
                  type="number"
                  value={formData.pricePerSqm}
                  onChange={(e) => setFormData({ ...formData, pricePerSqm: e.target.value })}
                  placeholder="50"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Total Price</Label>
                <div className="text-2xl font-bold text-primary">
                  ${parseFloat(
                    boundaryMethod && calculatedPolygonArea > 0
                      ? (calculatedPolygonArea * parseFloat(formData.pricePerSqm || "0")).toFixed(2)
                      : prices.totalPrice
                  ).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Partition Options */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="partitionable"
                  checked={formData.isPartitionable}
                  onChange={(e) => setFormData({ ...formData, isPartitionable: e.target.checked })}
                  className="accent-primary"
                />
                <Label htmlFor="partitionable" className="cursor-pointer">
                  Allow partition buying (buyers can purchase portions)
                </Label>
              </div>
              
              {formData.isPartitionable && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="minPartition">Minimum Partition Size (m²)</Label>
                  <Input
                    id="minPartition"
                    type="number"
                    value={formData.minPartitionSize}
                    onChange={(e) => setFormData({ ...formData, minPartitionSize: e.target.value })}
                    placeholder="100"
                  />
                  <p className="text-xs text-muted-foreground">
                    The smallest portion buyers can purchase
                  </p>
                </div>
              )}
            </div>

            {/* Image Upload */}
            <Separator />
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Property Images ({uploadedImages.length}/5)
              </Label>
              
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-5 gap-2">
                  {uploadedImages.map((img, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                      <img src={img} alt={`Property ${index + 1}`} className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => removeImage(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {uploadedImages.length < 5 && (
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="cursor-pointer"
                  />
                  {uploadingImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                Upload up to 5 images. Supported formats: JPG, PNG. Recommended size: 1200x800px.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main Street"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Houston"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Texas"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zipCode">Zip Code</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  placeholder="77001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="29.7604"
                  disabled={!!boundaryMethod}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="-95.3698"
                  disabled={!!boundaryMethod}
                />
              </div>
            </div>
            {boundaryMethod && (
              <p className="text-xs text-muted-foreground -mt-2">
                Coordinates auto-filled from boundary center
              </p>
            )}

            {formData.type !== "LAND" && (
              <>
                <Separator />
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Input
                      id="bedrooms"
                      type="number"
                      value={formData.bedrooms}
                      onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                      placeholder="3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      value={formData.bathrooms}
                      onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                      placeholder="2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yearBuilt">Year Built</Label>
                    <Input
                      id="yearBuilt"
                      type="number"
                      value={formData.yearBuilt}
                      onChange={(e) => setFormData({ ...formData, yearBuilt: e.target.value })}
                      placeholder="2020"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your property..."
                rows={4}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Submit for Review
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setShowAddDialog(false)
                setDrawnPoints([])
                setManualPoints([{ lat: "", lng: "" }])
                setBoundaryMethod(null)
              }}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ScrollArea className="flex-1 p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="my-properties">My Properties</TabsTrigger>
            <TabsTrigger value="partition-offers">
              Partition Offers
              {partitionOffers.filter(o => o.status === "PENDING").length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {partitionOffers.filter(o => o.status === "PENDING").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="my-properties" className="space-y-4">
            {properties.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No properties yet</p>
                  <p className="text-muted-foreground mb-4">
                    Start listing your properties to reach potential buyers
                  </p>
                  <Button onClick={handleOpenAddDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Property
                  </Button>
                </CardContent>
              </Card>
            ) : (
              properties.map((property) => (
                <Card key={property.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{property.title}</span>
                          {property.isVerified ? (
                            <Badge className="bg-green-500 text-white">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                          {property.isPartitionable && (
                            <Badge variant="outline" className="border-blue-500 text-blue-500">
                              Partitionable
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {property.city}, {property.state}
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <AreaChart className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{property.areaSqm.toLocaleString()} m²</span>
                          </div>
                          <div className="text-lg font-bold text-primary">
                            ${property.totalPrice.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(property.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="partition-offers" className="space-y-4">
            {partitionOffers.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Scissors className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No Partition Offers</p>
                  <p className="text-muted-foreground">
                    When buyers request to purchase portions of your properties, they will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              partitionOffers.map((offer) => (
                <Card key={offer.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {offer.property?.title || `Property #${offer.propertyId.slice(-6)}`}
                          </span>
                          <Badge className={
                            offer.status === "ACCEPTED" 
                              ? "bg-green-500 text-white"
                              : offer.status === "REJECTED"
                              ? "bg-red-500 text-white"
                              : "bg-amber-500 text-white"
                          }>
                            {offer.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{offer.user?.name || offer.user?.email || "Anonymous Buyer"}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div className="bg-muted rounded-lg p-3">
                            <div className="text-xs text-muted-foreground">Partition Size</div>
                            <div className="text-lg font-bold text-blue-500">
                              {offer.partitionSize?.toLocaleString() || "N/A"} m²
                            </div>
                          </div>
                          <div className="bg-muted rounded-lg p-3">
                            <div className="text-xs text-muted-foreground">Offer Amount</div>
                            <div className="text-lg font-bold text-green-500">
                              ${offer.amount?.toLocaleString() || "N/A"}
                            </div>
                          </div>
                        </div>
                        
                        {offer.message && (
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">Buyer Message</div>
                            <p className="text-sm">{offer.message}</p>
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground mt-2">
                          Submitted on {new Date(offer.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {offer.status === "PENDING" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => handlePartitionOfferStatus(offer.id, true)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handlePartitionOfferStatus(offer.id, false)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            {/* Document Upload Section */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">Upload New Document</h3>
                <div className="space-y-3">
                  <Select 
                    value={selectedDocProperty || ""} 
                    onValueChange={setSelectedDocProperty}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select property for document" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedDocProperty && (
                    <div className="relative">
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleDocumentUpload}
                        disabled={uploadingDoc}
                        className="cursor-pointer"
                      />
                      {uploadingDoc && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Supported formats: PDF, JPG, PNG. Max 10MB.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Documents List */}
            {documents.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No Documents Yet</p>
                  <p className="text-muted-foreground">
                    Upload property documents like deeds, surveys, and titles for verification
                  </p>
                </CardContent>
              </Card>
            ) : (
              documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{doc.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {doc.property?.title || `Property #${doc.propertyId.slice(-6)}`}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {doc.type}
                            </Badge>
                            <Badge className={
                              doc.status === "VERIFIED" 
                                ? "bg-green-500 text-white text-xs"
                                : doc.status === "REJECTED"
                                ? "bg-red-500 text-white text-xs"
                                : "bg-amber-500 text-white text-xs"
                            }>
                              {doc.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  )
}
