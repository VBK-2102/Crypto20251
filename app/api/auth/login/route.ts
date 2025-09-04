import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getCollections, ObjectId } from "@/lib/db"

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log("Transactions API: Processing request")
    
    // Use headers() from next/headers instead of request
    const headersList = headers();
    const user = await auth.getUserFromHeaders(headersList)

    if (!user) {
      console.log("Transactions API: Unauthorized - No user found")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    console.log("Transactions API: User authenticated:", user.email, "ID:", user.userId)
    
    // Rest of your code remains the same...
    const { transactions } = getCollections()
    
    let userObjectId
    try {
      userObjectId = new ObjectId(user.userId)
    } catch (error) {
      console.error("Invalid ObjectId format:", user.userId)
      return NextResponse.json({ success: false, error: "Invalid user ID format" }, { status: 400 })
    }
    
    console.log("Transactions API: Looking for transactions with user_id:", userObjectId)
    
    const userTransactions = await transactions.find({ user_id: userObjectId }).toArray()
    console.log("Transactions API: Found transactions:", userTransactions.length)

    const formattedTransactions = userTransactions.map(tx => ({
      ...tx,
      _id: tx._id.toString(),
      user_id: tx.user_id.toString(),
      created_at: tx.created_at.toISOString(),
      updated_at: tx.updated_at ? tx.updated_at.toISOString() : undefined
    }))

    return NextResponse.json({
      success: true,
      data: formattedTransactions,
    })
  } catch (error) {
    console.error("Transactions API: Error:", error)
    return NextResponse.json({ success: false, error: "Failed to get transactions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const headersList = headers();
    const user = await auth.getUserFromHeaders(headersList)

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Rest of your POST code...
    const { transactions } = getCollections()
    
    let userObjectId
    try {
      userObjectId = new ObjectId(user.userId)
    } catch (error) {
      console.error("Invalid ObjectId format:", user.userId)
      return NextResponse.json({ success: false, error: "Invalid user ID format" }, { status: 400 })
    }

    const now = new Date()
    
    const newTransaction = {
      user_id: userObjectId,
      ...body,
      created_at: now,
      updated_at: now
    }

    const result = await transactions.insertOne(newTransaction)

    const formattedTransaction = {
      ...newTransaction,
      _id: result.insertedId.toString(),
      user_id: userObjectId.toString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    }

    return NextResponse.json({
      success: true,
      data: formattedTransaction,
    })
  } catch (error) {
    console.error("Failed to create transaction:", error)
    return NextResponse.json({ success: false, error: "Failed to create transaction" }, { status: 500 })
  }
}