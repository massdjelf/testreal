"use client"

import { useState } from "react"
import { Property } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, AreaChart, DollarSign, Bed, Bath, Calendar, User } from "lucide-react"

interface PropertyCardProps {
  property: Property
  onClick: () => void
}

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-red-500 hover:bg-red-600",
  SOLD: "bg-green-500 hover:bg-green-600",
  BIDDING: "bg-gray-500 hover:bg-gray-600",
  PENDING: "bg-orange-500 hover:bg-orange-600",
}

const statusLabels: Record<string, string> = {
  AVAILABLE: "Available",
  SOLD: "Sold",
  BIDDING: "In Bidding",
  PENDING: "Pending",
}

const typeLabels: Record<string, string> = {
  LAND: "Land",
  HOUSE: "House",
  APARTMENT: "Apartment",
  COMMERCIAL: "Commercial",
  INDUSTRIAL: "Industrial",
}

// Fallback placeholder images
const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
]

export function PropertyCard({ property, onClick }: PropertyCardProps) {
  const [imageError, setImageError] = useState(false)
  
  // Parse images safely
  let images: string[] = []
  try {
    if (property.images) {
      const parsed = JSON.parse(property.images)
      if (Array.isArray(parsed)) {
        images = parsed.filter(img => 
          typeof img === 'string' && 
          (img.startsWith('http://') || img.startsWith('https://')) &&
          !img.startsWith('blob:')
        )
      }
    }
  } catch {
    // Invalid JSON, use empty array
  }
  
  // Use first valid image or fallback
  const mainImage = !imageError && images.length > 0 
    ? images[0] 
    : PLACEHOLDER_IMAGES[Math.floor(property.title.length % PLACEHOLDER_IMAGES.length)]

  // Calculate price for 100m² (average purchase)
  const priceFor100sqm = property.pricePerSqm * 100

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group" onClick={onClick}>
      {/* Image */}
      <div className="relative h-48 bg-muted">
        <img
          src={mainImage}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={() => setImageError(true)}
        />
        
        {/* Status Badge */}
        <Badge
          className={`absolute top-2 right-2 text-white ${statusColors[property.status]}`}
        >
          {statusLabels[property.status]}
        </Badge>

        {/* Type Badge */}
        <Badge variant="outline" className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm">
          {typeLabels[property.type]}
        </Badge>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <div>
          <h3 className="font-semibold truncate">{property.title}</h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{property.city}, {property.state}</span>
          </div>
        </div>

        {/* Price */}
        <div className="bg-primary/10 rounded-lg p-3">
          <div className="text-2xl font-bold text-primary">
            ${property.totalPrice.toLocaleString()}
          </div>
          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
            <span>${property.pricePerSqm.toLocaleString()}/m²</span>
            <span>${property.pricePerSqf.toLocaleString()}/ft²</span>
          </div>
        </div>

        {/* Area */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <AreaChart className="h-4 w-4 text-muted-foreground" />
            <span>{property.areaSqm.toLocaleString()} m²</span>
            <span className="text-muted-foreground">({property.areaSqf.toLocaleString()} ft²)</span>
          </div>
        </div>

        {/* Property details for houses/apartments */}
        {property.type !== "LAND" && (
          <div className="flex gap-4 text-sm text-muted-foreground">
            {property.bedrooms && (
              <div className="flex items-center gap-1">
                <Bed className="h-4 w-4" />
                <span>{property.bedrooms}</span>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center gap-1">
                <Bath className="h-4 w-4" />
                <span>{property.bathrooms}</span>
              </div>
            )}
            {property.yearBuilt && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{property.yearBuilt}</span>
              </div>
            )}
          </div>
        )}

        {/* Average purchase price hint */}
        <div className="pt-2 border-t text-xs text-muted-foreground">
          <span className="font-medium">~${priceFor100sqm.toLocaleString()}</span>
          <span> for 100m² (avg. purchase)</span>
        </div>

        {/* Owner info */}
        {property.owner && (
          <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>Listed by {property.owner.name || property.owner.email}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
