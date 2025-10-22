import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { 
  CreateSessionRequest, 
  SessionSummary 
} from '@/lib/schemas';

type GetSessionsResponse = {
  sessions: any[];
  total: number;
  page: number;
  limit: number;
};

// Directorio donde se guardarán las sesiones
const SESSIONS_DIR = path.join(process.cwd(), 'data', 'sessions');

// Asegurar que el directorio existe
async function ensureSessionsDir() {
  try {
    await fs.access(SESSIONS_DIR);
  } catch {
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
  }
}

// Generar ID único para sesión
function generateSessionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return `session-${timestamp}-${random}`;
}

// Obtener nombre de archivo para sesión
function getSessionFilePath(sessionId: string): string {
  return path.join(SESSIONS_DIR, `${sessionId}.json`);
}

export async function POST(request: NextRequest) {
  try {
    await ensureSessionsDir();

    // Parsear y validar el cuerpo de la petición
    const body = await request.json();
    const parseResult = CreateSessionRequest.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { 
          error: 'Datos de entrada inválidos',
          details: parseResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { title, summary, actionItems, transcript } = parseResult.data;

    // Generar ID de sesión
    const sessionId = generateSessionId();
    const now = new Date();

    // Crear objeto de sesión
    const session: SessionSummary = {
      id: sessionId,
      title: title || `Reunión ${now.toLocaleDateString('es-ES')}`,
      summary,
      startTime: now,
      endTime: now,
      duration: transcript ? transcript.length * 2 : 0, // Estimación aproximada
      participants: [], // Podríamos extraer esto del transcript en el futuro
      actionItems,
      transcript: transcript || [],
    };

    // Guardar en archivo
    const filePath = getSessionFilePath(sessionId);
    await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');

    console.log(`Session saved: ${sessionId} with ${actionItems.length} action items`);

    return NextResponse.json({
      sessionId,
      message: 'Sesión guardada exitosamente',
      session: {
        id: session.id,
        title: session.title,
        actionItemsCount: session.actionItems.length,
        transcriptSegments: session.transcript?.length || 0,
      }
    });

  } catch (error) {
    console.error('Error saving session:', error);
    
    return NextResponse.json(
      { 
        error: 'Error guardando sesión',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureSessionsDir();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sessionId = searchParams.get('sessionId');

    // Si se solicita una sesión específica
    if (sessionId) {
      try {
        const filePath = getSessionFilePath(sessionId);
        const data = await fs.readFile(filePath, 'utf-8');
        const session: SessionSummary = JSON.parse(data);
        
        return NextResponse.json({ session });
      } catch (error) {
        return NextResponse.json(
          { error: 'Sesión no encontrada' },
          { status: 404 }
        );
      }
    }

    // Listar todas las sesiones
    try {
      const files = await fs.readdir(SESSIONS_DIR);
      const sessionFiles = files.filter(file => file.endsWith('.json'));

      // Leer información básica de cada sesión
      const sessions = await Promise.all(
        sessionFiles.map(async (file) => {
          try {
            const filePath = path.join(SESSIONS_DIR, file);
            const data = await fs.readFile(filePath, 'utf-8');
            const session: SessionSummary = JSON.parse(data);
            
            // Devolver solo información básica para la lista
            return {
              id: session.id,
              title: session.title,
              summary: session.summary.length > 200 
                ? session.summary.substring(0, 200) + '...' 
                : session.summary,
              startTime: session.startTime,
              endTime: session.endTime,
              duration: session.duration,
              participants: session.participants,
              actionItems: session.actionItems.map(item => ({
                title: item.title,
                status: item.status,
                ownerEmail: item.ownerEmail,
                dueDate: item.dueDate,
              })),
              transcriptSegments: session.transcript?.length || 0,
            };
          } catch (error) {
            console.error(`Error reading session file ${file}:`, error);
            return null;
          }
        })
      );

      // Filtrar sesiones que no se pudieron leer y ordenar por fecha
      const validSessions = sessions
        .filter((session): session is NonNullable<typeof session> => session !== null)
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

      // Aplicar paginación
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedSessions = validSessions.slice(startIndex, endIndex);

      const response: GetSessionsResponse = {
        sessions: paginatedSessions,
        total: validSessions.length,
        page,
        limit,
      };

      return NextResponse.json(response);

    } catch (error) {
      // Si el directorio no existe o está vacío
      const response: GetSessionsResponse = {
        sessions: [],
        total: 0,
        page,
        limit,
      };

      return NextResponse.json(response);
    }

  } catch (error) {
    console.error('Error fetching sessions:', error);
    
    return NextResponse.json(
      { 
        error: 'Error obteniendo sesiones',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId es requerido' },
        { status: 400 }
      );
    }

    const filePath = getSessionFilePath(sessionId);
    
    try {
      await fs.unlink(filePath);
      console.log(`Session deleted: ${sessionId}`);
      
      return NextResponse.json({
        message: 'Sesión eliminada exitosamente',
        sessionId,
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Error deleting session:', error);
    
    return NextResponse.json(
      { 
        error: 'Error eliminando sesión',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// Endpoint para obtener estadísticas de sesiones
export async function PATCH(request: NextRequest) {
  try {
    await ensureSessionsDir();

    const files = await fs.readdir(SESSIONS_DIR);
    const sessionFiles = files.filter(file => file.endsWith('.json'));

    let totalSessions = 0;
    let totalActionItems = 0;
    let totalTranscriptSegments = 0;
    const recentSessions = [];

    for (const file of sessionFiles.slice(0, 5)) { // Solo las 5 más recientes para estadísticas
      try {
        const filePath = path.join(SESSIONS_DIR, file);
        const data = await fs.readFile(filePath, 'utf-8');
        const session: SessionSummary = JSON.parse(data);
        
        totalSessions++;
        totalActionItems += session.actionItems.length;
        totalTranscriptSegments += session.transcript?.length || 0;
        
        recentSessions.push({
          id: session.id,
          title: session.title,
          startTime: session.startTime,
          actionItemsCount: session.actionItems.length,
        });
      } catch (error) {
        console.error(`Error reading session file ${file} for stats:`, error);
      }
    }

    recentSessions.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    return NextResponse.json({
      stats: {
        totalSessions: sessionFiles.length,
        totalActionItems,
        totalTranscriptSegments,
        averageActionItemsPerSession: totalSessions > 0 ? totalActionItems / totalSessions : 0,
      },
      recentSessions,
    });

  } catch (error) {
    console.error('Error getting session stats:', error);
    
    return NextResponse.json(
      { 
        error: 'Error obteniendo estadísticas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}