import { NextResponse } from 'next/server';
import { TextToSpeechService } from '@cybertantra/ai';
import { validateRequest, corsHeaders } from '../../middleware';

export async function GET() {
  // Validate request (API key + rate limit)
  const validationError = await validateRequest();
  if (validationError) return validationError;

  try {
    const tts = new TextToSpeechService();
    
    // Get current usage
    const usage = await tts.getUsageInfo();
    
    // Calculate cost for a typical 5-minute meditation (~3000 chars)
    const typicalMeditationCost = tts.calculateCostEstimate('x'.repeat(3000), usage.subscription.tier);
    
    const headers = await corsHeaders();
    return NextResponse.json({
      subscription: usage.subscription,
      user: {
        email: usage.user.email,
        is_new_user: usage.user.is_new_user,
      },
      costEstimates: {
        per5MinMeditation: typicalMeditationCost,
        per10MinMeditation: tts.calculateCostEstimate('x'.repeat(6000), usage.subscription.tier),
        per15MinMeditation: tts.calculateCostEstimate('x'.repeat(9000), usage.subscription.tier),
      }
    }, { headers });
  } catch (error) {
    console.error("[API] Usage check error:", error);
    const headers = await corsHeaders();
    return NextResponse.json(
      { 
        error: "Failed to get usage information",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500, headers }
    );
  }
}