import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      phone,
      vendorAddress,
      vendorIdNumber,
      vendorFeePaid,
    } = body

    if (!userId || !phone || !vendorAddress || !vendorIdNumber) {
      return NextResponse.json(
        { error: "userId, phone, address, and ID number are required" },
        { status: 400 }
      )
    }

    if (!vendorFeePaid) {
      return NextResponse.json(
        { error: "Processing fee confirmation is required" },
        { status: 400 }
      )
    }

    const existingUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        vendorStatus: true,
      },
    })

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (
      existingUser.role === "VENDOR" ||
      existingUser.role === "PREMIUM_VENDOR" ||
      existingUser.vendorStatus === "APPROVED"
    ) {
      return NextResponse.json(
        { error: "This account already has vendor access" },
        { status: 400 }
      )
    }

    const user = await db.user.update({
      where: { id: userId },
      data: {
        phone,
        vendorAddress,
        vendorIdNumber,
        vendorFeePaid: true,
        vendorStatus: "PENDING",
        vendorRequestedAt: new Date(),
        vendorReviewedAt: null,
        vendorReviewedBy: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        vendorStatus: true,
        phone: true,
        vendorAddress: true,
        vendorIdNumber: true,
        vendorFeePaid: true,
        vendorRequestedAt: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error submitting vendor application:", error)
    return NextResponse.json(
      { error: "Failed to submit vendor application" },
      { status: 500 }
    )
  }
}
