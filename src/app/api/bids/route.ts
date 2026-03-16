import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { propertyId, userId, amount, message, partitionSize, partitionCoords } = body

    // Check if property exists and is in bidding status
    const property = await db.property.findUnique({
      where: { id: propertyId },
    })

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 })
    }

    if (property.status === "SOLD") {
      return NextResponse.json(
        { error: "This property has already been sold" },
        { status: 400 }
      )
    }

    // For partition bids, validate the size
    if (partitionSize) {
      const minSize = property.minPartitionSize || 100
      if (partitionSize < minSize) {
        return NextResponse.json(
          { error: `Minimum partition size is ${minSize} m²` },
          { status: 400 }
        )
      }
      if (partitionSize > property.areaSqm) {
        return NextResponse.json(
          { error: `Partition size cannot exceed property size (${property.areaSqm} m²)` },
          { status: 400 }
        )
      }
    }

    // Create bid
    const bid = await db.bid.create({
      data: {
        propertyId,
        userId,
        amount: parseFloat(amount),
        message,
        partitionSize: partitionSize ? parseFloat(partitionSize) : null,
        // Store partition coordinates if provided
        ...(partitionCoords && { partitionId: partitionCoords }),
        status: "PENDING",
      },
      include: {
        property: {
          select: { title: true }
        },
        user: {
          select: { name: true, email: true }
        }
      }
    })

    // Update property status to BIDDING if it was AVAILABLE
    if (property.status === "AVAILABLE") {
      await db.property.update({
        where: { id: propertyId },
        data: { status: "BIDDING" },
      })
    }

    return NextResponse.json(bid)
  } catch (error) {
    console.error("Error creating bid:", error)
    return NextResponse.json(
      { error: "Failed to create bid" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const propertyId = searchParams.get("propertyId")
    const userId = searchParams.get("userId")
    const partition = searchParams.get("partition")
    const vendorId = searchParams.get("vendorId")

    const where: Record<string, unknown> = {}
    if (propertyId) where.propertyId = propertyId
    if (userId) where.userId = userId
    
    // Filter for partition bids only
    if (partition === "true") {
      where.partitionSize = { not: null }
    }
    
    // Filter by vendor (property owner)
    if (vendorId) {
      const vendorProperties = await db.property.findMany({
        where: { ownerId: vendorId },
        select: { id: true }
      })
      where.propertyId = { in: vendorProperties.map(p => p.id) }
    }

    const bids = await db.bid.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            state: true,
            ownerId: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(bids)
  } catch (error) {
    console.error("Error fetching bids:", error)
    return NextResponse.json(
      { error: "Failed to fetch bids" },
      { status: 500 }
    )
  }
}
