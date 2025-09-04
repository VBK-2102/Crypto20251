import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { dbOperations as db } from "@/lib/db"

// This route requires dynamic features (headers/cookies access)
// so we explicitly mark it as force-dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await auth.getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    
    if (!("is_admin" in user) || !user.is_admin) {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }

    // Get real users from database
    const users = await db.getAllUsers() // Fetch all users using the correct method from dbOperations

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ success: false, error: "Failed to get users" }, { status: 500 })
  }
}
