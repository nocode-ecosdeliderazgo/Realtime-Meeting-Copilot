'use client';

import { useState, useRef } from 'react';
import { ActionItem } from '@/lib/schemas';

interface MicButtonProps {
  isRecording: boolean;
  onRecordingChange: (recording: boolean) => void;
  onTranscriptUpdate: (text: string, isPartial: boolean) => void;
  onActionItemsUpdate: (items: ActionItem[]) => void;
  onSummaryUpdate: (summary: string) => void;
}

export default function MicButton({
  isRecording,
  onRecordingChange,
  onTranscriptUpdate,
  onActionItemsUpdate,
  onSummaryUpdate,
}: MicButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const checkMicrophonePermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      return false;
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
      // Convertir audio blob a base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64Audio = btoa(Array.from(uint8Array, byte => String.fromCharCode(byte)).join(''));
      
      console.log('🎤 [MicButton] Enviando audio chunk:', {
        size: audioBlob.size,
        type: audioBlob.type,
        sessionId: sessionIdRef.current
      });
      
      setIsTranscribing(true);
      
      const response = await fetch('/api/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'audio_chunk',
          sessionId: sessionIdRef.current,
          audioData: base64Audio,
          mimeType: audioBlob.type,
          timestamp: Date.now()
        })
      });
      
      setIsTranscribing(false);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📡 [MicButton] Respuesta del servidor:', data);
        
        if (data.type === 'transcript_partial') {
          onTranscriptUpdate(data.data.text, true);
        } else if (data.type === 'transcript_final') {
          onTranscriptUpdate(data.data.text, false);
          // Mostrar transcripción completa si está disponible
          if (data.data.fullTranscript) {
            console.log('📝 [MicButton] Transcripción completa:', data.data.fullTranscript);
          }
        }
      } else {
        console.error('Error en respuesta del servidor:', response.status);
        setError('Error procesando audio');
      }
    } catch (error) {
      console.error('Error enviando audio:', error);
      setError('Error procesando audio');
    }
  };

  const stopSession = async () => {
    try {
      console.log('🔚 [MicButton] Finalizando sesión y extrayendo action items...');
      setIsTranscribing(true);
      
      const response = await fetch('/api/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'stop_session',
          sessionId: sessionIdRef.current
        })
      });
      
      setIsTranscribing(false);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🎯 [MicButton] Action items recibidos:', data);
        
        if (data.type === 'action_items') {
          onActionItemsUpdate(data.data);
          
          // Mostrar resumen si está disponible
          if (data.fullTranscript) {
            onSummaryUpdate(`Transcripción completa:\n\n${data.fullTranscript}`);
          }
        }
      } else {
        console.error('Error finalizando sesión:', response.status);
        setError('Error procesando la sesión');
      }
    } catch (error) {
      console.error('Error finalizando sesión:', error);
      setError('Error finalizando sesión');
      setIsTranscribing(false);
    }
  };

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

      // Iniciar sesión
      const sessionId = await startSession();
      sessionIdRef.current = sessionId;

      // Obtener stream de audio
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        }
      });
      streamRef.current = stream;

      // Configurar MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          console.log('🎤 [MicButton] Audio chunk disponible:', event.data.size, 'bytes');
          await sendAudioData(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await stopSession();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Chunks cada segundo

      onRecordingChange(true);
      setIsConnecting(false);

    } catch (error) {
      console.error('Error starting recording:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      setIsConnecting(false);
      onRecordingChange(false);
    }
  };

  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      onRecordingChange(false);
      setError(null);

    } catch (error) {
      console.error('Error stopping recording:', error);
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

  const getButtonText = () => {
    if (isConnecting) return 'Conectando...';
    if (isTranscribing && !isRecording) return 'Procesando...';
    if (isRecording) return isTranscribing ? 'Grabando & Transcribiendo...' : 'Detener Grabación';
    return 'Iniciar Grabación Real';
  };

  const getButtonColor = () => {
    if (isConnecting || isTranscribing) return 'bg-yellow-500 hover:bg-yellow-600';
    if (isRecording) return 'bg-red-500 hover:bg-red-600 animate-pulse';
    return 'bg-green-500 hover:bg-green-600';
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <button
        onClick={handleClick}
        disabled={isConnecting || (isTranscribing && !isRecording)}
        className={`
          w-20 h-20 rounded-full text-white font-bold text-sm
          transition-all duration-200 transform hover:scale-105
          disabled:opacity-50 disabled:cursor-not-allowed
          ${getButtonColor()}
          shadow-lg hover:shadow-xl
        `}
      >
        {isConnecting || (isTranscribing && !isRecording) ? (
          <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto"></div>
        ) : isRecording ? (
          <div className="w-6 h-6 bg-white rounded mx-auto"></div>
        ) : (
          <div className="w-6 h-6 bg-white rounded-full mx-auto relative">
            {/* Icono de micrófono */}
            <div className="absolute inset-1 bg-green-500 rounded-full"></div>
          </div>
        )}
      </button>
      
      <span className="text-sm font-medium text-gray-700">
        {getButtonText()}
      </span>

      {hasPermission === false && (
        <p className="text-sm text-red-600 text-center max-w-xs">
          Se requieren permisos de micrófono para usar esta función
        </p>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-w-xs">
          <p className="text-sm text-red-600 text-center">{error}</p>
        </div>
      )}
    </div>
  );
}