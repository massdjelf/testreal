import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const bid = await db.bid.findUnique({
      where: { id },
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
    })

    if (!bid) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 })
    }

    return NextResponse.json(bid)
  } catch (error) {
    console.error("Error fetching bid:", error)
    return NextResponse.json(
      { error: "Failed to fetch bid" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    // Validate status
    const validStatuses = ["PENDING", "ACCEPTED", "REJECTED"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be PENDING, ACCEPTED, or REJECTED" },
        { status: 400 }
      )
    }

    // Get the bid with property info
    const existingBid = await db.bid.findUnique({
      where: { id },
      include: {
        property: {
          select: { id: true, status: true, ownerId: true }
        }
      }
    })

    if (!existingBid) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 })
    }

    // Update the bid status
    const updatedBid = await db.bid.update({
      where: { id },
      data: { status },
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
    })

    // If bid is accepted, update property status
    if (status === "ACCEPTED") {
      await db.property.update({
        where: { id: existingBid.propertyId },
        data: { status: "PENDING" }, // Pending sale completion
      })
    }

    return NextResponse.json(updatedBid)
  } catch (error) {
    console.error("Error updating bid:", error)
    return NextResponse.json(
      { error: "Failed to update bid" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await db.bid.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting bid:", error)
    return NextResponse.json(
      { error: "Failed to delete bid" },
      { status: 500 }
    )
  }
}
