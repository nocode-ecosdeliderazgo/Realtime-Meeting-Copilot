import { NextRequest, NextResponse } from 'next/server';
import { LinearClient } from '@/lib/linear';
import { 
  CreateLinearTaskRequest, 
  validateActionItems 
} from '@/lib/schemas';

type CreateLinearTaskResponse = {
  results: Array<{
    title: string;
    identifier: string;
    url: string;
    id: string;
    success: boolean;
    error?: string;
  }>;
};

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [Linear API] Iniciando creación de tareas...');
    
    // Validar variables de entorno
    const linearApiKey = process.env.LINEAR_API_KEY;
    const defaultTeamId = process.env.LINEAR_TEAM_ID;
    const defaultAssigneeId = process.env.LINEAR_DEFAULT_ASSIGNEE_ID;

    console.log('🔑 [Linear API] Variables de entorno:', {
      hasApiKey: !!linearApiKey,
      hasTeamId: !!defaultTeamId,
      hasAssigneeId: !!defaultAssigneeId
    });

    if (!linearApiKey) {
      console.error('❌ [Linear API] LINEAR_API_KEY no está configurada');
      return NextResponse.json(
        { error: 'LINEAR_API_KEY no está configurada' },
        { status: 500 }
      );
    }

    if (!defaultTeamId) {
      console.error('❌ [Linear API] LINEAR_TEAM_ID no está configurada');
      return NextResponse.json(
        { error: 'LINEAR_TEAM_ID no está configurada' },
        { status: 500 }
      );
    }

    // Parsear y validar el cuerpo de la petición
    const body = await request.json();
    console.log('📝 [Linear API] Datos recibidos:', JSON.stringify(body, null, 2));
    
    const parseResult = CreateLinearTaskRequest.safeParse(body);

    if (!parseResult.success) {
      console.error('❌ [Linear API] Validación fallida:', parseResult.error.errors);
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

    // Crear cliente Linear
    const linearClient = new LinearClient(linearApiKey);

    // Procesar cada item
    const results = [];
    
    for (const item of items) {
      try {
        console.log(`📝 [Linear API] Procesando item: "${item.title}"`);
        
        // Resolver assignee si se proporcionó email
        const assigneeId = item.ownerEmail 
          ? await linearClient.resolveAssigneeId(item.ownerEmail, defaultTeamId)
          : defaultAssigneeId;

        console.log(`👤 [Linear API] Assignee resuelto: ${assigneeId || 'default'}`);

        // Preparar descripción
        let description = item.description || '';
        if (sessionId) {
          description += `\n\n---\nCreado desde sesión: ${sessionId}`;
        }
        if (item.source) {
          description += `\nFuente: ${item.source}`;
        }
        if (item.timestampSec) {
          const minutes = Math.floor(item.timestampSec / 60);
          const seconds = item.timestampSec % 60;
          description += `\nTiempo: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // Crear issue en Linear
        const issue = await linearClient.createIssue({
          teamId: defaultTeamId,
          title: item.title,
          description: description.trim(),
          assigneeId,
          priority: linearClient.mapPriorityToNumber(item.priority),
        });

        results.push({
          title: item.title,
          identifier: issue.identifier,
          url: issue.url,
          id: issue.id,
          success: true,
        });

        console.log(`Created Linear issue: ${issue.identifier} - ${item.title}`);

      } catch (error) {
        console.error(`Error creating Linear issue for "${item.title}":`, error);
        
        results.push({
          title: item.title,
          identifier: '',
          url: '',
          id: '',
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    // Preparar respuesta
    const response: CreateLinearTaskResponse = {
      results,
    };

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    console.log(`Linear integration: ${successCount}/${totalCount} issues created successfully`);

    return NextResponse.json(response, { 
      status: successCount > 0 ? 200 : 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('❌ [Linear API] Error en endpoint:', error);
    console.error('❌ [Linear API] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
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
    const linearApiKey = process.env.LINEAR_API_KEY;

    if (!linearApiKey) {
      return NextResponse.json(
        { error: 'LINEAR_API_KEY no está configurada' },
        { status: 500 }
      );
    }

    const linearClient = new LinearClient(linearApiKey);
    
    // Obtener información de configuración
    const teams = await linearClient.getTeams();
    const defaultTeamId = process.env.LINEAR_TEAM_ID;
    
    const config = {
      defaultTeamId,
      availableTeams: teams,
      status: 'connected'
    };

    return NextResponse.json(config);

  } catch (error) {
    console.error('Error getting Linear configuration:', error);
    
    return NextResponse.json(
      { 
        error: 'Error obteniendo configuración de Linear',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// Endpoint para obtener usuarios de un equipo (útil para configuración)
export async function PATCH(request: NextRequest) {
  try {
    const linearApiKey = process.env.LINEAR_API_KEY;
    
    if (!linearApiKey) {
      return NextResponse.json(
        { error: 'LINEAR_API_KEY no está configurada' },
        { status: 500 }
      );
    }

    const { teamId } = await request.json();
    const linearClient = new LinearClient(linearApiKey);
    
    const users = await linearClient.getUsers(teamId);
    
    return NextResponse.json({ users });

  } catch (error) {
    console.error('Error getting Linear users:', error);
    
    return NextResponse.json(
      { 
        error: 'Error obteniendo usuarios de Linear',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}