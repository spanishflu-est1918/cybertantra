import { getAIConfig } from '@cybertantra/ai';
import { sql } from '@cybertantra/database';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export async function OPTIONS() {
  return new Response(null, { headers });
}

export async function GET() {
  const health = {
    status: 'checking',
    timestamp: new Date().toISOString(),
    services: {
      api: 'ok',
      database: 'unknown',
      embeddings: 'unknown',
      openrouter: 'unknown',
    },
    errors: [] as string[],
  };

  try {
    // Check database connection
    try {
      const result = await sql`SELECT 1 as test`;
      if (result.rows[0]?.test === 1) {
        health.services.database = 'ok';
      }
    } catch (dbError) {
      health.services.database = 'error';
      health.errors.push(`Database: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

    // Check API keys
    const config = getAIConfig();
    if (config.openRouterApiKey) {
      health.services.openrouter = 'configured';
    } else {
      health.services.openrouter = 'missing';
      health.errors.push('OpenRouter API key not configured');
    }

    if (config.googleGenerativeAIApiKey) {
      health.services.embeddings = 'configured';
    } else {
      health.services.embeddings = 'missing';
      health.errors.push('Google AI API key not configured');
    }

    // Overall status
    health.status = health.errors.length === 0 ? 'healthy' : 'degraded';

    return new Response(JSON.stringify(health, null, 2), {
      status: health.status === 'healthy' ? 200 : 503,
      headers,
    });
  } catch (error) {
    health.status = 'error';
    health.errors.push(error instanceof Error ? error.message : 'Unknown error');
    
    return new Response(JSON.stringify(health, null, 2), {
      status: 500,
      headers,
    });
  }
}