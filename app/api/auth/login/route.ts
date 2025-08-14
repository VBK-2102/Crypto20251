import { type NextRequest, NextResponse } from "next/server"
import { simpleAuth } from "@/lib/simple-auth"
import { auth } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 })
    }

    const user = await simpleAuth.login(email, password)
    if (!user) {
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 })
    }

    // Ensure we have a valid ObjectId for the user ID
    const userId = user._id instanceof ObjectId ? user._id.toHexString() : user._id.toString();
    
    const token = auth.generateToken({
      userId: userId,
      email: user.email,
      isAdmin: user.is_admin || false,
    })

    return NextResponse.json({
      success: true,
      token,
      user,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Login failed" }, { status: 500 })
  }
}
