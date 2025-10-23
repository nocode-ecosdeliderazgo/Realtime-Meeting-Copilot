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

  const sendAudioData = async () => {
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
          onTranscriptUpdate(data.data.text, false);
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
          await sendAudioData();
          // Simular transcripción en tiempo real
          onTranscriptUpdate("Procesando audio...", true);
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
    if (isRecording) return 'Detener Grabación';
    return 'Iniciar Grabación';
  };

  const getButtonColor = () => {
    if (isConnecting) return 'bg-yellow-500 hover:bg-yellow-600';
    if (isRecording) return 'bg-red-500 hover:bg-red-600 animate-pulse';
    return 'bg-blue-500 hover:bg-blue-600';
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <button
        onClick={handleClick}
        disabled={isConnecting}
        className={`
          w-20 h-20 rounded-full text-white font-bold text-sm
          transition-all duration-200 transform hover:scale-105
          disabled:opacity-50 disabled:cursor-not-allowed
          ${getButtonColor()}
          shadow-lg hover:shadow-xl
        `}
      >
        {isConnecting ? (
          <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto"></div>
        ) : isRecording ? (
          <div className="w-6 h-6 bg-white rounded mx-auto"></div>
        ) : (
          <div className="w-6 h-6 bg-white rounded-full mx-auto"></div>
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