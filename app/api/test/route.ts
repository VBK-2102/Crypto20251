import { NextResponse } from "next/server"
import { dbOperations as db } from "@/lib/db"

export async function GET() {
  try {
    // Test database connection
    const users = await db.getAllUsers()
    const cryptoPrices = await db.getCryptoPrices()

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      data: {
        userCount: users.length,
        cryptoPricesCount: cryptoPrices.length,
        sampleUser: users[0]
          ? {
              id: users[0].id,
              email: users[0].email,
              fullName: users[0].full_name,
            }
          : null,
      },
    })
  } catch (error) {
    console.error("Database test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Database connection failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
