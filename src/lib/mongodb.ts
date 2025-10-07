import { MongoClient, ServerApiVersion, Db } from 'mongodb';

// Check if we're in build mode
const isBuildTime = process.env.BUILDING === 'true';

// Only throw error if not in build mode
if (!process.env.MONGODB_URI && !isBuildTime) {
  console.warn('MongoDB URI not found in environment variables. Using mock connection.');
}

// Use a mock URI during build time or if not provided
const uri = isBuildTime ? 
  'mongodb://localhost:27017/mockdb' : 
  process.env.MONGODB_URI || 'mongodb://localhost:27017/mockdb';

// Ensure proper MongoDB URI format for production
const mongoUri = uri.includes('mongodb+srv://') || uri.includes('mongodb://localhost') ? 
  uri : 
  `mongodb+srv://${uri}`;

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Skip client creation during build time
if (isBuildTime) {
  clientPromise = Promise.resolve({} as MongoClient);
} else if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(mongoUri, options);
    globalWithMongo._mongoClientPromise = client.connect().catch((error) => {
      console.error('Failed to connect to MongoDB in development:', error);
      throw error;
    });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(mongoUri, options);
  clientPromise = client.connect().catch((error) => {
    console.error('Failed to connect to MongoDB in production:', error);
    throw error;
  });
}

// Database connection helper
export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  try {
    // Skip database connection during build time
    if (process.env.BUILDING === 'true') {
      console.log("🏗️ MongoDB connection skipped during build time");
      // Return mock client and db during build
      return {
        client: {} as MongoClient,
        db: {} as Db
      };
    }

    console.log('🔌 Connecting to MongoDB...', { 
      uri: mongoUri?.substring(0, 20) + '...', 
      env: process.env.NODE_ENV 
    });
    
    const client = await clientPromise;
    const dbName = process.env.MONGODB_DATABASE || 'querymodel';
    const db = client.db(dbName);
    
    console.log(`📊 Using database: ${dbName}`);
    
    // Test the connection only if not during build
    if (process.env.BUILDING !== 'true') {
      try {
        const startTime = Date.now();
        await client.db("admin").command({ ping: 1 });
        const duration = Date.now() - startTime;
        console.log(`✅ Successfully connected to MongoDB! (${duration}ms)`);
        
        // Test database access in development only (to avoid timeout in production)
        if (process.env.NODE_ENV === 'development') {
          const collections = await db.listCollections().toArray();
          console.log(`📋 Available collections: ${collections.map(c => c.name).join(', ') || 'none'}`);
        }
        
      } catch (pingError) {
        console.warn("⚠️ MongoDB ping failed, but continuing with connection:", pingError);
        // Still return the connection as it might work for queries
      }
    }
    
    return { client, db };
  } catch (error) {
    console.error("💥 Failed to connect to MongoDB:", {
      error: error instanceof Error ? error.message : error,
      uri: mongoUri?.substring(0, 20) + '...',
      env: process.env.NODE_ENV
    });
    
    // During build time, use mock data
    if (process.env.BUILDING === 'true') {
      console.log("🔧 Using mock database connection for build");
      return {
        client: {} as MongoClient,
        db: {} as Db
      };
    }
    
    throw error;
  }
}

// Alias for backward compatibility
export const connectDB = connectToDatabase;

// Export the clientPromise for use in API routes
export default clientPromise; 