import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getCollections, ObjectId } from "@/lib/db"

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

    // Get collections
    const { users, transactions, cryptoPrices } = getCollections()

    // Find sender and recipient
    const sender = await users.findOne({ _id: new ObjectId(user.userId) })
    const recipient = await users.findOne({ _id: new ObjectId(recipientId) })

    if (!sender || !recipient) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Get crypto price data
    const cryptoPrice = await cryptoPrices.findOne({ symbol: cryptoSymbol })
    if (!cryptoPrice) {
      return NextResponse.json({ success: false, error: "Crypto price not found" }, { status: 400 })
    }

    // In our MongoDB implementation, we only have a single wallet_balance field in INR
    // So we'll use that for the conversion
    const senderFiatBalance = sender.wallet_balance || 0

    // Calculate how much crypto can be purchased with the available INR balance
    const cryptoFromFiatINR = senderFiatBalance / cryptoPrice.price_inr
    
    // Check if sender has enough balance
    if (cryptoAmount > cryptoFromFiatINR) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient balance. Available: ${cryptoFromFiatINR.toFixed(8)} ${cryptoSymbol} (${senderFiatBalance.toFixed(2)} INR)`,
        },
        { status: 400 },
      )
    }

    // Calculate recipient fiat amount based on recipient currency (only INR supported in this version)
    const recipientFiatAmount = cryptoAmount * cryptoPrice.price_inr

    // Deduct from sender's balance
    const requiredFiatINR = cryptoAmount * cryptoPrice.price_inr
    
    // Update sender's balance in the database
    const updatedSender = await users.findOneAndUpdate(
      { _id: new ObjectId(user.userId) },
      { $inc: { wallet_balance: -requiredFiatINR }, $set: { updated_at: new Date() } },
      { returnDocument: 'after' }
    )

    if (!updatedSender) {
      return NextResponse.json({ success: false, error: "Failed to update sender's balance" }, { status: 500 })
    }

    // Add fiat amount to recipient's balance
    const updatedRecipient = await users.findOneAndUpdate(
      { _id: new ObjectId(recipientId) },
      { $inc: { wallet_balance: recipientFiatAmount }, $set: { updated_at: new Date() } },
      { returnDocument: 'after' }
    )

    if (!updatedRecipient) {
      // Rollback sender's balance if recipient update fails
      await users.updateOne(
        { _id: new ObjectId(user.userId) },
        { $inc: { wallet_balance: requiredFiatINR }, $set: { updated_at: new Date() } }
      )
      return NextResponse.json({ success: false, error: "Failed to update recipient's balance" }, { status: 500 })
    }

    // Create transaction records
    const transactionId = `CRYPTO${Date.now()}`
    const now = new Date()

    // Sender's transaction (what they sent)
    const senderTransaction = {
      user_id: new ObjectId(user.userId),
      type: "crypto_send",
      amount: cryptoAmount,
      currency: cryptoSymbol,
      crypto_amount: cryptoAmount,
      crypto_currency: cryptoSymbol,
      status: "completed",
      payment_method: "crypto_wallet",
      transaction_hash: transactionId,
      receiver_address: recipient.email,
      upi_reference: note || `Sent ${cryptoAmount.toFixed(8)} ${cryptoSymbol} to ${recipient.full_name}`,
      created_at: now,
      updated_at: now,
      fee: 0 // No fee for now
    }

    // Recipient's transaction (what they received in fiat)
    const recipientTransaction = {
      user_id: new ObjectId(recipientId),
      type: "crypto_receive_as_fiat",
      amount: recipientFiatAmount,
      currency: recipientCurrency,
      crypto_amount: cryptoAmount,
      crypto_currency: cryptoSymbol,
      status: "completed",
      payment_method: "crypto_conversion",
      transaction_hash: transactionId,
      receiver_address: sender.email,
      upi_reference: note || `Received ${cryptoAmount.toFixed(8)} ${cryptoSymbol} as ${recipientCurrency} from ${sender.full_name}`,
      created_at: now,
      updated_at: now,
      fee: 0 // No fee for now
    }

    // Insert transactions into MongoDB
    const insertResult = await transactions.insertMany([senderTransaction, recipientTransaction])

    if (!insertResult.acknowledged) {
      // Rollback both balances if transaction creation fails
      await users.updateOne(
        { _id: new ObjectId(user.userId) },
        { $inc: { wallet_balance: requiredFiatINR }, $set: { updated_at: new Date() } }
      )
      await users.updateOne(
        { _id: new ObjectId(recipientId) },
        { $inc: { wallet_balance: -recipientFiatAmount }, $set: { updated_at: new Date() } }
      )
      return NextResponse.json({ success: false, error: "Failed to create transaction records" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      transactionId,
      message: `${cryptoAmount.toFixed(8)} ${cryptoSymbol} sent successfully`,
      senderNewBalance: updatedSender.wallet_balance,
      recipientNewBalance: updatedRecipient.wallet_balance,
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
