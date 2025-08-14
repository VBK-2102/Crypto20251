import { dbOperations as db, User } from "./db";
import { ObjectId } from "mongodb";
import { authUtils } from "./auth-utils";

export const simpleAuth = {
  async login(email: string, password: string): Promise<User | null> {
    const user = await db.getUserByEmail(email);
    if (user && (await authUtils.comparePassword(password, user.password_hash))) {
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

    const passwordHash = await authUtils.hashPassword(password); // Hash password with salt rounds

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

  // This method is deprecated - use authUtils.generateToken instead
  generateToken(user: User): string {
    // Generate a proper JWT token
    return authUtils.generateToken({
      userId: user._id?.toHexString(),
      email: user.email,
      isAdmin: user.is_admin || false
    });
  },

  // This method is deprecated - use authUtils.verifyToken instead
  verifyToken(token: string): User | null {
    try {
      // Verify the JWT token
      const payload = authUtils.verifyToken(token);
      if (!payload) return null;
      
      // Get the user from the database using the userId from the payload
      return db.getUserById(payload.userId);
    } catch (error) {
      console.error("Token verification failed:", error);
      return null;
    }
  },
};