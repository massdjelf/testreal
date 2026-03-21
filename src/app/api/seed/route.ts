import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function GET() {
  try {
    const isDevLikeEnvironment = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"

    if (!isDevLikeEnvironment) {
      return NextResponse.json(
        { error: "Seed endpoint is only available in development/test environments" },
        { status: 403 }
      )
    }

    // Check if already seeded
    const existingUsers = await db.user.count()
    if (existingUsers > 0) {
      return NextResponse.json({ message: "Database already seeded" })
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10)
    const admin = await db.user.create({
      data: {
        email: "admin@landmap.com",
        password: hashedPassword,
        name: "Admin User",
        role: "ADMIN",
        vendorStatus: "APPROVED",
      },
    })

    // Create vendor user
    const vendorPassword = await bcrypt.hash("vendor123", 10)
    const vendor = await db.user.create({
      data: {
        email: "vendor@landmap.com",
        password: vendorPassword,
        name: "Property Vendor",
        role: "VENDOR",
        vendorStatus: "APPROVED",
      },
    })

    // Create regular user
    const userPassword = await bcrypt.hash("user123", 10)
    const user = await db.user.create({
      data: {
        email: "user@landmap.com",
        password: userPassword,
        name: "Regular User",
        role: "USER",
        vendorStatus: "NONE",
      },
    })

    // Create sample properties
    const properties: Prisma.PropertyUncheckedCreateInput[] = [
      {
        title: "Mountain View Ranch",
        description: "Beautiful ranch land with stunning mountain views. Perfect for building your dream home or starting a small farm.",
        type: "LAND",
        status: "AVAILABLE",
        address: "123 Mountain Road",
        city: "Denver",
        state: "Colorado",
        country: "USA",
        zipCode: "80202",
        latitude: 39.7392,
        longitude: -104.9903,
        areaSqm: 50000,
        areaSqf: 538195,
        pricePerSqm: 100,
        pricePerSqf: 9.29,
        totalPrice: 5000000,
        ownerId: vendor.id,
        isVerified: true,
        verifiedBy: admin.id,
        verifiedAt: new Date(),
      },
      {
        title: "Lakeside Retreat",
        description: "Peaceful lakeside property ideal for vacation homes or camping sites.",
        type: "LAND",
        status: "AVAILABLE",
        address: "456 Lake Shore Drive",
        city: "Austin",
        state: "Texas",
        country: "USA",
        zipCode: "78701",
        latitude: 30.2672,
        longitude: -97.7431,
        areaSqm: 25000,
        areaSqf: 269097,
        pricePerSqm: 80,
        pricePerSqf: 7.43,
        totalPrice: 2000000,
        ownerId: vendor.id,
        isVerified: true,
        verifiedBy: admin.id,
        verifiedAt: new Date(),
      },
      {
        title: "Downtown Commercial Lot",
        description: "Prime commercial real estate in the heart of downtown.",
        type: "COMMERCIAL",
        status: "BIDDING",
        address: "789 Main Street",
        city: "Houston",
        state: "Texas",
        country: "USA",
        zipCode: "77001",
        latitude: 29.7604,
        longitude: -95.3698,
        areaSqm: 10000,
        areaSqf: 107639,
        pricePerSqm: 500,
        pricePerSqf: 46.45,
        totalPrice: 5000000,
        ownerId: vendor.id,
        isVerified: true,
        verifiedBy: admin.id,
        verifiedAt: new Date(),
      },
      {
        title: "Suburban Family Home",
        description: "Spacious family home with large backyard and modern amenities.",
        type: "HOUSE",
        status: "SOLD",
        address: "321 Oak Avenue",
        city: "Phoenix",
        state: "Arizona",
        country: "USA",
        zipCode: "85001",
        latitude: 33.4484,
        longitude: -112.0740,
        areaSqm: 500,
        areaSqf: 5382,
        pricePerSqm: 3000,
        pricePerSqf: 278.71,
        totalPrice: 1500000,
        bedrooms: 4,
        bathrooms: 3,
        yearBuilt: 2020,
        ownerId: vendor.id,
        isVerified: true,
        verifiedBy: admin.id,
        verifiedAt: new Date(),
      },
      {
        title: "Beachfront Paradise",
        description: "Stunning beachfront property with direct ocean access.",
        type: "LAND",
        status: "AVAILABLE",
        address: "100 Ocean Boulevard",
        city: "Miami",
        state: "Florida",
        country: "USA",
        zipCode: "33101",
        latitude: 25.7617,
        longitude: -80.1918,
        areaSqm: 8000,
        areaSqf: 86111,
        pricePerSqm: 1250,
        pricePerSqf: 116.13,
        totalPrice: 10000000,
        ownerId: vendor.id,
        isVerified: true,
        verifiedBy: admin.id,
        verifiedAt: new Date(),
      },
      {
        title: "Industrial Complex",
        description: "Large industrial facility with warehouse and office space.",
        type: "INDUSTRIAL",
        status: "AVAILABLE",
        address: "500 Industrial Parkway",
        city: "Las Vegas",
        state: "Nevada",
        country: "USA",
        zipCode: "89101",
        latitude: 36.1699,
        longitude: -115.1398,
        areaSqm: 20000,
        areaSqf: 215278,
        pricePerSqm: 400,
        pricePerSqf: 37.16,
        totalPrice: 8000000,
        ownerId: vendor.id,
        isVerified: true,
        verifiedBy: admin.id,
        verifiedAt: new Date(),
      },
      {
        title: "California Vineyard Estate",
        description: "Premium vineyard property with existing grape production.",
        type: "LAND",
        status: "BIDDING",
        address: "2000 Vineyard Lane",
        city: "Napa",
        state: "California",
        country: "USA",
        zipCode: "94558",
        latitude: 38.2975,
        longitude: -122.2869,
        areaSqm: 100000,
        areaSqf: 1076391,
        pricePerSqm: 150,
        pricePerSqf: 13.94,
        totalPrice: 15000000,
        ownerId: vendor.id,
        isVerified: true,
        verifiedBy: admin.id,
        verifiedAt: new Date(),
      },
      {
        title: "New York Penthouse",
        description: "Luxury penthouse with panoramic city views.",
        type: "APARTMENT",
        status: "AVAILABLE",
        address: "1 Fifth Avenue",
        city: "New York",
        state: "New York",
        country: "USA",
        zipCode: "10001",
        latitude: 40.7128,
        longitude: -74.0060,
        areaSqm: 400,
        areaSqf: 4305,
        pricePerSqm: 25000,
        pricePerSqf: 2322.58,
        totalPrice: 10000000,
        bedrooms: 3,
        bathrooms: 3,
        yearBuilt: 2018,
        ownerId: vendor.id,
        isVerified: true,
        verifiedBy: admin.id,
        verifiedAt: new Date(),
      },
      {
        title: "Pacific Northwest Forest Land",
        description: "Dense forest land perfect for timber or conservation.",
        type: "LAND",
        status: "AVAILABLE",
        address: "Forest Road 1",
        city: "Seattle",
        state: "Washington",
        country: "USA",
        zipCode: "98101",
        latitude: 47.6062,
        longitude: -122.3321,
        areaSqm: 200000,
        areaSqf: 2152782,
        pricePerSqm: 25,
        pricePerSqf: 2.32,
        totalPrice: 5000000,
        ownerId: vendor.id,
        isVerified: true,
        verifiedBy: admin.id,
        verifiedAt: new Date(),
      },
      {
        title: "Oregon Farm Estate",
        description: "Working farm with irrigation systems and barns.",
        type: "LAND",
        status: "PENDING",
        address: "1000 Farm Road",
        city: "Portland",
        state: "Oregon",
        country: "USA",
        zipCode: "97201",
        latitude: 45.5152,
        longitude: -122.6784,
        areaSqm: 150000,
        areaSqf: 1614587,
        pricePerSqm: 40,
        pricePerSqf: 3.72,
        totalPrice: 6000000,
        ownerId: vendor.id,
        isVerified: false,
      },
    ]

    for (const property of properties) {
      await db.property.create({ data: property })
    }

    return NextResponse.json({
      message: "Database seeded successfully",
      users: { admin: admin.email, vendor: vendor.email, user: user.email },
      properties: properties.length,
    })
  } catch (error) {
    console.error("Seed error:", error)
    return NextResponse.json(
      { error: "Failed to seed database" },
      { status: 500 }
    )
  }
}
