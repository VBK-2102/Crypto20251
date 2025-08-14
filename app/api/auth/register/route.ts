import { type NextRequest, NextResponse } from "next/server"
import { simpleAuth } from "@/lib/simple-auth"
import { dbOperations as db } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json()

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { success: false, error: "Email, password, and full name are required" },
        { status: 400 },
      )
    }

    // Check if user exists in the database
    const existingUser = await db.getUserByEmail(email)
    if (existingUser) {
      return NextResponse.json({ success: false, error: "User already exists" }, { status: 400 })
    }

    // Register user in the database
    const user = await simpleAuth.register(email, password, fullName)
    const token = auth.generateToken({
      userId: newUser._id.toHexString(),
      email: newUser.email,
      isAdmin: newUser.is_admin,
    })

    return NextResponse.json({
      success: true,
      token,
      user,
    })
  } catch (error) {
    console.error("Registration failed:", error)
    return NextResponse.json({ success: false, error: "Registration failed" }, { status: 500 })
  }
}
