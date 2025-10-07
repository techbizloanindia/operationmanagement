import { NextRequest, NextResponse } from 'next/server';
import { ChatStorageService } from '@/lib/services/ChatStorageService';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing cross-team chat messaging...');
    
    const body = await request.json();
    const { testQueryId = '123' } = body;
    
    // Generate test queryId variations
    const numericQueryId = testQueryId;
    const uuidQueryId = `uuid-query-${testQueryId}`;
    const complexUuidQueryId = `${crypto.randomUUID()}-${testQueryId}`;
    
    console.log(`🧪 Testing with queryId variations:`, {
      numeric: numericQueryId,
      uuid: uuidQueryId,
      complex: complexUuidQueryId
    });
    
    const testResults: any[] = [];
    
    // Test 1: Store message with numeric queryId (Operations team)
    console.log('📝 Test 1: Storing Operations message with numeric queryId...');
    const operationsMessage = await ChatStorageService.storeChatMessage({
      queryId: numericQueryId,
      message: 'Test message from Operations team',
      responseText: 'Test message from Operations team',
      sender: 'Operations User',
      senderRole: 'operations',
      team: 'operations',
      timestamp: new Date(),
      isSystemMessage: false,
      actionType: 'message'
    });
    
    testResults.push({
      test: 'Store Operations Message',
      queryId: numericQueryId,
      success: !!operationsMessage,
      messageId: operationsMessage?._id?.toString()
    });
    
    // Test 2: Store message with UUID queryId (Credit team)
    console.log('📝 Test 2: Storing Credit message with UUID queryId...');
    const creditMessage = await ChatStorageService.storeChatMessage({
      queryId: uuidQueryId,
      message: 'Test message from Credit team',
      responseText: 'Test message from Credit team',
      sender: 'Credit User',
      senderRole: 'credit',
      team: 'credit',
      timestamp: new Date(),
      isSystemMessage: false,
      actionType: 'message'
    });
    
    testResults.push({
      test: 'Store Credit Message',
      queryId: uuidQueryId,
      success: !!creditMessage,
      messageId: creditMessage?._id?.toString()
    });
    
    // Test 3: Retrieve messages using numeric queryId (should get both)
    console.log('📬 Test 3: Retrieving messages using numeric queryId...');
    const messagesFromNumeric = await ChatStorageService.getChatMessages(numericQueryId);
    
    testResults.push({
      test: 'Retrieve with Numeric QueryId',
      queryId: numericQueryId,
      messagesFound: messagesFromNumeric.length,
      messages: messagesFromNumeric.map(m => ({
        sender: m.sender,
        team: m.team,
        queryId: m.queryId,
        messagePreview: m.message.substring(0, 30) + '...'
      }))
    });
    
    // Test 4: Retrieve messages using UUID queryId (should get both)
    console.log('📬 Test 4: Retrieving messages using UUID queryId...');
    const messagesFromUuid = await ChatStorageService.getChatMessages(uuidQueryId);
    
    testResults.push({
      test: 'Retrieve with UUID QueryId',
      queryId: uuidQueryId,
      messagesFound: messagesFromUuid.length,
      messages: messagesFromUuid.map(m => ({
        sender: m.sender,
        team: m.team,
        queryId: m.queryId,
        messagePreview: m.message.substring(0, 30) + '...'
      }))
    });
    
    // Test 5: Test the chat API endpoint with numeric queryId
    console.log('🌐 Test 5: Testing chat API with numeric queryId...');
    const chatApiNumericResponse = await fetch(`${request.nextUrl.origin}/api/queries/${numericQueryId}/chat?team=operations&crossTeam=true`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const chatApiNumericResult = await chatApiNumericResponse.json();
    
    testResults.push({
      test: 'Chat API with Numeric QueryId',
      queryId: numericQueryId,
      success: chatApiNumericResult.success,
      messagesFound: chatApiNumericResult.data?.length || 0,
      apiResponse: chatApiNumericResult.success ? 'OK' : chatApiNumericResult.error
    });
    
    // Test 6: Test the chat API endpoint with UUID queryId
    console.log('🌐 Test 6: Testing chat API with UUID queryId...');
    const chatApiUuidResponse = await fetch(`${request.nextUrl.origin}/api/queries/${encodeURIComponent(uuidQueryId)}/chat?team=credit&crossTeam=true`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const chatApiUuidResult = await chatApiUuidResponse.json();
    
    testResults.push({
      test: 'Chat API with UUID QueryId',
      queryId: uuidQueryId,
      success: chatApiUuidResult.success,
      messagesFound: chatApiUuidResult.data?.length || 0,
      apiResponse: chatApiUuidResult.success ? 'OK' : chatApiUuidResult.error
    });
    
    // Test 7: Send a message via API and check cross-team visibility
    console.log('📤 Test 7: Sending message via API...');
    const sendMessageResponse = await fetch(`${request.nextUrl.origin}/api/queries/${numericQueryId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Cross-team test message via API',
        sender: 'Test User',
        senderRole: 'operations',
        team: 'Operations',
        queryId: numericQueryId
      })
    });
    
    const sendMessageResult = await sendMessageResponse.json();
    
    testResults.push({
      test: 'Send Message via API',
      queryId: numericQueryId,
      success: sendMessageResult.success,
      apiResponse: sendMessageResult.success ? 'OK' : sendMessageResult.error
    });
    
    // Test 8: Verify the sent message is visible from both queryId formats
    if (sendMessageResult.success) {
      console.log('📬 Test 8: Verifying cross-team visibility of sent message...');
      
      const finalNumericMessages = await ChatStorageService.getChatMessages(numericQueryId);
      const finalUuidMessages = await ChatStorageService.getChatMessages(uuidQueryId);
      
      testResults.push({
        test: 'Cross-team Visibility Check',
        numericQueryIdMessages: finalNumericMessages.length,
        uuidQueryIdMessages: finalUuidMessages.length,
        crossTeamWorking: finalNumericMessages.length === finalUuidMessages.length && finalNumericMessages.length > 0
      });
    }
    
    // Summary
    const successfulTests = testResults.filter(t => t.success !== false && !t.test.includes('Check') || t.crossTeamWorking).length;
    const totalTests = testResults.length;
    
    console.log(`✅ Cross-team chat test completed: ${successfulTests}/${totalTests} tests passed`);
    
    return NextResponse.json({
      success: true,
      message: `Cross-team chat test completed`,
      summary: {
        totalTests,
        successfulTests,
        passRate: `${Math.round((successfulTests / totalTests) * 100)}%`
      },
      testResults,
      recommendations: [
        successfulTests === totalTests ? 
          '✅ All tests passed! Cross-team messaging is working correctly.' :
          '⚠️ Some tests failed. Check the test results for details.',
        'Run the /api/fix-chat-cross-team endpoint to fix any existing message compatibility issues.',
        'Monitor the chat logs for any queryId mismatch errors.'
      ]
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ Error testing cross-team chat:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to test cross-team chat: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}
