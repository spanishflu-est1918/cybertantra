import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

// Simple in-memory rate limiter (for MVP, upgrade to Redis/KV later)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

export async function validateRequest(req: Request) {
  // Check API key
  const headersList = headers();
  const apiKey = headersList.get('x-api-key');
  
  if (!apiKey || apiKey !== process.env.CYBERTANTRA_API_KEY) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Rate limiting by API key
  const now = Date.now();
  const userLimit = rateLimitMap.get(apiKey) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };

  if (now > userLimit.resetTime) {
    userLimit.count = 0;
    userLimit.resetTime = now + RATE_LIMIT_WINDOW;
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return new NextResponse('Rate limit exceeded', { 
      status: 429,
      headers: {
        'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(userLimit.resetTime).toISOString(),
      }
    });
  }

  userLimit.count++;
  rateLimitMap.set(apiKey, userLimit);

  // Clean up old entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }

  return null; // Request is valid
}

export async function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
  };
}