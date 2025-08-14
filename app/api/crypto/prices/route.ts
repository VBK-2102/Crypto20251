import { NextResponse } from "next/server"
import { mockCryptoPrices } from "@/lib/mock-data"

export async function GET() {
  return NextResponse.json({
    success: true,
    data: mockCryptoPrices,
  })
}
