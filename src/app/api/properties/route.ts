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
    const pendingOnly = searchParams.get("pendingOnly") === "true"
    const summary = searchParams.get("summary") === "true"
    const ownerId = searchParams.get("ownerId")
    const limit = Number(searchParams.get("limit") || "100")

    const north = searchParams.get("north")
    const south = searchParams.get("south")
    const east = searchParams.get("east")
    const west = searchParams.get("west")

    const where: Record<string, unknown> = {}

    if (!includeUnverified) {
      where.isVerified = true
    }

    if (pendingOnly) {
      where.isVerified = false
    }

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

    if (summary) {
      const [totalProperties, pendingProperties, aggregates] = await Promise.all([
        db.property.count({
          where: includeUnverified ? undefined : { isVerified: true },
        }),
        db.property.count({
          where: { isVerified: false },
        }),
        db.property.aggregate({
          where: includeUnverified ? undefined : { isVerified: true },
          _sum: {
            totalPrice: true,
          },
        }),
      ])

      return NextResponse.json({
        totalProperties,
        pendingProperties,
        totalValue: aggregates._sum.totalPrice ?? 0,
      })
    }

    const properties = await db.property.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
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
      take: Number.isFinite(limit) ? Math.min(limit, 200) : 100,
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

    const owner = await db.user.findUnique({
      where: { id: ownerId },
      select: {
        role: true,
        vendorStatus: true,
      },
    })

    if (!owner) {
      return NextResponse.json({ error: "Owner not found" }, { status: 404 })
    }

    const hasVendorWriteAccess =
      owner.role === "ADMIN" ||
      owner.role === "VENDOR" ||
      owner.role === "PREMIUM_VENDOR"

    if (!hasVendorWriteAccess || owner.vendorStatus === "PENDING") {
      return NextResponse.json(
        { error: "Vendor approval is required before publishing properties" },
        { status: 403 }
      )
    }

    const parsedAreaSqm = parseFloat(areaSqm) || 1000
    const parsedPricePerSqm = parseFloat(pricePerSqm) || 0
    const totalPrice = parsedAreaSqm * parsedPricePerSqm
    const areaSqf = parsedAreaSqm * 10.7639
    const pricePerSqf = parsedPricePerSqm / 10.7639

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
