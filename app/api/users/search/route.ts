import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { dbOperations as db, getCollections, clientPromise } from '@/lib/db';
import { ObjectId } from 'mongodb';

// This route requires dynamic features (headers/cookies access for authentication)
// so we explicitly mark it as force-dynamic
export const dynamic = 'force-dynamic';

// Establish database connection at module level to improve reliability
let dbConnectionPromise = clientPromise.catch(err => {
  console.error("Failed to connect to database:", err);
  throw err;
});

export async function GET(request: NextRequest) {
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
    const user = await auth.getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.toLowerCase() || ""

    if (!query.trim()) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Search users by name or email from database
    const { users } = getCollections();
    
    // Convert userId to ObjectId if it's a string
    let userIdFilter;
    try {
      userIdFilter = { _id: { $ne: new ObjectId(user.userId) } };
    } catch (e) {
      // If conversion fails, use string comparison
      userIdFilter = { _id: { $ne: user.userId } };
    }
    
    const dbUsers = await users.find({
      $and: [
        userIdFilter, // Exclude current user
        {
          $or: [
            { email: { $regex: query, $options: 'i' } },
            { full_name: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    }).limit(10).toArray();

    const searchResults = dbUsers.map(u => ({
      id: u._id.toString(),
      email: u.email,
      fullName: u.full_name
    }));

    return NextResponse.json({
      success: true,
      data: searchResults,
    })
  } catch (error) {
    console.error("Error searching users:", error)
    return NextResponse.json({ success: false, error: "Search failed" }, { status: 500 })
  }
}
