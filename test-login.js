const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const uri = 'mongodb+srv://donvaibhav21:StX7LTcANb9G5NxI@cluster0.dmd7ds0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const JWT_SECRET = 'a2dd6f84dfd3f59ed4e6d4df6d83e3afdbba11a625ea64811f0fc42bdefdf12020428c39b90999730a348256254aab5c8589271b2ca70e3adc05b79017a96dd0';

async function testLogin() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('test');
    const usersCollection = db.collection('users');
    
    // Test user credentials
    const email = 'user1@example.com';
    const password = 'password123'; // Try a common password
    
    // Find user by email
    const user = await usersCollection.findOne({ email });
    if (!user) {
      console.error('User not found');
      return;
    }
    
    console.log('User found:', user.email);
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    console.log('Password valid:', isPasswordValid);
    
    if (isPasswordValid) {
      // Generate token
      const token = jwt.sign(
        {
          userId: user._id.toString(),
          email: user.email,
          isAdmin: user.is_admin || false
        },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      console.log('Generated token:', token);
      
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('Decoded token:', decoded);
    } else {
      console.log('Invalid password');
      
      // Try to hash a new password for testing
      const newPasswordHash = await bcrypt.hash('testpassword', 10);
      console.log('New password hash for testing:', newPasswordHash);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

testLogin();