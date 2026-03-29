import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

async function uploadToCloudinary(file: File) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET.")
  }

  const payload = new FormData()
  payload.append("file", file)
  payload.append("upload_preset", uploadPreset)
  payload.append("folder", "landmap/documents")

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: payload,
  })

  if (!response.ok) {
    const cloudinaryError = await response.text()
    throw new Error(`Cloudinary upload failed: ${cloudinaryError}`)
  }

  const data = await response.json()
  return data.secure_url as string
}

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

    if (userId) {
      const userProperties = await db.property.findMany({
        where: { ownerId: userId },
        select: { id: true },
      })
      where.propertyId = { in: userProperties.map((p) => p.id) }
    }

    const documents = await db.document.findMany({
      where,
      include: {
        property: {
          select: { title: true },
        },
      },
      orderBy: { uploadedAt: "desc" },
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
    const userId = formData.get("userId") as string
    const type = (formData.get("type") as string) || "other"

    if (!file || !propertyId || !userId) {
      return NextResponse.json(
        { error: "File, propertyId, and userId are required" },
        { status: 400 }
      )
    }

    const property = await db.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        ownerId: true,
      },
    })

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      )
    }

    if (property.ownerId !== userId) {
      return NextResponse.json(
        { error: "You can only upload documents for your own properties" },
        { status: 403 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const fileUrl = await uploadToCloudinary(file)

    const document = await db.document.create({
      data: {
        propertyId,
        name: file.name,
        url: fileUrl,
        type,
        userId,
        status: "PENDING",
      },
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error("Error uploading document:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload document",
      },
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
