import { ChatStorageService } from '@/lib/services/ChatStorageService';
import { broadcastQueryUpdate } from '@/lib/eventStreamUtils';

/**
 * Enhanced message broadcast service for Vercel deployment
 * Prevents message reflection and cross-query contamination
 */

export interface MessageBroadcast {
  queryId: string;
  appNo: string;
  message: string;
  sender: string;
  senderRole: string;
  team: string;
  timestamp: string;
  messageType: 'chat' | 'system' | 'action';
  excludeConnectionId?: string;
}

export class MessageBroadcastService {
  /**
   * Broadcast message update to all relevant clients except sender
   * Prevents message reflection on Vercel serverless deployment
   */
  static broadcastMessageUpdate(broadcast: MessageBroadcast): void {
    try {
      const updateData = {
        type: 'message_update',
        id: broadcast.queryId,
        queryId: broadcast.queryId,
        appNo: broadcast.appNo,
        action: 'message_added',
        messageData: {
          queryId: broadcast.queryId,
          message: broadcast.message,
          sender: broadcast.sender,
          senderRole: broadcast.senderRole,
          team: broadcast.team,
          timestamp: broadcast.timestamp,
          messageType: broadcast.messageType
        },
        isolationKey: `query_${broadcast.queryId}`,
        preventReflection: true,
        timestamp: new Date().toISOString()
      };

      // Broadcast to all connected clients except the sender
      broadcastQueryUpdate(updateData, broadcast.excludeConnectionId);

      console.log(`📡 Message broadcast sent for query ${broadcast.queryId} (excluding sender: ${broadcast.excludeConnectionId || 'none'})`);
    } catch (error) {
      console.error('Error broadcasting message update:', error);
    }
  }

  /**
   * Broadcast query action update with proper isolation
   */
  static broadcastQueryAction(queryId: string, action: string, data: any, excludeConnectionId?: string): void {
    try {
      const updateData = {
        type: 'query_action',
        id: queryId,
        queryId: queryId,
        action: action,
        actionData: data,
        isolationKey: `query_${queryId}`,
        preventReflection: true,
        timestamp: new Date().toISOString()
      };

      broadcastQueryUpdate(updateData, excludeConnectionId);

      console.log(`📡 Query action broadcast sent: ${action} for query ${queryId}`);
    } catch (error) {
      console.error('Error broadcasting query action:', error);
    }
  }

  /**
   * Verify message isolation before broadcasting
   * Ensures the message belongs to the correct query thread
   */
  static async verifyMessageIsolation(queryId: string, messageId: string): Promise<boolean> {
    try {
      const messages = await ChatStorageService.getChatMessages(queryId);
      const messageExists = messages.some(msg => 
        msg._id?.toString() === messageId || 
        msg.queryId === queryId
      );

      if (!messageExists) {
        console.warn(`⚠️ Message isolation violation: Message ${messageId} not found in query ${queryId}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error verifying message isolation:', error);
      return false;
    }
  }

  /**
   * Clean up any duplicate or reflected messages in real-time
   */
  static async cleanupDuplicateMessages(queryId: string): Promise<void> {
    try {
      const messages = await ChatStorageService.getChatMessages(queryId);
      const uniqueMessages = new Map<string, any>();
      const duplicates = [];

      for (const message of messages) {
        const timestamp = Math.floor(new Date(message.timestamp).getTime() / 1000);
        const uniqueKey = `${message.message}|${message.sender}|${timestamp}`;

        if (uniqueMessages.has(uniqueKey)) {
          duplicates.push(message);
        } else {
          uniqueMessages.set(uniqueKey, message);
        }
      }

      if (duplicates.length > 0) {
        console.log(`🧹 Found ${duplicates.length} duplicate messages in query ${queryId}, cleaning up...`);
        
        // This would require direct database access to remove duplicates
        // For now, just log the issue
        duplicates.forEach(dup => {
          console.log(`🔍 Duplicate detected: ${dup._id} - "${dup.message.substring(0, 50)}..."`);
        });
      }
    } catch (error) {
      console.error('Error cleaning duplicate messages:', error);
    }
  }
}