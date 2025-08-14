const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = 'mongodb+srv://donvaibhav21:StX7LTcANb9G5NxI@cluster0.dmd7ds0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function updatePassword() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('test');
    const usersCollection = db.collection('users');
    
    // User email to update
    const email = 'user1@example.com';
    const newPassword = 'password123';
    
    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update the user's password
    const result = await usersCollection.updateOne(
      { email },
      { $set: { password_hash: passwordHash } }
    );
    
    if (result.modifiedCount === 1) {
      console.log('Password updated successfully');
    } else {
      console.log('Failed to update password');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

updatePassword();