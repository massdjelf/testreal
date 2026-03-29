"use client"

import { useEffect, useMemo } from "react"
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Property } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, AreaChart, DollarSign, Bed, Bath, Layers } from "lucide-react"

// Fix for default marker icons in Leaflet with Next.js
const createIcon = (color: string) => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          transform: rotate(45deg);
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })
}

const statusColors: Record<string, string> = {
  AVAILABLE: "#ef4444", // Red
  SOLD: "#22c55e", // Green
  BIDDING: "#6b7280", // Grey
  PENDING: "#f97316", // Orange
}

const statusIcons: Record<string, ReturnType<typeof createIcon>> = {
  AVAILABLE: createIcon(statusColors.AVAILABLE),
  SOLD: createIcon(statusColors.SOLD),
  BIDDING: createIcon(statusColors.BIDDING),
  PENDING: createIcon(statusColors.PENDING),
}

interface PropertyMapProps {
  properties: Property[]
  onPropertyClick: (property: Property) => void
  center: { lat: number; lng: number }
  zoom: number
  onMapMove?: (center: { lat: number; lng: number }, zoom: number, bounds: { north: number; south: number; east: number; west: number }) => void
  onZoomChange?: (zoom: number) => void
  showBoundaries?: boolean
  activeLayer?: string | null
}

function MapEvents({ onMove, onZoom }: { 
  onMove?: (center: { lat: number; lng: number }, zoom: number, bounds: { north: number; south: number; east: number; west: number }) => void
  onZoom?: (zoom: number) => void 
}) {
  const map = useMap()

  useMapEvents({
    moveend: () => {
      const center = map.getCenter()
      const zoom = map.getZoom()
      const bounds = map.getBounds()
      onMove?.(
        { lat: center.lat, lng: center.lng },
        zoom,
        {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        }
      )
    },
    zoomend: () => {
      onZoom?.(map.getZoom())
    },
  })

  return null
}

function MapController({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap()
  
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom, { animate: true })
  }, [center, zoom, map])

  return null
}

// Generate approximate boundary polygon based on property coordinates and area
const generateBoundary = (property: Property): [number, number][] => {
  // If we have actual boundary coords, use them
  if (property.boundaryCoords) {
    try {
      return JSON.parse(property.boundaryCoords)
    } catch {
      // Fall through to generate approximate boundary
    }
  }
  
  // Generate an approximate square boundary based on area
  const areaSqm = property.areaSqm
  const sideLength = Math.sqrt(areaSqm) // in meters
  const latOffset = sideLength / 111000 / 2 // Convert meters to degrees latitude
  const lngOffset = sideLength / (111000 * Math.cos(property.latitude * Math.PI / 180)) / 2 // Adjust for longitude
  
  const lat = property.latitude
  const lng = property.longitude
  
  return [
    [lat - latOffset, lng - lngOffset],
    [lat - latOffset, lng + lngOffset],
    [lat + latOffset, lng + lngOffset],
    [lat + latOffset, lng - lngOffset],
  ]
}

// Tile layers - ESRI satellite + other layers
const TILE_LAYERS: Record<string, { url: string; name: string; description: string; attribution: string }> = {
  "Satellite": {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    name: "Satellite Imagery",
    description: "ESRI high-resolution satellite imagery",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
  },
  "Land Types": {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    name: "Land Types",
    description: "OpenStreetMap land use classification",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  "Topographic": {
    url: "https://tile.opentopomap.org/{z}/{x}/{y}.png",
    name: "Topographic Map",
    description: "Terrain with contour lines",
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
  "Crime Heatmap": {
    url: "https://stamen-tiles.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png",
    name: "Crime Heatmap",
    description: "High-contrast streets for incident overlays (heatmap-ready baseline).",
    attribution: '&copy; <a href="https://stamen.com/">Stamen</a> & OpenStreetMap contributors',
  },
  "Flood Risk": {
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    name: "Flood Risk",
    description: "Humanitarian-style base map for flood exposure analysis.",
    attribution: '&copy; OpenStreetMap contributors, HOT',
  },
  "Soil Productivity": {
    url: "https://tiles.wmflabs.org/hikebike/{z}/{x}/{y}.png",
    name: "Soil Productivity",
    description: "Terrain/landform oriented view to compare agricultural potential.",
    attribution: '&copy; OpenStreetMap contributors',
  },
}

export function PropertyMap({ 
  properties, 
  onPropertyClick, 
  center, 
  zoom, 
  onMapMove, 
  onZoomChange,
  showBoundaries = true,
  activeLayer = null,
}: PropertyMapProps) {
  
  // Determine which tile layer to use
  const getTileLayer = () => {
    if (activeLayer && TILE_LAYERS[activeLayer]) {
      return TILE_LAYERS[activeLayer]
    }
    return TILE_LAYERS["Satellite"]
  }

  const tileLayer = getTileLayer()

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        className="w-full h-full"
        style={{ background: "#1a1a2e" }}
      >
        {/* Base Layer */}
        <TileLayer
          attribution={tileLayer.attribution}
          url={tileLayer.url}
        />
        
        <MapController center={center} zoom={zoom} />
        <MapEvents onMove={onMapMove} onZoom={onZoomChange} />

        {/* Property Boundaries - Show when zoomed in */}
        {showBoundaries && zoom >= 12 && properties.map((property) => {
          const boundary = generateBoundary(property)
          return (
            <Polygon
              key={`boundary-${property.id}-${property.status}-${property.isVerified ? "v" : "u"}`}
              positions={boundary}
              pathOptions={{
                color: statusColors[property.status],
                fillColor: statusColors[property.status],
                fillOpacity: 0.15,
                weight: 2,
                dashArray: property.isPartitionable ? '5, 5' : undefined,
              }}
            />
          )
        })}

        {/* Property Markers */}
        {properties.map((property) => (
          <Marker
            key={`${property.id}-${property.status}-${property.isVerified ? "v" : "u"}`}
            position={[property.latitude, property.longitude]}
            icon={statusIcons[property.status] || statusIcons.AVAILABLE}
          >
            <Popup className="property-popup">
              <Card className="w-72 border-0 shadow-lg">
                <CardContent className="p-3 space-y-2">
                  <div className="font-semibold text-sm truncate">{property.title}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {property.city}, {property.state}
                  </div>
                  
                  <Badge 
                    style={{ backgroundColor: statusColors[property.status] }}
                    className="text-white text-xs"
                  >
                    {property.status}
                  </Badge>

                  {property.isPartitionable && (
                    <Badge variant="outline" className="text-xs border-blue-500 text-blue-500 ml-1">
                      Partitionable
                    </Badge>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <AreaChart className="h-3 w-3 text-muted-foreground" />
                      <span>{property.areaSqm.toLocaleString()} m²</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      <span>${property.pricePerSqm.toLocaleString()}/m²</span>
                    </div>
                  </div>

                  {property.type !== "LAND" && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {property.bedrooms && (
                        <div className="flex items-center gap-1">
                          <Bed className="h-3 w-3 text-muted-foreground" />
                          <span>{property.bedrooms} beds</span>
                        </div>
                      )}
                      {property.bathrooms && (
                        <div className="flex items-center gap-1">
                          <Bath className="h-3 w-3 text-muted-foreground" />
                          <span>{property.bathrooms} baths</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <div className="text-lg font-bold text-primary">
                      ${property.totalPrice.toLocaleString()}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => onPropertyClick(property)}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-card/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
        <div className="text-xs font-semibold mb-2">Property Status</div>
        <div className="space-y-1.5">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span>{status.charAt(0) + status.slice(1).toLowerCase()}</span>
            </div>
          ))}
        </div>
        {showBoundaries && (
          <>
            <div className="border-t my-2" />
            <div className="text-xs text-muted-foreground">
              Zoom in to see boundaries
            </div>
          </>
        )}
      </div>

      {/* Active Layer Indicator */}
      {activeLayer && (
        <div className="absolute top-4 right-4 z-[1000] bg-card/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border max-w-xs">
          <div className="text-xs font-semibold mb-1 flex items-center gap-2">
            <Layers className="w-3 h-3" />
            {TILE_LAYERS[activeLayer]?.name || activeLayer}
          </div>
          <div className="text-xs text-muted-foreground">
            {TILE_LAYERS[activeLayer]?.description || "Map layer active"}
          </div>
          
          {/* Land Types Legend */}
          {(activeLayer === "Land Types" || activeLayer === "Crime Heatmap" || activeLayer === "Flood Risk" || activeLayer === "Soil Productivity") && (
            <div className="mt-2 pt-2 border-t space-y-1">
              <div className="text-xs font-medium mb-1">Map Legend</div>
              {activeLayer === "Land Types" && (
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-200"></div><span>Forest/Park</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-200"></div><span>Farmland</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-300"></div><span>Residential</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-500"></div><span>Commercial</span></div>
                </div>
              )}
              {activeLayer === "Crime Heatmap" && (
                <div className="text-[10px] text-muted-foreground">
                  Dark corridors are ideal for incident-density overlays. Use this as a crime analysis base.
                </div>
              )}
              {activeLayer === "Flood Risk" && (
                <div className="text-[10px] text-muted-foreground">
                  Use this layer with flood-zone data to prioritize resilient listings.
                </div>
              )}
              {activeLayer === "Soil Productivity" && (
                <div className="text-[10px] text-muted-foreground">
                  Terrain-focused view for agricultural and land development decisions.
                </div>
              )}
              <div className="text-[9px] text-muted-foreground mt-1">
                Source: OpenStreetMap contributors
              </div>
            </div>
          )}
        </div>
      )}

      {/* Zoom hint */}
      <div className="absolute top-4 left-4 z-[1000] bg-card/95 backdrop-blur-sm rounded-lg p-2 shadow-lg border">
        <div className="text-xs text-muted-foreground">
          Zoom: {zoom} {zoom < 6 && '• Zoom in for details'}
        </div>
      </div>
    </div>
  )
}
