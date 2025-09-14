// Re-export the MongoDB connection function with the expected name
import connectDB from './mongodb.js';

// Export with the name that the route files expect
export const connectMongoDB = connectDB;

// Also export as default for backwards compatibility
export default connectDB;