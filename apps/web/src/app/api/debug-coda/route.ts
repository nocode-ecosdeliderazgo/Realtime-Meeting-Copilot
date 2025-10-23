import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const codaApiToken = process.env.CODA_API_TOKEN;
    const codaDocId = process.env.CODA_DOC_ID;
    const codaTableId = process.env.CODA_TABLE_ID;
    
    console.log('🔧 [Coda Debug] Verificando environment...');
    console.log('🔑 [Coda Debug] CODA_API_TOKEN existe:', !!codaApiToken);
    console.log('🔑 [Coda Debug] CODA_DOC_ID:', codaDocId);
    console.log('🔑 [Coda Debug] CODA_TABLE_ID:', codaTableId);
    
    if (!codaApiToken || !codaDocId || !codaTableId) {
      return NextResponse.json({ 
        error: 'Variables de entorno de Coda no configuradas',
        missing: {
          apiToken: !codaApiToken,
          docId: !codaDocId,
          tableId: !codaTableId
        }
      }, { status: 500 });
    }

    // Test básico - obtener información del documento
    console.log('🧪 [Coda Debug] Probando conexión con Coda...');
    
    const docResponse = await fetch(`https://coda.io/apis/v1/docs/${codaDocId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${codaApiToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 [Coda Debug] Doc Response status:', docResponse.status);
    const docResult = await docResponse.json();
    console.log('📊 [Coda Debug] Doc Response:', docResult);

    if (!docResponse.ok) {
      return NextResponse.json({
        error: 'Error conectando con documento Coda',
        status: docResponse.status,
        result: docResult
      }, { status: docResponse.status });
    }

    // Test obtener columnas de la tabla
    const columnsResponse = await fetch(`https://coda.io/apis/v1/docs/${codaDocId}/tables/${codaTableId}/columns`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${codaApiToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 [Coda Debug] Columns Response status:', columnsResponse.status);
    const columnsResult = await columnsResponse.json();
    console.log('📊 [Coda Debug] Columns Response:', columnsResult);

    const columnNames = columnsResult.items?.map((col: any) => col.name) || [];

    return NextResponse.json({
      success: true,
      doc: {
        id: docResult.id,
        name: docResult.name,
        href: docResult.href
      },
      table: {
        columns: columnNames,
        totalColumns: columnNames.length
      },
      message: 'Conexión con Coda exitosa'
    });

  } catch (error) {
    console.error('❌ [Coda Debug] Error:', error);
    return NextResponse.json({
      error: 'Error interno en debug Coda',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}