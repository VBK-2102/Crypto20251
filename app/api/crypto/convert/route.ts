import { NextRequest, NextResponse } from "next/server"
import { binanceAPI } from "@/lib/binance-api"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, fromCurrency, toCurrency, type } = body

    if (!amount || !fromCurrency || !toCurrency || !type) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      )
    }

    let convertedAmount = 0

    if (type === "fiat-to-crypto") {
      convertedAmount = await binanceAPI.convertFiatToCrypto(
        parseFloat(amount),
        fromCurrency,
        toCurrency
      )
    } else if (type === "crypto-to-fiat") {
      convertedAmount = await binanceAPI.convertCryptoToFiat(
        parseFloat(amount),
        fromCurrency,
        toCurrency
      )
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid conversion type" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        originalAmount: parseFloat(amount),
        convertedAmount,
        fromCurrency,
        toCurrency,
        type,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error("Error converting currency:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to convert currency",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
