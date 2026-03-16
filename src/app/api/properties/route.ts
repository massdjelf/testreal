import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// GET properties with filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const state = searchParams.get("state")
    const city = searchParams.get("city")
    const status = searchParams.get("status")
    const type = searchParams.get("type")
    const minPrice = searchParams.get("minPrice")
    const maxPrice = searchParams.get("maxPrice")
    const minArea = searchParams.get("minArea")
    const maxArea = searchParams.get("maxArea")
    const includeUnverified = searchParams.get("includeUnverified") === "true"
    const ownerId = searchParams.get("ownerId")
    
    // Map bounds for lazy loading
    const north = searchParams.get("north")
    const south = searchParams.get("south")
    const east = searchParams.get("east")
    const west = searchParams.get("west")

    const where: Record<string, unknown> = {}
    
    // Only filter by verification status if not explicitly including unverified
    if (!includeUnverified) {
      where.isVerified = true
    }
    
    // Filter by owner (for vendor panel)
    if (ownerId) {
      where.ownerId = ownerId
    }

    if (state) {
      where.state = { contains: state, mode: "insensitive" }
    }
    if (city) {
      where.city = { contains: city, mode: "insensitive" }
    }
    if (status) {
      where.status = status
    }
    if (type) {
      where.type = type
    }
    if (minPrice || maxPrice) {
      where.totalPrice = {}
      if (minPrice) (where.totalPrice as Record<string, number>).gte = parseFloat(minPrice)
      if (maxPrice) (where.totalPrice as Record<string, number>).lte = parseFloat(maxPrice)
    }
    if (minArea || maxArea) {
      where.areaSqm = {}
      if (minArea) (where.areaSqm as Record<string, number>).gte = parseFloat(minArea)
      if (maxArea) (where.areaSqm as Record<string, number>).lte = parseFloat(maxArea)
    }

    // Filter by map bounds (lazy loading)
    if (north && south && east && west) {
      where.latitude = {
        gte: parseFloat(south),
        lte: parseFloat(north),
      }
      where.longitude = {
        gte: parseFloat(west),
        lte: parseFloat(east),
      }
    }

    const properties = await db.property.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        bids: {
          where: { status: "PENDING" },
          orderBy: { amount: "desc" },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(properties)
  } catch (error) {
    console.error("Error fetching properties:", error)
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    )
  }
}

// POST create new property
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      type,
      address,
      city,
      state,
      country,
      zipCode,
      latitude,
      longitude,
      areaSqm,
      pricePerSqm,
      bedrooms,
      bathrooms,
      yearBuilt,
      boundaryCoords,
      images,
      ownerId,
      isPartitionable,
      minPartitionSize,
    } = body

    // Calculate prices properly
    const parsedAreaSqm = parseFloat(areaSqm) || 1000
    const parsedPricePerSqm = parseFloat(pricePerSqm) || 0
    const totalPrice = parsedAreaSqm * parsedPricePerSqm
    const areaSqf = parsedAreaSqm * 10.7639 // Convert m² to ft²
    const pricePerSqf = parsedPricePerSqm / 10.7639 // Convert per m² to per ft²

    const property = await db.property.create({
      data: {
        title,
        description,
        type: type || "LAND",
        status: "PENDING",
        address,
        city,
        state,
        country: country || "USA",
        zipCode,
        latitude: parseFloat(latitude) || 39.8283,
        longitude: parseFloat(longitude) || -98.5795,
        areaSqm: parsedAreaSqm,
        areaSqf: parseFloat(areaSqf.toFixed(2)),
        pricePerSqm: parsedPricePerSqm,
        pricePerSqf: parseFloat(pricePerSqf.toFixed(2)),
        totalPrice: parseFloat(totalPrice.toFixed(2)),
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
        boundaryCoords,
        images,
        ownerId,
        isVerified: false,
        isPartitionable: isPartitionable || false,
        minPartitionSize: minPartitionSize ? parseFloat(minPartitionSize) : null,
      },
    })

    return NextResponse.json(property)
  } catch (error) {
    console.error("Error creating property:", error)
    return NextResponse.json(
      { error: "Failed to create property" },
      { status: 500 }
    )
  }
}
