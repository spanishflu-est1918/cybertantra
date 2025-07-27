import { NextRequest, NextResponse } from 'next/server';

// VAPI webhook endpoint for handling assistant events
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Log webhook event for debugging
    console.log('VAPI Webhook Event:', body);
    
    // Handle different event types
    switch (body.type) {
      case 'function-call':
        // Handle function calls from VAPI assistant
        const { functionName, parameters } = body.data;
        
        // Example: Handle RAG retrieval
        if (functionName === 'retrieve_lectures') {
          // Call the cybertantra RAG endpoint
          const ragResponse = await fetch(`${process.env.CYBERTANTRA_API_URL || 'https://cybertantra-omega.vercel.app'}/api/rag`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.CYBERTANTRA_API_KEY || '',
            },
            body: JSON.stringify({
              query: parameters.query,
              limit: parameters.limit || 20,
            }),
          });
          
          if (!ragResponse.ok) {
            throw new Error('Failed to retrieve lectures');
          }
          
          const data = await ragResponse.json();
          
          return NextResponse.json({
            result: data.context,
          });
        }
        
        // Handle other function calls
        return NextResponse.json({
          result: 'Function not implemented',
        });
        
      case 'speech-update':
        // Handle speech updates if needed
        return NextResponse.json({ success: true });
        
      case 'call-ended':
        // Handle call end events
        return NextResponse.json({ success: true });
        
      default:
        return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('VAPI webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook verification)
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}