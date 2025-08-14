import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
  throw new Error('Please add your MONGODB_URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the client is not recreated on every hot reload
  if (!(global as any)._mongoClientPromise) {
    client = new MongoClient(uri);
    (global as any)._mongoClientPromise = client.connect();
  }
  clientPromise = (global as any)._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

let db: Db;

clientPromise.then(async (connectedClient) => {
  db = connectedClient.db(); // Connect to the default database specified in the URI
  // Ensure collections exist
  try {
    await db.createCollection('users', { writeConcern: { w: 'majority' } });
    await db.createCollection('transactions', { writeConcern: { w: 'majority' } });
    await db.createCollection('crypto_prices', { writeConcern: { w: 'majority' } });
    console.log("MongoDB collections ensured.");
  } catch (e) {
    // Collection already exists, or other error
    console.log("Collections might already exist or error creating them:", (e as Error).message);
  }
}).catch(error => {
  console.error("Failed to connect to MongoDB:", error);
  process.exit(1); // Exit if database connection fails
});

export { clientPromise };

export function getDb(): Db {
  if (!db) {
    throw new Error("Database not initialized. Ensure clientPromise has resolved.");
  }
  return db;
}

export function getCollections() {
  const database = getDb();
  return {
    users: database.collection<User>('users'),
    transactions: database.collection<Transaction>('transactions'),
    cryptoPrices: database.collection<CryptoPrice>('crypto_prices'),
  };
}

// Define interfaces for collections
export interface User {
  _id?: ObjectId;
  email: string;
  password_hash: string;
  full_name: string;
  phone?: string;
  wallet_balance: number; // Store as number
  is_admin: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Transaction {
  _id?: ObjectId;
  user_id: ObjectId; // Reference to User's _id
  type: "deposit" | "withdrawal" | "crypto_buy" | "crypto_sell";
  amount: number;
  currency: string;
  crypto_amount?: number;
  crypto_currency?: string;
  status: "pending" | "completed" | "failed";
  payment_method?: string;
  transaction_hash?: string;
  receiver_address?: string;
  upi_reference?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CryptoPrice {
  _id?: ObjectId;
  symbol: string;
  price_inr: number;
  price_usd: number;
  change_24h: number;
  updated_at: Date;
}

// Placeholder for db operations (will be implemented in Phase 3)
export const dbOperations = {
  // User operations
  async createUser(email: string, passwordHash: string, fullName: string, phone?: string): Promise<User> {
    const { users } = getCollections();
    const newUser: User = {
      email,
      password_hash: passwordHash,
      full_name: fullName,
      phone,
      wallet_balance: 0, // Default for new user
      is_admin: false, // Default for new user
      created_at: new Date(),
      updated_at: new Date(),
    };
    const result = await users.insertOne(newUser);
    if (!result.acknowledged) {
      throw new Error("Failed to create user");
    }
    return { ...newUser, _id: result.insertedId };
  },
  async getUserByEmail(email: string): Promise<User | null> {
    const { users } = getCollections();
    const user = await users.findOne({ email });
    return user;
  },
  async getUserById(id: string): Promise<User | null> {
    const { users } = getCollections();
    const user = await users.findOne({ _id: new ObjectId(id) });
    return user;
  },
  async updateUserBalance(userId: string, amount: number): Promise<number> {
    const { users } = getCollections();
    const result = await users.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $inc: { wallet_balance: amount }, $set: { updated_at: new Date() } },
      { returnDocument: 'after' } // Return the updated document
    );
    if (!result) {
      throw new Error("User not found or balance not updated");
    }
    return result.wallet_balance;
  },
      
  async createTransaction(transaction: Omit<Transaction, "_id" | "created_at" | "updated_at">): Promise<Transaction> {
    const { transactions } = getCollections();
    const newTransaction: Transaction = {
      ...transaction,
      user_id: new ObjectId(transaction.user_id), // Convert to ObjectId
      created_at: new Date(),
      updated_at: new Date(),
    };
    const result = await transactions.insertOne(newTransaction);
    if (!result.acknowledged) {
      throw new Error("Failed to create transaction");
    }
    return { ...newTransaction, _id: result.insertedId };
  },
  async getUserTransactions(userId: string): Promise<Transaction[]> {
    const { transactions } = getCollections();
    const transactionsData = await transactions.find({ user_id: new ObjectId(userId) }).sort({ created_at: -1 }).limit(50).toArray();
    return transactionsData;
  },
  async getAllTransactions(): Promise<(Transaction & { email: string; full_name: string })[]> {
    const { transactions, users } = getCollections();
    const transactionsWithUserInfo = await transactions.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user_info'
        }
      },
      {
        $unwind: '$user_info'
      },
      {
        $project: {
          _id: 1,
          user_id: 1,
          type: 1,
          amount: 1,
          currency: 1,
          crypto_amount: 1,
          crypto_currency: 1,
          status: 1,
          payment_method: 1,
          transaction_hash: 1,
          receiver_address: 1,
          upi_reference: 1,
          created_at: 1,
          updated_at: 1,
          email: '$user_info.email',
          full_name: '$user_info.full_name'
        }
      },
      {
        $sort: { created_at: -1 }
      },
      {
        $limit: 100
      }
    ]).toArray();
    return transactionsWithUserInfo as (Transaction & { email: string; full_name: string })[];
  },
  async updateTransactionStatus(id: string, status: Transaction["status"]): Promise<Transaction> {
    const { transactions } = getCollections();
    const result = await transactions.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status: status, updated_at: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) {
      throw new Error("Transaction not found or status not updated");
    }
    return result;
  },

  async getTransactionByHash(transactionHash: string): Promise<Transaction | null> {
    const { transactions } = getCollections();
    const transaction = await transactions.findOne({ transaction_hash: transactionHash });
    return transaction;
  },

  // Crypto price operations
  async getCryptoPrices(): Promise<CryptoPrice[]> {
    const { cryptoPrices } = getCollections();
    const prices = await cryptoPrices.find({}).sort({ symbol: 1 }).toArray();
    return prices;
  },
  async updateCryptoPrice(symbol: string, priceInr: number, priceUsd: number, change24h: number): Promise<CryptoPrice> {
    const { cryptoPrices } = getCollections();
    const result = await cryptoPrices.findOneAndUpdate(
      { symbol: symbol },
      {
        $set: {
          price_inr: priceInr,
          price_usd: priceUsd,
          change_24h: change24h,
          updated_at: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' } // upsert: true creates if not exists
    );
    if (!result) {
      throw new Error("Failed to update crypto price");
    }
    return result;
  },
};