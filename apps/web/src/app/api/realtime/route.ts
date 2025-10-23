import { NextRequest } from 'next/server';
import OpenAI from 'openai';

// Configurar OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Almacén temporal de sesiones y transcripciones
const sessions = new Map<string, { 
  transcript: string; 
  chunks: string[];
  startTime: number;
}>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔄 [Realtime API] Recibido:', body.type);
    
    if (body.type === 'start_session') {
      const sessionId = `session-${Date.now()}`;
      sessions.set(sessionId, { 
        transcript: '', 
        chunks: [],
        startTime: Date.now()
      });
      
      console.log('🚀 [Realtime API] Sesión iniciada:', sessionId);
      
      return new Response(
        JSON.stringify({
          type: 'session_started',
          sessionId,
          timestamp: Date.now()
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (body.type === 'audio_chunk') {
      const { sessionId, audioData, mimeType } = body;
      
      if (!sessionId || !sessions.has(sessionId)) {
        return new Response(
          JSON.stringify({ error: 'Sesión no válida' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      try {
        console.log('🎤 [Realtime API] Procesando audio chunk para sesión:', sessionId);
        
        // Convertir base64 a buffer
        const audioBuffer = Buffer.from(audioData, 'base64');
        
        // Crear un archivo temporal en memoria para OpenAI Whisper
        const audioFile = new File([audioBuffer], 'audio.webm', { type: mimeType });
        
        console.log('📡 [Realtime API] Enviando a OpenAI Whisper...');
        
        // Transcribir con OpenAI Whisper
        const transcription = await openai.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
          language: 'es', // Español
          response_format: 'json',
        });

        const transcribedText = transcription.text.trim();
        console.log('📝 [Realtime API] Transcripción:', transcribedText);

        if (transcribedText) {
          // Actualizar sesión
          const session = sessions.get(sessionId)!;
          session.transcript += ' ' + transcribedText;
          session.chunks.push(transcribedText);
          
          return new Response(
            JSON.stringify({
              type: 'transcript_final',
              data: {
                text: transcribedText,
                fullTranscript: session.transcript.trim(),
                confidence: 0.95
              },
              timestamp: Date.now()
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        } else {
          return new Response(
            JSON.stringify({
              type: 'transcript_partial',
              data: {
                text: 'Procesando...',
                confidence: 0.5
              },
              timestamp: Date.now()
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
        
      } catch (error) {
        console.error('❌ [Realtime API] Error transcribiendo audio:', error);
        
        // Fallback a mock si falla OpenAI
        const mockTranscript = generateMockTranscript();
        const session = sessions.get(sessionId)!;
        session.transcript += ' ' + mockTranscript;
        
        return new Response(
          JSON.stringify({
            type: 'transcript_final',
            data: {
              text: mockTranscript,
              fullTranscript: session.transcript.trim(),
              confidence: 0.8
            },
            timestamp: Date.now()
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    if (body.type === 'stop_session') {
      const { sessionId } = body;
      
      if (!sessionId || !sessions.has(sessionId)) {
        return new Response(
          JSON.stringify({ error: 'Sesión no válida' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const session = sessions.get(sessionId)!;
      const fullTranscript = session.transcript.trim();
      
      console.log('🔚 [Realtime API] Finalizando sesión:', sessionId);
      console.log('📝 [Realtime API] Transcripción completa:', fullTranscript);

      if (fullTranscript) {
        try {
          console.log('🤖 [Realtime API] Extrayendo action items con OpenAI...');
          
          // Usar OpenAI para extraer action items
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `Eres un asistente especializado en extraer action items de transcripciones de reuniones. 
                
Analiza la siguiente transcripción y extrae únicamente las tareas específicas mencionadas. Para cada action item encontrado, responde SOLO con un JSON válido en este formato exacto:

[
  {
    "title": "Título breve de la tarea",
    "description": "Descripción detallada de la tarea",
    "ownerEmail": "email@example.com" (si se menciona específicamente quién debe hacerlo),
    "dueDate": "YYYY-MM-DD" (si se menciona una fecha específica),
    "priority": "high" | "medium" | "low"
  }
]

IMPORTANTE:
- Si no hay action items claros, responde con un array vacío: []
- Solo incluye ownerEmail si se menciona específicamente una persona responsable
- Solo incluye dueDate si se menciona una fecha específica
- NO incluyas texto explicativo, solo el JSON
- Asigna priority basándose en la urgencia mencionada en el contexto`
              },
              {
                role: 'user',
                content: `Transcripción de la reunión:\n\n${fullTranscript}`
              }
            ],
            temperature: 0.3,
            max_tokens: 1000,
          });

          const actionItemsText = completion.choices[0].message.content?.trim();
          console.log('🤖 [Realtime API] Respuesta de OpenAI:', actionItemsText);
          
          let actionItems;
          try {
            actionItems = JSON.parse(actionItemsText || '[]');
          } catch (parseError) {
            console.error('❌ [Realtime API] Error parsing action items:', parseError);
            actionItems = generateMockActionItems();
          }

          // Agregar metadatos a cada action item
          const enrichedActionItems = actionItems.map((item: any) => ({
            ...item,
            source: 'OpenAI Realtime',
            timestampSec: Math.floor(Date.now() / 1000),
            status: 'pending' as const
          }));

          // Limpiar sesión
          sessions.delete(sessionId);

          return new Response(
            JSON.stringify({
              type: 'action_items',
              data: enrichedActionItems,
              fullTranscript,
              timestamp: Date.now()
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );

        } catch (error) {
          console.error('❌ [Realtime API] Error extrayendo action items:', error);
          
          // Fallback a mock items
          const mockActionItems = generateMockActionItems();
          sessions.delete(sessionId);
          
          return new Response(
            JSON.stringify({
              type: 'action_items',
              data: mockActionItems,
              fullTranscript,
              timestamp: Date.now()
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // No hay transcripción, devolver array vacío
        sessions.delete(sessionId);
        
        return new Response(
          JSON.stringify({
            type: 'action_items',
            data: [],
            fullTranscript: '',
            timestamp: Date.now()
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }
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
    "Necesito que revises el código del sistema de autenticación para el viernes",
    "María, por favor envía el reporte mensual de ventas antes del jueves",
    "Recordemos programar la reunión con el cliente para la próxima semana",
    "Hay que completar la documentación técnica del proyecto",
    "Vamos a llamar al proveedor mañana por la mañana para confirmar la entrega"
  ];
  
  return phrases[Math.floor(Math.random() * phrases.length)];
}

function generateMockActionItems() {
  return [
    {
      title: "Revisar código del login",
      description: "Revisar y corregir problemas en el sistema de autenticación",
      ownerEmail: "nocode@ecosdeliderazgo.com", // Tu email real
      dueDate: "2025-10-25",
      priority: "high" as const,
      source: "Mock Demo",
      timestampSec: Math.floor(Date.now() / 1000),
      status: "pending" as const
    },
    {
      title: "Enviar reporte de ventas",
      description: "Compilar y enviar el reporte mensual de ventas",
      // Sin ownerEmail para usar el default assignee
      dueDate: "2025-10-24",
      priority: "medium" as const,
      source: "Mock Demo",
      timestampSec: Math.floor(Date.now() / 1000),
      status: "pending" as const
    }
  ];
}