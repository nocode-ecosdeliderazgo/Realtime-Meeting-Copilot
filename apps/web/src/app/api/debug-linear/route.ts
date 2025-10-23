import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const linearApiKey = process.env.LINEAR_API_KEY;
    
    console.log('🔧 [Debug] Verificando environment...');
    console.log('🔑 [Debug] LINEAR_API_KEY existe:', !!linearApiKey);
    console.log('🔑 [Debug] LINEAR_API_KEY length:', linearApiKey?.length || 0);
    console.log('🔑 [Debug] LINEAR_API_KEY starts with:', linearApiKey?.substring(0, 10));
    
    if (!linearApiKey) {
      return NextResponse.json({ 
        error: 'LINEAR_API_KEY no configurada',
        env: process.env.NODE_ENV 
      }, { status: 500 });
    }

    // Test con curl directo
    console.log('🧪 [Debug] Probando conexión HTTP básica...');
    
    const query = '{ viewer { id } }';
    
    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${linearApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Realtime-Meeting-Copilot/1.0',
      },
      body: JSON.stringify({ query }),
    });

    console.log('📊 [Debug] Response status:', response.status);
    console.log('📊 [Debug] Response ok:', response.ok);
    console.log('📊 [Debug] Response headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('📊 [Debug] Response text:', text);

    return NextResponse.json({
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      body: text,
      apiKeyConfigured: true,
      apiKeyLength: linearApiKey.length,
    });

  } catch (error) {
    console.error('❌ [Debug] Error:', error);
    return NextResponse.json({
      error: 'Error interno en debug',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}