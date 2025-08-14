import { dbOperations as db, User } from "./db";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

export const simpleAuth = {
  async login(email: string, password: string): Promise<User | null> {
    const user = await db.getUserByEmail(email);
    if (user && (await bcrypt.compare(password, user.password_hash))) {
      // Return a simplified user object for the frontend, excluding sensitive data
      return {
        _id: user._id,
        email: user.email,
        full_name: user.full_name,
        wallet_balance: user.wallet_balance,
        is_admin: user.is_admin,
        created_at: user.created_at,
        updated_at: user.updated_at,
        // Do not return password_hash
      } as User;
    }
    return null;
  },

  async register(email: string, password: string, fullName: string): Promise<User> {
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      throw new Error("User with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, 10); // Hash password with salt rounds

    const newUser = await db.createUser(email, passwordHash, fullName);

    // Return a simplified user object for the frontend
    return {
      _id: newUser._id,
      email: newUser.email,
      full_name: newUser.full_name,
      wallet_balance: newUser.wallet_balance,
      is_admin: newUser.is_admin,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at,
    } as User;
  },

  generateToken(user: User): string {
    // Simple token - base64 encoded user data.
    // In a real app, use JWTs with a secret key.
    const userData = {
      id: user._id?.toHexString(), // Convert ObjectId to string
      email: user.email,
      fullName: user.full_name,
      walletBalance: user.wallet_balance,
      isAdmin: user.is_admin,
    };
    return btoa(JSON.stringify(userData));
  },

  verifyToken(token: string): User | null {
    try {
      const decoded = JSON.parse(atob(token));
      // Reconstruct user object, converting id back to ObjectId if needed for db operations
      return {
        _id: new ObjectId(decoded.id),
        email: decoded.email,
        full_name: decoded.fullName,
        wallet_balance: decoded.walletBalance,
        is_admin: decoded.isAdmin,
        // created_at and updated_at are not in the token, so they will be undefined
      } as User;
    } catch (error) {
      console.error("Token verification failed:", error);
      return null;
    }
  },
};