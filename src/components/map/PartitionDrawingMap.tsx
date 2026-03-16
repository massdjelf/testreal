"use client"

import { useEffect, useRef, useCallback } from "react"
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Button } from "@/components/ui/button"
import { Undo2, Trash, Check } from "lucide-react"

interface PartitionDrawingMapProps {
  points: [number, number][]
  onPointsChange: (points: [number, number][]) => void
  center?: { lat: number; lng: number }
  propertyBoundary?: [number, number][]  // The original property boundary in orange
}

// Custom draggable marker icon for partition points
const createPartitionIcon = (index: number) => {
  return L.divIcon({
    className: "partition-marker",
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: #3b82f6;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 10px;
        font-weight: bold;
      ">
        ${index + 1}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

// Generate boundary from center if no boundary provided
const generateApproximateBoundary = (center: { lat: number; lng: number }, areaSqm: number = 10000): [number, number][] => {
  const sideLength = Math.sqrt(areaSqm)
  const latOffset = sideLength / 111000 / 2
  const lngOffset = sideLength / (111000 * Math.cos(center.lat * Math.PI / 180)) / 2
  
  return [
    [center.lat - latOffset, center.lng - lngOffset],
    [center.lat - latOffset, center.lng + lngOffset],
    [center.lat + latOffset, center.lng + lngOffset],
    [center.lat + latOffset, center.lng - lngOffset],
  ]
}

function DrawingLayer({ 
  points, 
  onPointsChange,
  propertyBoundary,
  center,
}: { 
  points: [number, number][] 
  onPointsChange: (points: [number, number][]) => void
  propertyBoundary?: [number, number][]
  center: { lat: number; lng: number }
}) {
  const map = useMap()
  const markersRef = useRef<L.Marker[]>([])
  const partitionPolygonRef = useRef<L.Polygon | null>(null)
  const propertyBoundaryRef = useRef<L.Polygon | null>(null)
  const initializedRef = useRef(false)

  // Draw property boundary (in orange) - this is the ORIGINAL property
  useEffect(() => {
    // Clear previous boundary
    if (propertyBoundaryRef.current) {
      propertyBoundaryRef.current.remove()
      propertyBoundaryRef.current = null
    }

    // Use provided boundary or generate approximate one
    const boundary = propertyBoundary && propertyBoundary.length >= 3 
      ? propertyBoundary 
      : generateApproximateBoundary(center)

    if (boundary && boundary.length >= 3) {
      propertyBoundaryRef.current = L.polygon(boundary, {
        color: '#f59e0b', // Orange border for original property
        fillColor: '#fbbf24',
        fillOpacity: 0.15,
        weight: 3,
        dashArray: '10, 5',
      }).addTo(map)
      
      // Fit map to property boundary only once
      if (!initializedRef.current) {
        try {
          const bounds = L.latLngBounds(boundary)
          map.fitBounds(bounds, { padding: [50, 50] })
          initializedRef.current = true
        } catch (e) {
          console.error('Error fitting bounds:', e)
        }
      }
    }

    return () => {
      if (propertyBoundaryRef.current) {
        propertyBoundaryRef.current.remove()
      }
    }
  }, [propertyBoundary, center, map])

  // Update partition markers and polygon (in blue) - user's drawn partition
  useEffect(() => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Remove existing partition polygon
    if (partitionPolygonRef.current) {
      partitionPolygonRef.current.remove()
    }

    // Add new markers for partition
    points.forEach((point, index) => {
      const marker = L.marker([point[0], point[1]], {
        icon: createPartitionIcon(index),
        draggable: true,
      })
        .addTo(map)
        .on("drag", (e) => {
          const newLatLng = e.target.getLatLng()
          const newPoints = [...points]
          newPoints[index] = [newLatLng.lat, newLatLng.lng]
          onPointsChange(newPoints)
        })
      
      markersRef.current.push(marker)
    })

    // Add partition polygon (in blue) if we have at least 3 points
    if (points.length >= 3) {
      partitionPolygonRef.current = L.polygon(points, {
        color: '#3b82f6', // Blue for partition
        fillColor: '#3b82f6',
        fillOpacity: 0.35,
        weight: 3,
        dashArray: '5, 5',
      }).addTo(map)
    } else if (points.length === 2) {
      // Draw a line for 2 points
      partitionPolygonRef.current = L.polyline(points, {
        color: '#3b82f6',
        weight: 3,
        dashArray: '5, 5',
      }).addTo(map)
    }

    return () => {
      markersRef.current.forEach(marker => marker.remove())
      if (partitionPolygonRef.current) {
        partitionPolygonRef.current.remove()
      }
    }
  }, [points, map, onPointsChange])

  // Handle map clicks to add points
  useMapEvents({
    click: (e) => {
      const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng]
      onPointsChange([...points, newPoint])
    },
  })

  return null
}

function MapController({ center }: { center?: { lat: number; lng: number } }) {
  const map = useMap()

  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], 16, { animate: true })
    }
  }, [center, map])

  return null
}

export function PartitionDrawingMap({ 
  points, 
  onPointsChange, 
  propertyBoundary,
  center 
}: PartitionDrawingMapProps) {
  const mapCenter = center || { lat: 39.8283, lng: -98.5795 }

  const handleUndo = useCallback(() => {
    if (points.length > 0) {
      onPointsChange(points.slice(0, -1))
    }
  }, [points, onPointsChange])

  const handleClear = useCallback(() => {
    onPointsChange([])
  }, [onPointsChange])

  const handleComplete = useCallback(() => {
    if (points.length >= 3) {
      // Close the polygon by adding the first point at the end if not already closed
      const isClosed = points[0][0] === points[points.length - 1][0] && 
                       points[0][1] === points[points.length - 1][1]
      if (!isClosed) {
        onPointsChange([...points, points[0]])
      }
    }
  }, [points, onPointsChange])

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="absolute top-2 left-2 z-[1000] flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleUndo}
          disabled={points.length === 0}
          className="bg-white/90 hover:bg-white shadow-md"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleClear}
          disabled={points.length === 0}
          className="bg-white/90 hover:bg-white shadow-md"
        >
          <Trash className="w-4 h-4" />
        </Button>
        {points.length >= 3 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleComplete}
            className="bg-green-500 hover:bg-green-600 text-white shadow-md"
          >
            <Check className="w-4 h-4 mr-1" />
            Complete
          </Button>
        )}
      </div>

      {/* Legend */}
      <div className="absolute top-2 right-2 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg p-2 text-xs shadow-md border">
        <div className="font-semibold mb-1">Legend</div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-2 border-2 border-orange-500" style={{ background: 'rgba(251, 191, 36, 0.3)' }}></div>
          <span>Property Boundary</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-2 border-2 border-blue-500" style={{ background: 'rgba(59, 130, 246, 0.4)' }}></div>
          <span>Your Partition</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-2 left-2 right-2 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg p-2 text-xs text-center shadow-md">
        {points.length < 3 ? (
          <span className="text-foreground">Click on the map to draw your desired partition area ({3 - points.length} more points needed)</span>
        ) : (
          <span className="text-green-600 font-medium">✓ Partition area drawn! Click &quot;Complete&quot; or add more points to adjust.</span>
        )}
      </div>

      {/* Map */}
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={16}
        className="w-full h-64 rounded-lg"
        style={{ background: "#1a1a2e" }}
      >
        {/* Standard map layer - no auth required */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={center} />
        <DrawingLayer 
          points={points} 
          onPointsChange={onPointsChange}
          propertyBoundary={propertyBoundary}
          center={mapCenter}
        />
      </MapContainer>
    </div>
  )
}
