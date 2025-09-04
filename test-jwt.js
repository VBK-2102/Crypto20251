// Simple script to test JWT token generation
require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

console.log('JWT_SECRET available:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);

try {
  const token = jwt.sign({ test: 'payload' }, JWT_SECRET, { expiresIn: '1h' });
  console.log('Token generated successfully:', token);
  
  // Verify the token
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('Token verified successfully:', decoded);
} catch (error) {
  console.error('Error with JWT operations:', error);
}