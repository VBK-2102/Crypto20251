import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import type { NextRequest } from "next/server"
import { db, type User } from "./db"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export interface JWTPayload {
  userId: number
  email: string
  isAdmin: boolean
}

export const auth = {
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
      return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
    } catch (error) {
      console.error("Error generating token:", error)
      throw new Error("Failed to generate token")
    }
  },

  verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload
    } catch (error) {
      console.error("Error verifying token:", error)
      return null
    }
  },

  async getUserFromRequest(request: NextRequest): Promise<User | null> {
    try {
      const authHeader = request.headers.get("authorization")
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null
      }

      const token = authHeader.replace("Bearer ", "")
      const payload = this.verifyToken(token)
      if (!payload) {
        return null
      }

      const user = await db.getUserById(payload.userId)
      return user || null
    } catch (error) {
      console.error("Error getting user from request:", error)
      return null
    }
  },
}
