import { NextRequest, NextResponse } from 'next/server';
import { CodaClient } from '@/lib/coda';
import { 
  CreateCodaTaskRequest, 
  validateActionItems 
} from '@/lib/schemas';

type CreateCodaTaskResponse = {
  results: Array<{
    title: string;
    rowId: string;
    url: string;
    success: boolean;
    error?: string;
  }>;
};

export async function POST(request: NextRequest) {
  try {
    // Validar variables de entorno
    const codaApiToken = process.env.CODA_API_TOKEN;
    const codaDocId = process.env.CODA_DOC_ID;
    const codaTableId = process.env.CODA_TABLE_ID;

    if (!codaApiToken) {
      return NextResponse.json(
        { error: 'CODA_API_TOKEN no está configurada' },
        { status: 500 }
      );
    }

    if (!codaDocId) {
      return NextResponse.json(
        { error: 'CODA_DOC_ID no está configurada' },
        { status: 500 }
      );
    }

    if (!codaTableId) {
      return NextResponse.json(
        { error: 'CODA_TABLE_ID no está configurada' },
        { status: 500 }
      );
    }

    // Parsear y validar el cuerpo de la petición
    const body = await request.json();
    const parseResult = CreateCodaTaskRequest.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { 
          error: 'Datos de entrada inválidos',
          details: parseResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { items, sessionId } = parseResult.data;

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron items para crear' },
        { status: 400 }
      );
    }

    // Crear cliente Coda
    const codaClient = new CodaClient(codaApiToken);

    // Validar estructura de la tabla
    try {
      const validation = await codaClient.validateTableStructure(codaDocId, codaTableId);
      if (!validation.isValid) {
        console.warn('Table structure validation failed:', validation);
        // Continuar de todos modos, pero log la advertencia
      }
    } catch (error) {
      console.warn('Could not validate table structure:', error);
      // Continuar de todos modos
    }

    // Procesar cada item
    const results = [];
    
    for (const item of items) {
      try {
        const row = await codaClient.createActionItemRow(
          codaDocId,
          codaTableId,
          {
            title: item.title,
            description: item.description,
            ownerEmail: item.ownerEmail,
            dueDate: item.dueDate,
            priority: codaClient.mapPriorityText(item.priority),
            source: item.source,
            timestampSec: item.timestampSec,
          },
          sessionId
        );

        // Construir URL de la fila
        const rowUrl = `https://coda.io/d/${codaDocId}#${codaTableId}/r${row.id}`;

        results.push({
          title: item.title,
          rowId: row.id,
          url: rowUrl,
          success: true,
        });

        console.log(`Created Coda row: ${row.id} - ${item.title}`);

      } catch (error) {
        console.error(`Error creating Coda row for "${item.title}":`, error);
        
        results.push({
          title: item.title,
          rowId: '',
          url: '',
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    // Preparar respuesta
    const response: CreateCodaTaskResponse = {
      results,
    };

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    console.log(`Coda integration: ${successCount}/${totalCount} rows created successfully`);

    return NextResponse.json(response, { 
      status: successCount > 0 ? 200 : 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('Error in Coda API endpoint:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const codaApiToken = process.env.CODA_API_TOKEN;
    const codaDocId = process.env.CODA_DOC_ID;
    const codaTableId = process.env.CODA_TABLE_ID;

    if (!codaApiToken) {
      return NextResponse.json(
        { error: 'CODA_API_TOKEN no está configurada' },
        { status: 500 }
      );
    }

    if (!codaDocId || !codaTableId) {
      return NextResponse.json(
        { error: 'CODA_DOC_ID o CODA_TABLE_ID no están configuradas' },
        { status: 500 }
      );
    }

    const codaClient = new CodaClient(codaApiToken);
    
    // Obtener información de configuración
    const doc = await codaClient.getDoc(codaDocId);
    const table = await codaClient.getTable(codaDocId, codaTableId);
    const validation = await codaClient.validateTableStructure(codaDocId, codaTableId);
    
    const config = {
      docId: codaDocId,
      tableId: codaTableId,
      docName: doc.name,
      tableName: table.name,
      rowCount: table.rowCount,
      validation,
      status: 'connected'
    };

    return NextResponse.json(config);

  } catch (error) {
    console.error('Error getting Coda configuration:', error);
    
    return NextResponse.json(
      { 
        error: 'Error obteniendo configuración de Coda',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// Endpoint para validar y obtener información de una tabla específica
export async function PATCH(request: NextRequest) {
  try {
    const codaApiToken = process.env.CODA_API_TOKEN;
    
    if (!codaApiToken) {
      return NextResponse.json(
        { error: 'CODA_API_TOKEN no está configurada' },
        { status: 500 }
      );
    }

    const { docId, tableId } = await request.json();
    
    if (!docId || !tableId) {
      return NextResponse.json(
        { error: 'docId y tableId son requeridos' },
        { status: 400 }
      );
    }

    const codaClient = new CodaClient(codaApiToken);
    
    const doc = await codaClient.getDoc(docId);
    const table = await codaClient.getTable(docId, tableId);
    const columns = await codaClient.getColumns(docId, tableId);
    const validation = await codaClient.validateTableStructure(docId, tableId);
    
    return NextResponse.json({
      doc: {
        id: doc.id,
        name: doc.name,
      },
      table: {
        id: table.id,
        name: table.name,
        rowCount: table.rowCount,
      },
      columns: columns.map(col => ({
        id: col.id,
        name: col.name,
        type: col.format?.type || 'text',
      })),
      validation,
    });

  } catch (error) {
    console.error('Error validating Coda table:', error);
    
    return NextResponse.json(
      { 
        error: 'Error validando tabla de Coda',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}