"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Search,
  Home,
  Building,
  Factory,
  TreePine,
  SlidersHorizontal,
} from "lucide-react"

interface FilterPanelProps {
  onSearch: (query: string) => void
  onFilterChange: (filters: FilterState) => void
  onReset: () => void
  propertyCount: number
}

export interface FilterState {
  status: string | null
  type: string | null
  minPrice: number
  maxPrice: number
  minArea: number
  maxArea: number
}

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming"
]

const propertyTypes = [
  { value: "LAND", label: "Land", icon: TreePine },
  { value: "HOUSE", label: "House", icon: Home },
  { value: "APARTMENT", label: "Apartment", icon: Building },
  { value: "COMMERCIAL", label: "Commercial", icon: Building },
  { value: "INDUSTRIAL", label: "Industrial", icon: Factory },
]

export function FilterPanel({ onSearch, onFilterChange, onReset, propertyCount }: FilterPanelProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<FilterState>({
    status: null,
    type: null,
    minPrice: 0,
    maxPrice: 10000000,
    minArea: 0,
    maxArea: 100000,
  })

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchQuery)
  }

  const handleFilterUpdate = (key: keyof FilterState, value: unknown) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const activeFiltersCount = [
    filters.status,
    filters.type,
    filters.minPrice > 0,
    filters.maxPrice < 10000000,
    filters.minArea > 0,
    filters.maxArea < 100000,
  ].filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by state, city, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {/* Quick Status Filters */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={filters.status === null ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => handleFilterUpdate("status", null)}
        >
          All
        </Badge>
        <Badge
          variant={filters.status === "AVAILABLE" ? "default" : "outline"}
          className="cursor-pointer bg-red-500 hover:bg-red-600 text-white"
          onClick={() => handleFilterUpdate("status", filters.status === "AVAILABLE" ? null : "AVAILABLE")}
        >
          Available
        </Badge>
        <Badge
          variant={filters.status === "BIDDING" ? "default" : "outline"}
          className="cursor-pointer bg-gray-500 hover:bg-gray-600 text-white"
          onClick={() => handleFilterUpdate("status", filters.status === "BIDDING" ? null : "BIDDING")}
        >
          In Bidding
        </Badge>
        <Badge
          variant={filters.status === "SOLD" ? "default" : "outline"}
          className="cursor-pointer bg-green-500 hover:bg-green-600 text-white"
          onClick={() => handleFilterUpdate("status", filters.status === "SOLD" ? null : "SOLD")}
        >
          Sold
        </Badge>

        {/* Advanced Filters */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 ml-auto">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Advanced Filters</SheetTitle>
              <SheetDescription>
                Refine your property search
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Property Type */}
              <div className="space-y-2">
                <Label>Property Type</Label>
                <Select
                  value={filters.type || "all"}
                  onValueChange={(value) => handleFilterUpdate("type", value === "all" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {propertyTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <Label>Price Range</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min $"
                    value={filters.minPrice || ""}
                    onChange={(e) => handleFilterUpdate("minPrice", parseInt(e.target.value) || 0)}
                  />
                  <Input
                    type="number"
                    placeholder="Max $"
                    value={filters.maxPrice === 10000000 ? "" : filters.maxPrice}
                    onChange={(e) => handleFilterUpdate("maxPrice", parseInt(e.target.value) || 10000000)}
                  />
                </div>
              </div>

              {/* Area Range */}
              <div className="space-y-2">
                <Label>Area (m²)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min m²"
                    value={filters.minArea || ""}
                    onChange={(e) => handleFilterUpdate("minArea", parseInt(e.target.value) || 0)}
                  />
                  <Input
                    type="number"
                    placeholder="Max m²"
                    value={filters.maxArea === 100000 ? "" : filters.maxArea}
                    onChange={(e) => handleFilterUpdate("maxArea", parseInt(e.target.value) || 100000)}
                  />
                </div>
              </div>

              {/* Reset Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setFilters({
                    status: null,
                    type: null,
                    minPrice: 0,
                    maxPrice: 10000000,
                    minArea: 0,
                    maxArea: 100000,
                  })
                  onReset()
                }}
              >
                Reset All Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {propertyCount.toLocaleString()} properties found
      </div>
    </div>
  )
}
