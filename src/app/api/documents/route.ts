import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// GET documents for vendor
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const propertyId = searchParams.get("propertyId")
    const userId = searchParams.get("userId")

    const where: Record<string, unknown> = {}

    if (propertyId) {
      where.propertyId = propertyId
    }

    // If userId provided, filter to user's properties
    if (userId) {
      const userProperties = await db.property.findMany({
        where: { ownerId: userId },
        select: { id: true }
      })
      where.propertyId = { in: userProperties.map(p => p.id) }
    }

    const documents = await db.document.findMany({
      where,
      include: {
        property: {
          select: { title: true }
        }
      },
      orderBy: { uploadedAt: "desc" }
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error("Error fetching documents:", error)
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    )
  }
}

// POST - Upload document
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const propertyId = formData.get("propertyId") as string
    const type = formData.get("type") as string || "other"

    if (!file || !propertyId) {
      return NextResponse.json(
        { error: "File and propertyId are required" },
        { status: 400 }
      )
    }

    // In a real app, you would upload to cloud storage (S3, Cloudflare R2, etc.)
    // For demo, we'll just create a record with a placeholder URL
    const fileName = `${Date.now()}-${file.name}`
    const fileUrl = `/uploads/${fileName}`

    const document = await db.document.create({
      data: {
        propertyId,
        name: file.name,
        url: fileUrl,
        type,
        userId: "system", // Would be actual user ID from session
        status: "PENDING",
      },
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error("Error uploading document:", error)
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    )
  }
}

// PATCH - Update document status (for admin verification)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { documentId, status } = body

    if (!documentId || !status) {
      return NextResponse.json(
        { error: "documentId and status are required" },
        { status: 400 }
      )
    }

    const document = await db.document.update({
      where: { id: documentId },
      data: { status },
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error("Error updating document:", error)
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    )
  }
}
