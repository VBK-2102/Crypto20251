import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

// Define JWTPayload interface
export interface JWTPayload {
  userId: string
  email: string
  isAdmin: boolean
}

export const authUtils = {
  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, 10)
    } catch (error) {
      console.error("Error hashing password:", error)
      throw new Error("Failed to hash password")
    }
  },

  async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash)
    } catch (error) {
      console.error("Error comparing password:", error)
      return false
    }
  },

  generateToken(payload: JWTPayload): string {
    try {
      const expiresIn = process.env.JWT_EXPIRES_IN || "7d"
      return jwt.sign(payload, JWT_SECRET, { expiresIn })
    } catch (error) {
      console.error("Error generating token:", error)
      throw new Error("Failed to generate token")
    }
  },

  verifyToken(token: string): JWTPayload | null {
    try {
      // Check if token has the correct JWT format (three parts separated by dots)
      if (!token || token.split('.').length !== 3) {
        console.error("JWT malformed: Invalid token format");
        return null;
      }
      
      return jwt.verify(token, JWT_SECRET) as JWTPayload
    } catch (error) {
      console.error("Error verifying token:", error)
      return null
    }
  }
}