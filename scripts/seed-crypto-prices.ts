import { getCollections, clientPromise } from '../lib/db';
import { mockCryptoPrices } from '../lib/mock-data';

async function seedCryptoPrices() {
  try {
    console.log('Connecting to MongoDB...');
    await clientPromise;
    
    const { cryptoPrices } = getCollections();
    
    // Check if collection already has data
    const count = await cryptoPrices.countDocuments();
    if (count > 0) {
      console.log(`Crypto prices collection already has ${count} documents. Clearing...`);
      await cryptoPrices.deleteMany({});
    }
    
    // Insert mock crypto prices
    const result = await cryptoPrices.insertMany(mockCryptoPrices);
    
    console.log(`Successfully seeded ${result.insertedCount} crypto prices into the database.`);
    console.log('Crypto prices added:', mockCryptoPrices.map(c => c.symbol).join(', '));
    
    return result;
  } catch (error) {
    console.error('Error seeding crypto prices:', error);
    throw error;
  } finally {
    // Close the connection
    console.log('Closing MongoDB connection...');
    const client = await clientPromise;
    await client.close();
    console.log('MongoDB connection closed.');
  }
}

// Run the seed function
seedCryptoPrices()
  .then(() => {
    console.log('Crypto prices seeding completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to seed crypto prices:', error);
    process.exit(1);
  });