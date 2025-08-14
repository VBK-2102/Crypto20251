import QRCode from "qrcode"

export const qrService = {
  async generateUpiQR(amount: number, transactionId: string): Promise<string> {
    // UPI payment string format
    const upiString = `upi://pay?pa=merchant@paytm&pn=CryptoPay&am=${amount}&cu=INR&tn=Payment%20for%20${transactionId}`

    try {
      const qrCodeDataURL = await QRCode.toDataURL(upiString, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
      return qrCodeDataURL
    } catch (error) {
      console.error("Error generating QR code:", error)
      throw new Error("Failed to generate QR code")
    }
  },

  async generateCryptoAddressQR(address: string): Promise<string> {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(address, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
      return qrCodeDataURL
    } catch (error) {
      console.error("Error generating crypto QR code:", error)
      throw new Error("Failed to generate crypto QR code")
    }
  },
}
