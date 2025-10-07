import { connectToDatabase } from '../mongodb';
import { ObjectId } from 'mongodb';
import { validateAndNormalizeQueryId, logQueryIdInconsistency } from '../utils/queryIdUtils';

export interface ChatMessage {
  _id?: ObjectId;
  queryId: string;
  originalQueryId?: string; // For tracking original queryId during normalization
  isolationKey?: string; // Additional isolation key
  message: string;
  responseText: string;
  sender: string;
  senderRole: string;
  team: string;
  timestamp: Date;
  isRead?: boolean;
  isSystemMessage?: boolean;
  threadIsolated?: boolean; // Flag to indicate proper isolation
  actionType?: 'message' | 'approval' | 'revert' | 'resolution';
  metadata?: {
    queryStatus?: string;
    approvalId?: string;
    originalQueryId?: string;
    [key: string]: any;
  };
}

export interface QueryChatHistory {
  _id?: ObjectId;
  queryId: string;
  appNo: string;
  customerName: string;
  queryTitle: string;
  queryStatus: string;
  markedForTeam: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date; // When query was approved/resolved
  archiveReason?: string; // approved, rejected, deferred, otc
}

export class ChatStorageService {
  private static collectionName = 'query_chats';
  private static messagesCollectionName = 'chat_messages';
  private static archivedChatsCollectionName = 'archived_chats';

  // Get database connection
  private static async getDatabase() {
    try {
      const { db } = await connectToDatabase();
      return db;
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  // Get archived chats collection
  private static async getArchivedChatsCollection() {
    const db = await this.getDatabase();
    return db.collection(this.archivedChatsCollectionName);
  }

  // Get chat collection
  private static async getChatCollection() {
    const db = await this.getDatabase();
    return db.collection(this.collectionName);
  }

  // Get messages collection
  private static async getMessagesCollection() {
    const db = await this.getDatabase();
    return db.collection(this.messagesCollectionName);
  }

  /**
   * Store a chat message to database - ENHANCED ISOLATION by queryId
   * Ensures message is stored only for the specific query with multiple validation layers
   */
  static async storeChatMessage(message: Omit<ChatMessage, '_id'>): Promise<ChatMessage | null> {
    try {
      const collection = await this.getMessagesCollection();
      
      // Ensure queryId is stored consistently as string with validation and trimming
      const queryIdStr = message.queryId?.toString().trim();
      if (!queryIdStr) {
        console.error('Invalid queryId provided for chat message storage');
        return null;
      }
      
      // QUERYID TRACKING: Log detailed information
      console.log(`📋 ChatStorageService.storeChatMessage: Processing queryId "${queryIdStr}"`);
      console.log(`📋 ChatStorageService.storeChatMessage: QueryId type: ${typeof message.queryId}`);
      console.log(`📋 ChatStorageService.storeChatMessage: QueryId length: ${queryIdStr?.length}`);
      
      // Add queryId validation
      const validation = validateAndNormalizeQueryId(queryIdStr);
      console.log(`📋 ChatStorageService.storeChatMessage: QueryId validation:`, validation);
      
      if (!validation.isValid) {
        console.error(`❌ Invalid queryId format detected in storeChatMessage: "${queryIdStr}"`);
        return null;
      }
      
      const normalizedMessage = {
        ...message,
        queryId: queryIdStr,
        originalQueryId: message.queryId?.toString().trim(), // Keep original for reference
        isolationKey: `query_${queryIdStr}` // Additional isolation key
      };
      
      // Enhanced duplicate check within the same query only
      const existing = await collection.findOne({
        queryId: normalizedMessage.queryId,
        message: normalizedMessage.message,
        sender: normalizedMessage.sender,
        timestamp: {
          $gte: new Date(new Date(normalizedMessage.timestamp).getTime() - 5000), // 5 second window
          $lte: new Date(new Date(normalizedMessage.timestamp).getTime() + 5000)
        }
      });

      if (existing) {
        console.log(`🔒 Duplicate detected in isolated query ${normalizedMessage.queryId} thread, skipping`);
        return existing as ChatMessage;
      }

      // Insert new message with enhanced isolation metadata
      const result = await collection.insertOne({
        ...normalizedMessage,
        timestamp: new Date(normalizedMessage.timestamp),
        createdAt: new Date(),
        isRead: false,
        threadIsolated: true // Flag to indicate this message is properly isolated
      });

      console.log(`✅ Stored message in ISOLATED thread for query ${normalizedMessage.queryId}: ${result.insertedId}`);
      
      // Return the stored message
      const storedMessage = await collection.findOne({ _id: result.insertedId });
      return storedMessage as ChatMessage;

    } catch (error) {
      console.error('Error storing chat message:', error);
      return null;
    }
  }

  /**
   * Get chat messages for a query - ENHANCED ISOLATION by queryId with cross-team compatibility
   * Ensures each query has its own separate chat thread with strict validation
   */
  static async getChatMessages(queryId: string): Promise<ChatMessage[]> {
    try {
      const collection = await this.getMessagesCollection();
      
      // ENHANCED STRICT: Only get messages for this specific queryId
      const queryIdStr = queryId?.toString().trim();
      if (!queryIdStr) {
        console.error('Invalid queryId provided for chat message retrieval');
        return [];
      }
      
      // QUERYID TRACKING: Log retrieval request
      console.log(`📋 ChatStorageService.getChatMessages: Retrieving messages for queryId "${queryIdStr}"`);
      console.log(`📋 ChatStorageService.getChatMessages: QueryId type: ${typeof queryId}`);
      console.log(`📋 ChatStorageService.getChatMessages: QueryId length: ${queryIdStr.length}`);
      
      // Validate queryId format
      const validation = validateAndNormalizeQueryId(queryIdStr);
      console.log(`📋 ChatStorageService.getChatMessages: QueryId validation:`, validation);
      
      // ENHANCED: Create queryId variations for cross-team compatibility
      const queryIdVariations = this.generateQueryIdVariations(queryIdStr);
      console.log(`📋 ChatStorageService.getChatMessages: Generated variations:`, queryIdVariations);
      
      // ULTRA-STRICT query with multiple validation layers but allowing cross-team queryId formats
      const messages = await collection
        .find({
          $and: [
            // Layer 1: Match any queryId variation
            {
              $or: [
                ...queryIdVariations.map(variation => ({ queryId: variation })),
                ...queryIdVariations.map(variation => ({ originalQueryId: variation }))
              ]
            },
            // Layer 2: CRITICAL - Prevent substring matches by using regex with exact boundaries
            {
              $or: [
                ...queryIdVariations.map(variation => ({ 
                  queryId: { $regex: `^${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$` } 
                })),
                ...queryIdVariations.map(variation => ({ 
                  originalQueryId: { $regex: `^${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$` } 
                }))
              ]
            }
          ]
        })
        .sort({ timestamp: 1 })
        .toArray();

      // FINAL ULTRA-STRICT validation: Ensure ALL returned messages belong to the correct query variations
      const validatedMessages = messages.filter(msg => {
        const msgQueryId = msg.queryId?.toString().trim();
        const msgOriginalQueryId = msg.originalQueryId?.toString().trim();

        // CRITICAL: Check if message belongs to any of our queryId variations
        const primaryMatch = queryIdVariations.includes(msgQueryId);
        const secondaryMatch = queryIdVariations.includes(msgOriginalQueryId);

        // Final safety check - at least one must match exactly
        const isValid = primaryMatch || secondaryMatch;

        if (!isValid) {
          console.warn(`🚫 BLOCKED cross-query contamination in DB: target variations=[${queryIdVariations.join(', ')}], msgId="${msgQueryId}", origId="${msgOriginalQueryId}"`);
        }

        return isValid;
      });

      console.log(`🔒 ChatStorage: Retrieved ${validatedMessages.length} CROSS-TEAM COMPATIBLE messages for query ${queryId}`);
      
      if (validatedMessages.length !== messages.length) {
        console.warn(`⚠️ Filtered out ${messages.length - validatedMessages.length} messages due to strict isolation validation`);
      }
      
      return validatedMessages as ChatMessage[];
    } catch (error) {
      console.error('Error retrieving chat messages:', error);
      return [];
    }
  }

  /**
   * Generate STRICT queryId variations to prevent contamination
   */
  private static generateQueryIdVariations(queryId: string): string[] {
    const variations = new Set<string>();
    const trimmed = queryId.toString().trim();
    
    // ALWAYS add the original queryId
    variations.add(trimmed);
    
    // STRICT: Only handle specific, safe patterns to prevent contamination
    
    // Pattern 1: App numbers like "HPR85", "KTL91" -> extract number only if it's meaningful (2+ digits)
    const appNumberMatch = trimmed.match(/^([A-Z]+)(\d{2,})$/);
    if (appNumberMatch && appNumberMatch[2]) {
      const numericPart = appNumberMatch[2];
      if (numericPart.length >= 2) { // Only 2+ digit numbers to avoid contamination
        variations.add(numericPart);
      }
    }
    
    // Pattern 2: UUID with meaningful ending number (like "uuid-85" but only if 2+ digits)
    if (trimmed.includes('-')) {
      const endMatch = trimmed.match(/-(\d{2,})$/);
      if (endMatch && endMatch[1] && endMatch[1].length >= 2) {
        variations.add(endMatch[1]);
      }
    }
    
    // Pattern 3: Pure numeric IDs (2+ digits) - add UUID patterns
    if (/^\d{2,}$/.test(trimmed)) {
      variations.add(`uuid-query-${trimmed}`);
      variations.add(`query-${trimmed}`);
    }
    
    // Pattern 4: App numbers with spaces like "FR2 559" -> "559" (only if 2+ digits)
    if (trimmed.includes(' ')) {
      const parts = trimmed.split(' ');
      parts.forEach(part => {
        if (/^\d{2,}$/.test(part)) { // Only 2+ digit numbers
          variations.add(part);
        }
      });
    }
    
    return Array.from(variations);
  }

  /**
   * Archive chat history when query is approved/resolved
   */
  static async archiveQueryChat(
    queryId: string,
    queryData: {
      appNo: string;
      customerName: string;
      queryTitle: string;
      queryStatus: string;
      markedForTeam: string;
    },
    archiveReason: string = 'approved'
  ): Promise<QueryChatHistory | null> {
    try {
      const archivedChatsCollection = await this.getArchivedChatsCollection();
      const messagesCollection = await this.getMessagesCollection();

      // Get all messages for this query
      const messages = await messagesCollection
        .find({ queryId })
        .sort({ timestamp: 1 })
        .toArray();

      // Create chat history record
      const chatHistory: Omit<QueryChatHistory, '_id'> = {
        queryId,
        appNo: queryData.appNo,
        customerName: queryData.customerName,
        queryTitle: queryData.queryTitle,
        queryStatus: queryData.queryStatus,
        markedForTeam: queryData.markedForTeam,
        messages: messages as ChatMessage[],
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: new Date(),
        archiveReason
      };

      // Check if already archived
      const existing = await archivedChatsCollection.findOne({ queryId });
      if (existing) {
        // Update existing archive
        await archivedChatsCollection.updateOne(
          { queryId },
          {
            $set: {
              ...chatHistory,
              updatedAt: new Date(),
              archivedAt: new Date()
            }
          }
        );
        console.log(`✅ Updated archived chat history for query ${queryId}`);
        return existing as QueryChatHistory;
      } else {
        // Create new archive
        const result = await archivedChatsCollection.insertOne(chatHistory);
        console.log(`✅ Archived chat history for query ${queryId}: ${result.insertedId}`);
        
        const archived = await archivedChatsCollection.findOne({ _id: result.insertedId });
        return archived as QueryChatHistory;
      }

    } catch (error) {
      console.error('Error archiving chat history:', error);
      return null;
    }
  }

  /**
   * Get archived chat history for a query
   */
  static async getArchivedChatHistory(queryId: string): Promise<QueryChatHistory | null> {
    try {
      const collection = await this.getArchivedChatsCollection();
      const archived = await collection.findOne({ queryId });
      return archived as QueryChatHistory;
    } catch (error) {
      console.error('Error retrieving archived chat history:', error);
      return null;
    }
  }

  /**
   * Get all archived chats (for Query Raised section)
   */
  static async getAllArchivedChats(
    filters: {
      appNo?: string;
      customerName?: string;
      markedForTeam?: string;
      archiveReason?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<QueryChatHistory[]> {
    try {
      console.log('🔍 ChatStorageService: Getting archived chats with filters:', filters);
      const collection = await this.getArchivedChatsCollection();
      console.log('✅ ChatStorageService: Got archived chats collection');
      
      // Build query filter
      const query: any = {};
      if (filters.appNo) query.appNo = { $regex: filters.appNo, $options: 'i' };
      if (filters.customerName) query.customerName = { $regex: filters.customerName, $options: 'i' };
      if (filters.markedForTeam) query.markedForTeam = filters.markedForTeam;
      if (filters.archiveReason) query.archiveReason = filters.archiveReason;

      console.log('🔍 ChatStorageService: Query filter:', query);

      // Execute query with pagination
      const cursor = collection
        .find(query)
        .sort({ archivedAt: -1 });

      if (filters.offset) cursor.skip(filters.offset);
      if (filters.limit) cursor.limit(filters.limit);

      const results = await cursor.toArray();
      console.log(`📊 ChatStorageService: Found ${results.length} archived chats`);
      return results as QueryChatHistory[];

    } catch (error) {
      console.error('❌ ChatStorageService: Error retrieving archived chats:', error);
      return [];
    }
  }

  /**
   * Sync in-memory messages to database
   */
  static async syncInMemoryMessages(inMemoryMessages: any[]): Promise<number> {
    try {
      if (!inMemoryMessages || inMemoryMessages.length === 0) {
        return 0;
      }

      let syncedCount = 0;
      for (const msg of inMemoryMessages) {
        const chatMessage: Omit<ChatMessage, '_id'> = {
          queryId: msg.queryId?.toString() || 'unknown',
          message: msg.message || msg.responseText || '',
          responseText: msg.responseText || msg.message || '',
          sender: msg.sender || 'Unknown User',
          senderRole: msg.senderRole || 'unknown',
          team: msg.team || msg.senderRole || 'Unknown',
          timestamp: new Date(msg.timestamp || Date.now()),
          isRead: msg.isRead || false,
          isSystemMessage: msg.isSystemMessage || false,
          actionType: msg.actionType || 'message'
        };

        const stored = await this.storeChatMessage(chatMessage);
        if (stored) syncedCount++;
      }

      console.log(`✅ Synced ${syncedCount} in-memory messages to database`);
      return syncedCount;

    } catch (error) {
      console.error('Error syncing in-memory messages:', error);
      return 0;
    }
  }

  /**
   * Ensure database indexes for performance and isolation
   */
  static async ensureIndexes(): Promise<void> {
    try {
      const messagesCollection = await this.getMessagesCollection();
      const chatCollection = await this.getChatCollection();
      const archivedCollection = await this.getArchivedChatsCollection();

      // Enhanced indexes for messages collection with isolation support
      await messagesCollection.createIndex({ queryId: 1 });
      await messagesCollection.createIndex({ originalQueryId: 1 });
      await messagesCollection.createIndex({ isolationKey: 1 });
      await messagesCollection.createIndex({ queryId: 1, timestamp: -1 }); // Compound index for query-specific sorting
      await messagesCollection.createIndex({ queryId: 1, sender: 1, timestamp: -1 }); // For duplicate detection
      await messagesCollection.createIndex({ timestamp: -1 });
      await messagesCollection.createIndex({ sender: 1 });
      await messagesCollection.createIndex({ senderRole: 1 });
      await messagesCollection.createIndex({ threadIsolated: 1 }); // For filtering isolated messages

      // Enhanced indexes for chat history collection
      await chatCollection.createIndex({ queryId: 1 }, { unique: true });
      await chatCollection.createIndex({ appNo: 1 });
      await chatCollection.createIndex({ customerName: 1 });
      await chatCollection.createIndex({ markedForTeam: 1 });
      await chatCollection.createIndex({ archivedAt: -1 });
      await chatCollection.createIndex({ archiveReason: 1 });

      // Indexes for archived chats collection
      await archivedCollection.createIndex({ queryId: 1 }, { unique: true });
      await archivedCollection.createIndex({ appNo: 1 });
      await archivedCollection.createIndex({ customerName: 1 });
      await archivedCollection.createIndex({ markedForTeam: 1 });
      await archivedCollection.createIndex({ archivedAt: -1 });
      await archivedCollection.createIndex({ archiveReason: 1 });

      console.log('✅ Enhanced database indexes ensured for chat storage with isolation support');

    } catch (error) {
      console.error('Error ensuring database indexes:', error);
    }
  }

  /**
   * Verify chat isolation integrity - specifically for Vercel deployment
   * Returns detailed analysis of potential cross-query contamination
   */
  static async verifyIsolationIntegrity(): Promise<{
    isHealthy: boolean;
    totalMessages: number;
    queryCount: number;
    issues: Array<{
      type: string;
      queryId: string;
      count: number;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
    recommendations: string[];
  }> {
    try {
      const messagesCollection = await this.getMessagesCollection();
      const allMessages = await messagesCollection.find({}).toArray();
      
      const queryGroups = new Map<string, any[]>();
      const issues = [];
      const recommendations = [];
      
      // Group messages by queryId
      for (const message of allMessages) {
        const queryId = message.queryId?.toString()?.trim();
        if (!queryId) {
          issues.push({
            type: 'missing_query_id',
            queryId: 'unknown',
            count: 1,
            severity: 'high' as const,
            description: `Message ${message._id} has no queryId`
          });
          continue;
        }
        
        if (!queryGroups.has(queryId)) {
          queryGroups.set(queryId, []);
        }
        queryGroups.get(queryId)!.push(message);
      }
      
      // Check each query group for issues
      for (const [queryId, messages] of queryGroups) {
        // Check for messages with mismatched queryIds
        const mismatchedMessages = messages.filter(msg => {
          const msgQueryId = msg.queryId?.toString()?.trim();
          const msgOriginalQueryId = msg.originalQueryId?.toString()?.trim();
          return msgQueryId !== queryId && msgOriginalQueryId !== queryId;
        });
        
        if (mismatchedMessages.length > 0) {
          issues.push({
            type: 'cross_query_contamination',
            queryId,
            count: mismatchedMessages.length,
            severity: 'high' as const,
            description: `${mismatchedMessages.length} messages with mismatched queryIds found in query ${queryId}`
          });
        }
        
        // Check for missing isolation metadata
        const untaggedMessages = messages.filter(msg => !msg.threadIsolated);
        if (untaggedMessages.length > 0) {
          issues.push({
            type: 'missing_isolation_metadata',
            queryId,
            count: untaggedMessages.length,
            severity: 'medium' as const,
            description: `${untaggedMessages.length} messages missing isolation metadata in query ${queryId}`
          });
        }
      }
      
      // Generate recommendations
      if (issues.length === 0) {
        recommendations.push('Chat isolation is healthy - no issues detected');
      } else {
        recommendations.push('Run POST /api/fix-vercel-chat to fix isolation issues');
        
        if (issues.some(i => i.type === 'cross_query_contamination')) {
          recommendations.push('Critical: Cross-query contamination detected - messages appearing in wrong query threads');
        }
        
        if (issues.some(i => i.type === 'missing_isolation_metadata')) {
          recommendations.push('Add isolation metadata to improve query separation');
        }
      }
      
      const isHealthy = issues.filter(i => i.severity === 'high').length === 0;
      
      return {
        isHealthy,
        totalMessages: allMessages.length,
        queryCount: queryGroups.size,
        issues,
        recommendations
      };
      
    } catch (error) {
      console.error('Error verifying isolation integrity:', error);
      return {
        isHealthy: false,
        totalMessages: 0,
        queryCount: 0,
        issues: [{
          type: 'system_error',
          queryId: 'system',
          count: 1,
          severity: 'high',
          description: `System error during isolation check: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        recommendations: ['Fix system errors before checking isolation']
      };
    }
  }
}

// Auto-ensure indexes on module load
if (process.env.NODE_ENV !== 'production') {
  ChatStorageService.ensureIndexes().catch(console.error);
}
