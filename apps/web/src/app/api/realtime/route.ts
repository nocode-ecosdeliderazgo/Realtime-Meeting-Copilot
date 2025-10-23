import { NextRequest } from 'next/server';

// Simular un endpoint de transcripción para desarrollo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.type === 'start_session') {
      return new Response(
        JSON.stringify({
          type: 'session_started',
          sessionId: `session-${Date.now()}`,
          timestamp: Date.now()
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (body.type === 'audio_chunk') {
      // Simular transcripción y detección de action items
      const mockTranscript = generateMockTranscript();
      
      return new Response(
        JSON.stringify({
          type: 'transcript_final',
          data: {
            text: mockTranscript,
            confidence: 0.95
          },
          timestamp: Date.now()
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (body.type === 'stop_session') {
      // Simular action items detectados
      const mockActionItems = generateMockActionItems();
      
      return new Response(
        JSON.stringify({
          type: 'action_items',
          data: mockActionItems,
          timestamp: Date.now()
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Tipo de mensaje no soportado' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error en /api/realtime:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function generateMockTranscript(): string {
  const phrases = [
    "Juan, puedes revisar el código del login para el viernes",
    "María necesita enviar el reporte de ventas antes del jueves",
    "Recordemos agendar la reunión con el cliente para la próxima semana",
    "Hay que completar la documentación del proyecto",
    "Necesitamos llamar al proveedor mañana por la mañana"
  ];
  
  return phrases[Math.floor(Math.random() * phrases.length)];
}

function generateMockActionItems() {
  return [
    {
      title: "Revisar código del login",
      description: "Revisar y corregir problemas en el sistema de autenticación",
      ownerEmail: "juan@ecosdeliderazgo.com",
      dueDate: "2025-10-25",
      priority: "high",
      source: "Mock Demo",
      timestampSec: Math.floor(Date.now() / 1000)
    },
    {
      title: "Enviar reporte de ventas",
      description: "Compilar y enviar el reporte mensual de ventas",
      ownerEmail: "maria@ecosdeliderazgo.com", 
      dueDate: "2025-10-24",
      priority: "medium",
      source: "Mock Demo",
      timestampSec: Math.floor(Date.now() / 1000)
    }
  ];
}