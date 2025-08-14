import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { dbOperations as db, getCollections, clientPromise } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  await clientPromise; // Ensure DB connection is established
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
