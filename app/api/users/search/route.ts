import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { mockUsers } from "@/lib/mock-data"

export async function GET(request: NextRequest) {
  try {
    const user = await auth.getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.toLowerCase() || ""

    if (!query.trim()) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Search users by name or email
    const searchResults = mockUsers
      .filter(
        (u) =>
          u.id !== user.userId && // Exclude current user
          (u.fullName.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)),
      )
      .map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
      }))
      .slice(0, 10) // Limit to 10 results

    return NextResponse.json({
      success: true,
      data: searchResults,
    })
  } catch (error) {
    console.error("Error searching users:", error)
    return NextResponse.json({ success: false, error: "Search failed" }, { status: 500 })
  }
}
