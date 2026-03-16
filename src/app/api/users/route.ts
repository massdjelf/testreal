import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// GET all users
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get("role")
    
    const where: Record<string, unknown> = {}
    
    if (role) {
      where.role = role
    }
    
    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        subscriptionPlan: true,
        premiumExpiry: true,
        propertiesViewed: true,
        createdAt: true,
        _count: {
          select: {
            properties: true,
            bids: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}

// PATCH - Update user role (for premium upgrade)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, role, premiumExpiry } = body

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    
    if (role) {
      updateData.role = role
      // Update subscription plan based on role
      if (role === "PREMIUM_USER" || role === "PREMIUM_VENDOR") {
        updateData.subscriptionPlan = "PREMIUM"
      } else {
        updateData.subscriptionPlan = "FREE"
      }
    }
    
    if (premiumExpiry) {
      updateData.premiumExpiry = new Date(premiumExpiry)
    }

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionPlan: true,
        premiumExpiry: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}
