import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { dbOperations as db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await auth.getUserFromRequest(request)

    if (!user || !user.isAdmin) {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }

    // Get real users from database
    const users = await db.getAllUsers()

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ success: false, error: "Failed to get users" }, { status: 500 })
  }
}
