'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import { TranscriptSegment, ActionItem, validateWSMessage, WS_MESSAGE_TYPES } from '@/lib/schemas';

interface MicButtonProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onTranscriptUpdate: (segment: TranscriptSegment) => void;
  onActionItemsUpdate: (items: ActionItem[]) => void;
  onSummaryUpdate: (summary: string) => void;
}

export default function MicButton({
  isRecording,
  onStartRecording,
  onStopRecording,
  onTranscriptUpdate,
  onActionItemsUpdate,
  onSummaryUpdate,
}: MicButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sessionIdRef = useRef<string | null>(null);

  const checkMicrophonePermission = async (): Promise<boolean> => {
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return permission.state === 'granted';
    } catch (error) {
      // Fallback: intentar obtener acceso directo
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch {
        return false;
      }
    }
  };

  const startSession = async (): Promise<string> => {
    try {
      const response = await fetch('/api/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'start_session' })
      });
      
      if (!response.ok) {
        throw new Error('Error iniciando sesión');
      }
      
      const data = await response.json();
      return data.sessionId;
    } catch (error) {
      throw new Error('Error de conexión con el servidor');
    }
  };

  const sendAudioData = async (audioBlob: Blob) => {
    try {
      const response = await fetch('/api/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'audio_chunk',
          sessionId: sessionIdRef.current,
          timestamp: Date.now()
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.type === 'transcript_final') {
          onTranscriptUpdate(data.data.text, false, data.data.confidence);
        }
      }
    } catch (error) {
      console.error('Error enviando audio:', error);
    }
  };

  const stopSession = async () => {
    try {
      const response = await fetch('/api/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'stop_session',
          sessionId: sessionIdRef.current
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.type === 'action_items') {
          onActionItemsUpdate(data.data);
        }
      }
    } catch (error) {
      console.error('Error finalizando sesión:', error);
    }
  };
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/realtime`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket conectado');
        resolve(ws);
      };

      ws.onmessage = (event) => {
        try {
          const message = validateWSMessage(JSON.parse(event.data));
          
          switch (message.type) {
            case WS_MESSAGE_TYPES.TRANSCRIPT_PARTIAL:
              onTranscriptUpdate({
                text: message.data.text,
                timestamp: message.timestamp || Date.now(),
                isPartial: true,
                confidence: message.data.confidence,
              });
              break;
              
            case WS_MESSAGE_TYPES.TRANSCRIPT_FINAL:
              onTranscriptUpdate({
                text: message.data.text,
                timestamp: message.timestamp || Date.now(),
                isPartial: false,
                confidence: message.data.confidence,
              });
              break;
              
            case WS_MESSAGE_TYPES.ACTION_ITEMS:
              if (Array.isArray(message.data)) {
                onActionItemsUpdate(message.data);
              }
              break;
              
            case WS_MESSAGE_TYPES.SUMMARY:
              onSummaryUpdate(message.data.summary || message.data);
              break;
              
            case WS_MESSAGE_TYPES.ERROR:
              console.error('Error del WebSocket:', message.data);
              setError(message.data.message || 'Error en la conexión');
              break;
              
            default:
              console.log('Mensaje no manejado:', message.type);
          }
        } catch (error) {
          console.error('Error procesando mensaje del WebSocket:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Error del WebSocket:', error);
        reject(new Error('Error de conexión WebSocket'));
      };

      ws.onclose = () => {
        console.log('WebSocket desconectado');
        wsRef.current = null;
      };
    });
  }, [onTranscriptUpdate, onActionItemsUpdate, onSummaryUpdate]);

  const startRecording = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      // Verificar permisos
      const hasPermission = await checkMicrophonePermission();
      if (!hasPermission) {
        throw new Error('Se requieren permisos de micrófono');
      }
      setHasPermission(true);

      // Configurar WebSocket
      const ws = await setupWebSocket();
      wsRef.current = ws;

      // Obtener stream de audio
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Óptimo para OpenAI
        }
      });
      streamRef.current = stream;

      // Configurar MediaRecorder
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus'
      ];
      
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error('No se encontró un formato de audio compatible');
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 16000, // 16kbps para buena calidad/tamaño
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          // Enviar chunk como ArrayBuffer
          const reader = new FileReader();
          reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) {
              ws.send(reader.result);
            }
          };
          reader.readAsArrayBuffer(event.data);
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (error) => {
        console.error('Error del MediaRecorder:', error);
        setError('Error grabando audio');
        stopRecording();
      };

      // Enviar mensaje de inicio de sesión
      ws.send(JSON.stringify({
        type: WS_MESSAGE_TYPES.SESSION_START,
        data: { timestamp: Date.now() }
      }));

      // Iniciar grabación con chunks cada 100ms para baja latencia
      mediaRecorder.start(100);
      onStartRecording();
      
    } catch (error) {
      console.error('Error iniciando grabación:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      setHasPermission(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const stopRecording = () => {
    try {
      // Detener grabación
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      // Cerrar stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Enviar mensaje de fin de sesión y cerrar WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: WS_MESSAGE_TYPES.SESSION_END,
          data: { timestamp: Date.now() }
        }));
        wsRef.current.close();
      }

      onStopRecording();
      
    } catch (error) {
      console.error('Error deteniendo grabación:', error);
      setError('Error deteniendo grabación');
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Limpiar al desmontar el componente
  const cleanup = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  // useEffect para cleanup
  useEffect(() => {
    return cleanup;
  }, []);

  return (
    <div className="flex flex-col items-center space-y-2">
      <button
        onClick={handleClick}
        disabled={isConnecting}
        className={`
          relative p-4 rounded-full transition-all duration-200 shadow-lg
          ${isRecording 
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
          }
          ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title={isRecording ? 'Detener grabación' : 'Iniciar grabación'}
      >
        {isConnecting ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : isRecording ? (
          <Square className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
        
        {isRecording && (
          <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
        )}
      </button>

      <div className="text-center">
        <p className="text-sm font-medium text-gray-900">
          {isConnecting ? 'Conectando...' : 
           isRecording ? 'Grabando' : 'Listo para grabar'}
        </p>
        
        {hasPermission === false && (
          <p className="text-xs text-red-600 mt-1">
            Se requieren permisos de micrófono
          </p>
        )}
        
        {error && (
          <p className="text-xs text-red-600 mt-1 max-w-48 truncate" title={error}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}