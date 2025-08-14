import { dbOperations as db, clientPromise } from "../lib/db";
import bcrypt from "bcryptjs";

async function seedUsers() {
  try {
    await clientPromise; // Ensure database connection is established
    console.log("Database connected for seeding.");

    const usersToSeed = [
      {
        email: "admin@cryptopay.com",
        password: "admin123",
        fullName: "CryptoPay Admin",
        isAdmin: true,
      },
      {
        email: "user@example.com",
        password: "user123",
        fullName: "Example User",
        isAdmin: false,
      },
    ];

    for (const userData of usersToSeed) {
      const existingUser = await db.getUserByEmail(userData.email);
      if (existingUser) {
        console.log(`User ${userData.email} already exists. Skipping.`);
        continue;
      }

      const passwordHash = await bcrypt.hash(userData.password, 10);
      const newUser = await db.createUser(
        userData.email,
        passwordHash,
        userData.fullName,
        undefined, // phone
        userData.isAdmin // is_admin
      );
      console.log(`User ${newUser.email} created with ID: ${newUser._id}`);
    }

    console.log("User seeding complete.");
  } catch (error) {
    console.error("Error seeding users:", error);
  } finally {
    // It's generally not recommended to close the client in a Next.js app
    // as it's managed by the global variable, but for a script, it's fine.
    // await client.close(); // If you export client from db.ts
  }
}

seedUsers();