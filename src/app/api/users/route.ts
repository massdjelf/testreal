import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

function buildUserSelect(includeCounts: boolean) {
  return {
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
    vendorReviewedAt: true,
    vendorReviewedBy: true,
    subscriptionPlan: true,
    premiumExpiry: true,
    propertiesViewed: true,
    createdAt: true,
    ...(includeCounts
      ? {
          _count: {
            select: {
              properties: true,
              bids: true,
            },
          },
        }
      : {}),
  }
}

// GET users, individual profiles, or admin summary
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get("role")
    const vendorStatus = searchParams.get("vendorStatus")
    const userId = searchParams.get("userId")
    const summary = searchParams.get("summary") === "true"
    const includeCounts = searchParams.get("includeCounts") !== "false"
    const limit = Number(searchParams.get("limit") || "50")

    if (summary) {
      const [
        totalUsers,
        pendingVendorApplications,
        totalApprovedVendors,
        premiumUsers,
      ] = await Promise.all([
        db.user.count(),
        db.user.count({ where: { vendorStatus: "PENDING" } }),
        db.user.count({ where: { vendorStatus: "APPROVED" } }),
        db.user.count({ where: { subscriptionPlan: "PREMIUM" } }),
      ])

      return NextResponse.json({
        totalUsers,
        pendingVendorApplications,
        totalApprovedVendors,
        premiumUsers,
      })
    }

    if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: buildUserSelect(includeCounts),
      })

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      return NextResponse.json(user)
    }

    const where: Record<string, unknown> = {}

    if (role) {
      where.role = role
    }

    if (vendorStatus) {
      where.vendorStatus = vendorStatus
    }

    const users = await db.user.findMany({
      where,
      select: buildUserSelect(includeCounts),
      orderBy: {
        createdAt: "desc",
      },
      take: Number.isFinite(limit) ? Math.min(limit, 100) : 50,
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

// PATCH - Update user role/vendor approval/premium status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, role, premiumExpiry, vendorStatus, vendorReviewedBy } = body

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    const currentUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        subscriptionPlan: true,
        vendorStatus: true,
      },
    })

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (role) {
      updateData.role = role
      if (role === "PREMIUM_USER" || role === "PREMIUM_VENDOR") {
        updateData.subscriptionPlan = "PREMIUM"
      } else {
        updateData.subscriptionPlan = "FREE"
      }
    }

    if (vendorStatus) {
      updateData.vendorStatus = vendorStatus
      updateData.vendorReviewedAt = new Date()
      updateData.vendorReviewedBy = vendorReviewedBy || null

      if (vendorStatus === "APPROVED") {
        if (currentUser.role === "PREMIUM_USER") {
          updateData.role = "PREMIUM_VENDOR"
          updateData.subscriptionPlan = "PREMIUM"
        } else if (currentUser.role === "USER") {
          updateData.role = "VENDOR"
        }
      }

      if (vendorStatus === "REJECTED" && currentUser.role === "VENDOR") {
        updateData.role = "USER"
        updateData.subscriptionPlan = "FREE"
      }
    }

    if (premiumExpiry) {
      updateData.premiumExpiry = new Date(premiumExpiry)
    }

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: buildUserSelect(true),
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
