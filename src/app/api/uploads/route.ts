import { NextRequest, NextResponse } from "next/server"

async function uploadToCloudinary(file: File) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET.")
  }

  const payload = new FormData()
  payload.append("file", file)
  payload.append("upload_preset", uploadPreset)
  payload.append("folder", "landmap/listings")

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files").filter((value): value is File => value instanceof File)

    if (files.length === 0) {
      return NextResponse.json({ error: "At least one file is required" }, { status: 400 })
    }

    const limitedFiles = files.slice(0, 5)
    const uploadedUrls = await Promise.all(limitedFiles.map(uploadToCloudinary))

    return NextResponse.json({ urls: uploadedUrls })
  } catch (error) {
    console.error("Error uploading image(s):", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload images" },
      { status: 500 }
    )
  }
}
