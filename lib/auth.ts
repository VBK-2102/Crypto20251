import type { NextRequest } from "next/server"
import { getDb, clientPromise } from "./db"
import { authUtils } from "./auth-utils"
import type { JWTPayload } from "./auth-utils"

export interface User {
  userId: string;
  email: string;
  fullName?: string;
  isAdmin?: boolean;
  wallet_balance?: number;
  updated_at?: Date;
}

// Re-export JWTPayload for backward compatibility
export { JWTPayload }

export const auth = {
  // Use shared auth utilities
  hashPassword: authUtils.hashPassword,
  comparePassword: authUtils.comparePassword,
  generateToken: authUtils.generateToken,
  verifyToken: authUtils.verifyToken,
  
  async getUserById(userId: string): Promise<User | null> {
    try {
      console.log("Getting user by ID:", userId);
      const db = getDb();
      const usersCollection = db.collection('users');
      
      // Convert string ID to ObjectId
      const { ObjectId } = require('mongodb');
      let objectId;
      
      try {
        objectId = new ObjectId(userId);
      } catch (error) {
        console.error("Invalid ObjectId format:", userId);
        return null;
      }
      
      const user = await usersCollection.findOne({ _id: objectId });
      
      if (!user) {
        console.error("User not found with ID:", userId);
        return null;
      }
      
      console.log("User found:", user.email);
      
      return {
        userId: user._id.toString(),
        email: user.email,
        fullName: user.full_name,
        isAdmin: user.is_admin || false,
        wallet_balance: user.wallet_balance || 0,
        updated_at: user.updated_at
      };
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return null;
    }
  },

  async getUserFromRequest(request: NextRequest): Promise<User | null> {
    try {
      // Check for authorization header
      const authHeader = request.headers.get("authorization")
      if (!authHeader) {
        // Try to get token from cookies as fallback
        const cookies = request.cookies.get("token")?.value
        if (!cookies) {
          console.log("No token found in cookies or headers");
          return null
        }
        
        // Validate token format before verification
        if (!cookies || cookies.split('.').length !== 3) {
          console.error("Invalid token format from cookies");
          return null;
        }
        
        const payload = this.verifyToken(cookies)
        if (!payload) {
          console.error("Token verification failed for cookie token");
          return null
        }
        
        return this.getUserById(payload.userId)
      }
      
      // Process Bearer token from header
      let token = authHeader
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.replace("Bearer ", "")
      }
      
      console.log("Token from request:", token)
      
      // Validate token format before verification
      if (!token || token.split('.').length !== 3) {
        console.error("Invalid token format from Authorization header");
        return null;
      }
      
      console.log("Token from request:", token);
      const payload = this.verifyToken(token)
      if (!payload) {
        console.error("Token verification failed");
        return null
      }
      console.log("Payload from token:", payload);

      // Get user by ID from payload
      const user = await this.getUserById(payload.userId);
      if (!user) {
        console.error("User not found with ID from token:", payload.userId);
      } else {
        console.log("User found from token:", user.email);
      }
      return user;
    } catch (error) {
      console.error("Error getting user from request:", error)
      return null
    }
  },
}
