import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// Validate MongoDB URI
if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Set Mongoose options globally
mongoose.set('strictQuery', false); // Allow fields not in schema
mongoose.set('bufferCommands', false); // Disable mongoose buffering

// Enhanced connection options for high concurrency
const options = {
  bufferCommands: false,
  
  // Timeout configurations
  serverSelectionTimeoutMS: 15000, // Wait up to 15 seconds for server selection
  socketTimeoutMS: 60000, // Close sockets after 60 seconds of inactivity
  connectTimeoutMS: 30000, // Give up initial connection after 30 seconds
  
  // Connection pool settings for 50+ concurrent users
  maxPoolSize: 100, // Maximum number of connections in the pool
  minPoolSize: 5, // Minimum number of connections in the pool
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  
  // Network reliability
  family: 4, // Force IPv4 only
  heartbeatFrequencyMS: 10000, // Heartbeat every 10 seconds
  
  // Retry logic
  retryWrites: true, // Enable retryable writes
  retryReads: true, // Enable retryable reads
  
  // Additional performance optimizations
  compressors: 'snappy,zlib', // Enable compression
  readPreference: 'primaryPreferred', // Read from primary, fallback to secondary
  
  // Write concern for better performance
  writeConcern: {
    w: 'majority',
    wtimeout: 10000
  }
};

// Cached connection with simplified error handling
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { 
    conn: null, 
    promise: null
  };
}

/**
 * Enhanced MongoDB connection with simplified logic
 * @returns {Promise<mongoose.Connection>}
 */
async function connectDB() {
  // If we already have a working connection, return it
  if (cached.conn) {
    return cached.conn;
  }

  // If a connection attempt is already in progress, wait for it
  if (!cached.promise) {
    console.log('🔄 Initiating new MongoDB connection...');
    
    cached.promise = mongoose.connect(MONGODB_URI, options)
      .then((mongoose) => {
        console.log('✅ MongoDB connected successfully');
        console.log(`📊 Connection pool size: ${options.maxPoolSize}`);
        
        // Set up connection event listeners
        mongoose.connection.on('error', (error) => {
          console.error('🔴 MongoDB connection error:', error.message);
        });
        
        mongoose.connection.on('disconnected', () => {
          console.log('⚠️ MongoDB disconnected');
          cached.conn = null;
          cached.promise = null;
        });
        
        mongoose.connection.on('reconnected', () => {
          console.log('🔄 MongoDB reconnected');
        });
        
        mongoose.connection.on('close', () => {
          console.log('🔌 MongoDB connection closed');
          cached.conn = null;
          cached.promise = null;
        });
        
        return mongoose.connection;
      })
      .catch((error) => {
        console.error('🔴 MongoDB connection failed:', error);
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    console.error('❌ Failed to connect to MongoDB:', error.message);
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

/**
 * Graceful shutdown function
 */
export async function closeDB() {
  try {
    if (cached.conn) {
      await mongoose.connection.close();
      cached.conn = null;
      cached.promise = null;
      console.log('📴 MongoDB connection closed gracefully');
    }
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
}

/**
 * Check connection health
 */
export function getConnectionStatus() {
  if (!mongoose.connection) return 'disconnected';
  
  switch (mongoose.connection.readyState) {
    case 0: return 'disconnected';
    case 1: return 'connected';
    case 2: return 'connecting';
    case 3: return 'disconnecting';
    default: return 'unknown';
  }
}

/**
 * Get connection statistics
 */
export function getConnectionStats() {
  return {
    status: getConnectionStatus(),
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name
  };
}

export default connectDB;