import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    
    // Get collection stats
    const collectionStats = await Promise.all(
      collections.map(async (collection) => {
        try {
          const collectionName = collection.name;
          const count = await db.collection(collectionName).countDocuments();
          const indexes = await db.collection(collectionName).indexes();
          
          return {
            name: collectionName,
            count: count,
            size: 0,
            storageSize: 0,
            avgObjSize: 0,
            indexes: indexes.length || 0
          };
        } catch (error) {
          // If stats fail, just return basic info
          const count = await db.collection(collection.name).countDocuments();
          return {
            name: collection.name,
            count: count,
            size: 0,
            storageSize: 0,
            avgObjSize: 0,
            indexes: 0
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      database: db.databaseName,
      totalCollections: collections.length,
      collections: collectionStats
    });

  } catch (error) {
    console.error('Database info error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: `Failed to get database info: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}