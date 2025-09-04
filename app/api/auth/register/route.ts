export const dynamic = 'force-dynamic';
import { type NextRequest, NextResponse } from "next/server"
import { simpleAuth } from "@/lib/simple-auth"
import { dbOperations as db, clientPromise } from "@/lib/db"
import { auth } from "@/lib/auth"

// Establish database connection at module level to improve reliability
let dbConnectionPromise = clientPromise.catch(err => {
  console.error("Failed to connect to database:", err);
  throw err;
});

export async function POST(request: NextRequest) {
  // Ensure database connection is established before proceeding
  try {
    await dbConnectionPromise;
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Database connection failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
  
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
    if (!user._id) {
      return NextResponse.json({ success: false, error: "User ID is missing after registration" }, { status: 500 })
    }
    const token = auth.generateToken({
      userId: user._id.toHexString(),
      email: user.email,
      isAdmin: user.is_admin,
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
