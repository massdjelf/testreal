"use client"

import { useEffect, useRef, useCallback } from "react"
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Button } from "@/components/ui/button"
import { Undo2, Trash, Check } from "lucide-react"

interface BoundaryDrawingMapProps {
  points: [number, number][]
  onPointsChange: (points: [number, number][]) => void
  center?: { lat: number; lng: number }
}

// Custom draggable marker icon
const createDraggableIcon = (index: number, isFirst: boolean) => {
  return L.divIcon({
    className: "custom-draggable-marker",
    html: `
      <div style="
        width: 28px;
        height: 28px;
        background: ${isFirst ? '#22c55e' : '#ef4444'};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: bold;
      ">
        ${index + 1}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function DrawingLayer({ 
  points, 
  onPointsChange 
}: { 
  points: [number, number][] 
  onPointsChange: (points: [number, number][]) => void 
}) {
  const map = useMap()
  const markersRef = useRef<L.Marker[]>([])
  const polygonRef = useRef<L.Polygon | null>(null)

  // Update markers and polygon when points change
  useEffect(() => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Remove existing polygon
    if (polygonRef.current) {
      polygonRef.current.remove()
    }

    // Add new markers
    points.forEach((point, index) => {
      const marker = L.marker([point[0], point[1]], {
        icon: createDraggableIcon(index, index === 0),
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

    // Add polygon if we have at least 3 points
    if (points.length >= 3) {
      polygonRef.current = L.polygon(points, {
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.2,
        weight: 3,
        dashArray: '5, 5',
      }).addTo(map)
    } else if (points.length === 2) {
      // Draw a line for 2 points
      polygonRef.current = L.polyline(points, {
        color: '#ef4444',
        weight: 3,
        dashArray: '5, 5',
      }).addTo(map)
    }

    return () => {
      markersRef.current.forEach(marker => marker.remove())
      if (polygonRef.current) {
        polygonRef.current.remove()
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
      map.setView([center.lat, center.lng], 15, { animate: true })
    }
  }, [center, map])

  return null
}

export function BoundaryDrawingMap({ points, onPointsChange, center }: BoundaryDrawingMapProps) {
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

      {/* Instructions */}
      <div className="absolute bottom-2 left-2 right-2 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg p-2 text-xs text-center shadow-md">
        {points.length < 3 ? (
          <span>Click on the map to add boundary points ({3 - points.length} more needed)</span>
        ) : (
          <span className="text-green-600">✓ Polygon complete! Click "Complete" or add more points.</span>
        )}
      </div>

      {/* Map */}
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={center ? 15 : 4}
        className="w-full h-64 rounded-lg"
        style={{ background: "#1a1a2e" }}
      >
        {/* Satellite Base Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        {/* Labels overlay */}
        <TileLayer
          url="https://stamen-tiles.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}.png"
          opacity={0.5}
        />
        <MapController center={center} />
        <DrawingLayer points={points} onPointsChange={onPointsChange} />
      </MapContainer>
    </div>
  )
}
