import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { mockUsers, mockTransactions, mockCryptoPrices } from "@/lib/mock-data"

export async function POST(request: NextRequest) {
  try {
    const user = await auth.getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { recipientId, cryptoAmount, cryptoSymbol, recipientCurrency, note } = await request.json()

    if (!recipientId || !cryptoAmount || !cryptoSymbol || !recipientCurrency || cryptoAmount <= 0) {
      return NextResponse.json({ success: false, error: "Invalid transaction parameters" }, { status: 400 })
    }

    // Find sender and recipient
    const sender = mockUsers.find((u) => u.id === user.userId)
    const recipient = mockUsers.find((u) => u.id === recipientId)

    if (!sender || !recipient) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Get crypto price data
    const cryptoPrice = mockCryptoPrices.find((c) => c.symbol === cryptoSymbol)
    if (!cryptoPrice) {
      return NextResponse.json({ success: false, error: "Crypto price not found" }, { status: 400 })
    }

    // Calculate total available crypto for sender (direct + from fiat)
    const senderDirectCrypto = sender.walletBalances[cryptoSymbol] || 0

    // Calculate total fiat balance in INR for conversion
    let senderTotalFiatINR = 0
    Object.entries(sender.walletBalances).forEach(([currency, amount]) => {
      if (currency === "INR") {
        senderTotalFiatINR += amount
      } else if (currency === "USD") {
        senderTotalFiatINR += amount * 83.5
      } else if (currency === "EUR") {
        senderTotalFiatINR += amount * 90
      } else if (currency === "GBP") {
        senderTotalFiatINR += amount * 105
      }
    })

    const cryptoFromFiatINR = senderTotalFiatINR / cryptoPrice.price_inr
    const totalAvailableCrypto = senderDirectCrypto + cryptoFromFiatINR

    // Check if sender has enough crypto (direct or convertible from fiat)
    if (cryptoAmount > totalAvailableCrypto) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient balance. Available: ${totalAvailableCrypto.toFixed(8)} ${cryptoSymbol}`,
        },
        { status: 400 },
      )
    }

    // Calculate recipient fiat amount based on recipient currency
    let recipientFiatAmount = 0
    if (recipientCurrency === "INR") {
      recipientFiatAmount = cryptoAmount * cryptoPrice.price_inr
    } else if (recipientCurrency === "USD") {
      recipientFiatAmount = cryptoAmount * cryptoPrice.price_usd
    } else if (recipientCurrency === "EUR") {
      recipientFiatAmount = cryptoAmount * cryptoPrice.price_usd * 0.85
    } else if (recipientCurrency === "GBP") {
      recipientFiatAmount = cryptoAmount * cryptoPrice.price_usd * 0.75
    }

    // Deduct from sender's balance
    let sendingMethod = ""
    let deductedFiatAmount = 0

    if (senderDirectCrypto >= cryptoAmount) {
      // Send from direct crypto balance
      sender.walletBalances[cryptoSymbol] -= cryptoAmount
      sendingMethod = "crypto_direct"
    } else {
      // Need to use fiat balance (convert fiat to crypto)
      const requiredFiatINR = cryptoAmount * cryptoPrice.price_inr

      // Deduct proportionally from available fiat currencies
      let remainingToDeduct = requiredFiatINR

      // Deduct from INR first
      if (sender.walletBalances["INR"] && remainingToDeduct > 0) {
        const deductFromINR = Math.min(sender.walletBalances["INR"], remainingToDeduct)
        sender.walletBalances["INR"] -= deductFromINR
        remainingToDeduct -= deductFromINR
        deductedFiatAmount += deductFromINR
      }

      // Then from USD (convert to INR equivalent)
      if (sender.walletBalances["USD"] && remainingToDeduct > 0) {
        const usdNeeded = remainingToDeduct / 83.5
        const deductFromUSD = Math.min(sender.walletBalances["USD"], usdNeeded)
        sender.walletBalances["USD"] -= deductFromUSD
        remainingToDeduct -= deductFromUSD * 83.5
        deductedFiatAmount += deductFromUSD * 83.5
      }

      // Then from EUR (convert to INR equivalent)
      if (sender.walletBalances["EUR"] && remainingToDeduct > 0) {
        const eurNeeded = remainingToDeduct / 90
        const deductFromEUR = Math.min(sender.walletBalances["EUR"], eurNeeded)
        sender.walletBalances["EUR"] -= deductFromEUR
        remainingToDeduct -= deductFromEUR * 90
        deductedFiatAmount += deductFromEUR * 90
      }

      // Finally from GBP (convert to INR equivalent)
      if (sender.walletBalances["GBP"] && remainingToDeduct > 0) {
        const gbpNeeded = remainingToDeduct / 105
        const deductFromGBP = Math.min(sender.walletBalances["GBP"], gbpNeeded)
        sender.walletBalances["GBP"] -= deductFromGBP
        remainingToDeduct -= deductFromGBP * 105
        deductedFiatAmount += deductFromGBP * 105
      }

      // Also deduct any direct crypto if available
      if (senderDirectCrypto > 0) {
        sender.walletBalances[cryptoSymbol] -= senderDirectCrypto
      }

      sendingMethod = "fiat_to_crypto"
    }

    // Add fiat amount to recipient's balance (NOT crypto)
    recipient.walletBalances[recipientCurrency] =
      (recipient.walletBalances[recipientCurrency] || 0) + recipientFiatAmount

    // Create transaction records
    const transactionId = `CRYPTO${Date.now()}`
    const timestamp = new Date().toISOString()

    // Sender's transaction (what they sent)
    const senderTransaction = {
      id: mockTransactions.length + 1,
      user_id: sender.userId,
      type: "crypto_send" as const,
      amount: cryptoAmount,
      currency: cryptoSymbol,
      crypto_amount: cryptoAmount,
      crypto_currency: cryptoSymbol,
      fiat_amount: recipientFiatAmount,
      fiat_currency: recipientCurrency,
      status: "completed" as const,
      payment_method: "crypto_wallet",
      transaction_hash: transactionId,
      receiver_address: recipient.email,
      upi_reference: note || `Sent ${cryptoAmount.toFixed(8)} ${cryptoSymbol} to ${recipient.fullName}`,
      created_at: timestamp,
      updated_at: timestamp,
    }

    // Recipient's transaction (what they received in fiat)
    const recipientTransaction = {
      id: mockTransactions.length + 2,
      user_id: recipient.id,
      type: "crypto_receive_as_fiat" as const,
      amount: recipientFiatAmount,
      currency: recipientCurrency,
      crypto_amount: cryptoAmount,
      crypto_currency: cryptoSymbol,
      fiat_amount: recipientFiatAmount,
      fiat_currency: recipientCurrency,
      status: "completed" as const,
      payment_method: "crypto_conversion",
      transaction_hash: transactionId,
      receiver_address: sender.email,
      upi_reference:
        note || `Received ${cryptoAmount.toFixed(8)} ${cryptoSymbol} as ${recipientCurrency} from ${sender.fullName}`,
      created_at: timestamp,
      updated_at: timestamp,
    }

    mockTransactions.push(senderTransaction, recipientTransaction)

    return NextResponse.json({
      success: true,
      transactionId,
      message: `${cryptoAmount.toFixed(8)} ${cryptoSymbol} sent successfully`,
      senderNewBalances: sender.walletBalances,
      recipientNewBalances: recipient.walletBalances,
      conversionDetails: {
        sentCryptoAmount: cryptoAmount,
        sentCryptoSymbol: cryptoSymbol,
        receivedFiatAmount: recipientFiatAmount,
        receivedFiatCurrency: recipientCurrency,
        exchangeRate: `1 ${cryptoSymbol} = ${(recipientFiatAmount / cryptoAmount).toLocaleString()} ${recipientCurrency}`,
      },
    })
  } catch (error) {
    console.error("Error sending crypto:", error)
    return NextResponse.json({ success: false, error: "Crypto transfer failed" }, { status: 500 })
  }
}
