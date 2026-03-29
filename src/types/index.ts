export type { Session } from "next-auth"

export interface Property {
  id: string
  title: string
  description: string | null
  type: "LAND" | "HOUSE" | "APARTMENT" | "COMMERCIAL" | "INDUSTRIAL"
  status: "AVAILABLE" | "SOLD" | "BIDDING" | "PENDING"
  address: string
  city: string
  state: string
  country: string
  zipCode: string | null
  latitude: number
  longitude: number
  areaSqm: number
  areaSqf: number
  pricePerSqm: number
  pricePerSqf: number
  totalPrice: number
  bedrooms: number | null
  bathrooms: number | null
  yearBuilt: number | null
  boundaryCoords: string | null
  images: string | null
  ownerId: string
  isVerified: boolean
  isPartitionable: boolean
  minPartitionSize: number | null
  verifiedBy: string | null
  verifiedAt: Date | null
  soilQuality: string | null
  crimeRate: string | null
  floodZone: string | null
  createdAt: Date
  updatedAt: Date
  owner?: {
    id: string
    name: string | null
    email: string
    phone?: string | null
  }
  bids?: Bid[]
}

export interface Bid {
  id: string
  propertyId: string
  userId: string
  amount: number
  message: string | null
  status: string
  partitionId?: string | null
  partitionSize?: number | null
  createdAt: Date
  updatedAt: Date
  user?: {
    id: string
    name: string | null
    email: string
  }
}

export interface User {
  id: string
  email: string
  name: string | null
  role: "USER" | "VENDOR" | "ADMIN" | "PREMIUM_USER" | "PREMIUM_VENDOR"
  vendorStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED"
  phone: string | null
  avatar: string | null
  vendorAddress?: string | null
  vendorIdNumber?: string | null
  vendorFeePaid?: boolean
  vendorRequestedAt?: Date | null
  vendorReviewedAt?: Date | null
  vendorReviewedBy?: string | null
  subscriptionPlan: "FREE" | "PREMIUM" | "ENTERPRISE"
  propertiesViewed: number
  createdAt: Date
  updatedAt: Date
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface LocationSearch {
  query: string
  type: "state" | "city"
}

export interface Region {
  id: string
  name: string
  type: "continent" | "country" | "state" | "city"
  parentId: string | null
  latitude: number
  longitude: number
  zoomLevel: number
}
