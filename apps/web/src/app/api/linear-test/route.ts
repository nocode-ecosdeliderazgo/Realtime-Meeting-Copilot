import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const linearApiKey = process.env.LINEAR_API_KEY;
    
    if (!linearApiKey) {
      return NextResponse.json({ error: 'LINEAR_API_KEY no configurada' }, { status: 500 });
    }

    console.log('🔍 [Linear Test] Probando conexión con Linear...');

    // Query más simple posible para verificar conexión
    const query = `
      query TestQuery {
        viewer {
          id
          name
          email
        }
      }
    `;

    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${linearApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();

    console.log('📦 [Linear Test] Respuesta completa:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      result
    });

    if (!response.ok) {
      return NextResponse.json({
        error: 'Error de conexión con Linear',
        status: response.status,
        statusText: response.statusText,
        result
      }, { status: response.status });
    }

    if (result.errors) {
      return NextResponse.json({
        error: 'Error GraphQL',
        errors: result.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      viewer: result.data.viewer,
      message: 'Conexión con Linear exitosa'
    });

  } catch (error) {
    console.error('❌ [Linear Test] Error:', error);
    return NextResponse.json({
      error: 'Error interno',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}