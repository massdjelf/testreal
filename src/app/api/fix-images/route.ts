import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// This endpoint fixes broken blob URLs in the database
export async function POST() {
  try {
    // Placeholder images to use for properties
    const placeholderImages = [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800",
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800",
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800",
      "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=800",
      "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800",
      "https://images.unsplash.com/photo-1518173946687-a4c036bc0dd4?w=800",
      "https://images.unsplash.com/photo-1501854140801-50d0ec3a7fe05?w=800",
    ]

    // Get all properties
    const properties = await db.property.findMany({
      select: { id: true, images: true }
    })

    let fixedCount = 0

    for (const property of properties) {
      let needsUpdate = false
      let newImages: string[] = []

      if (!property.images) {
        // No images, add a placeholder
        const randomIndex = Math.floor(Math.random() * placeholderImages.length)
        newImages = [placeholderImages[randomIndex]]
        needsUpdate = true
      } else {
        try {
          const images: string[] = JSON.parse(property.images)
          
          // Filter out invalid images (blob URLs, empty strings, non-http URLs)
          const validImages = images.filter(img => 
            img && 
            typeof img === 'string' && 
            (img.startsWith('http://') || img.startsWith('https://')) &&
            !img.startsWith('blob:')
          )

          if (validImages.length === 0) {
            // No valid images, add a placeholder
            const randomIndex = Math.floor(Math.random() * placeholderImages.length)
            newImages = [placeholderImages[randomIndex]]
            needsUpdate = true
          } else if (validImages.length !== images.length) {
            // Some images were invalid
            newImages = validImages
            needsUpdate = true
          }
        } catch {
          // Invalid JSON, set a placeholder
          const randomIndex = Math.floor(Math.random() * placeholderImages.length)
          newImages = [placeholderImages[randomIndex]]
          needsUpdate = true
        }
      }

      if (needsUpdate) {
        await db.property.update({
          where: { id: property.id },
          data: { images: JSON.stringify(newImages) }
        })
        fixedCount++
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Fixed ${fixedCount} properties with invalid images`,
      totalChecked: properties.length 
    })
  } catch (error) {
    console.error("Error fixing images:", error)
    return NextResponse.json(
      { error: "Failed to fix images" },
      { status: 500 }
    )
  }
}
