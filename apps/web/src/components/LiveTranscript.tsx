'use client';

import React from 'react';
import { TranscriptSegment } from '@/lib/schemas';

interface LiveTranscriptProps {
  transcript: TranscriptSegment[];
  isRecording: boolean;
}

export default function LiveTranscript({ transcript, isRecording }: LiveTranscriptProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll al final cuando hay nuevos mensajes
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (transcript.length === 0 && !isRecording) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-4">🎤</div>
          <p className="text-lg font-medium">Listo para transcribir</p>
          <p className="text-sm">Haz clic en el botón de micrófono para comenzar</p>
        </div>
      </div>
    );
  }

  if (transcript.length === 0 && isRecording) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🎤</div>
          <p className="text-lg font-medium">Escuchando...</p>
          <p className="text-sm">Comienza a hablar para ver la transcripción</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {transcript.map((segment, index) => (
          <div
            key={index}
            className={`group transition-all duration-200 ${
              segment.isPartial 
                ? 'opacity-75 bg-blue-50 border-l-2 border-blue-300' 
                : 'opacity-100'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <span className="text-xs text-gray-500 font-mono">
                  {formatTimestamp(segment.timestamp)}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-relaxed ${
                  segment.isPartial 
                    ? 'text-gray-700 italic pl-3' 
                    : 'text-gray-900'
                }`}>
                  {segment.text}
                </p>
                
                {segment.confidence !== undefined && (
                  <div className="mt-1 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-gray-400">
                      Confianza: {Math.round(segment.confidence * 100)}%
                    </span>
                    <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full transition-all duration-300"
                        style={{ width: `${segment.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex-shrink-0">
                {segment.isPartial ? (
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                ) : (
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isRecording && (
          <div className="flex items-center space-x-2 text-gray-400 text-sm">
            <div className="w-1 h-1 bg-red-400 rounded-full animate-ping" />
            <div className="w-1 h-1 bg-red-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
            <div className="w-1 h-1 bg-red-400 rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
            <span className="ml-2">Grabando...</span>
          </div>
        )}
      </div>
      
      {/* Footer con estadísticas */}
      <div className="border-t bg-gray-50 px-4 py-2">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>
            {transcript.length} {transcript.length === 1 ? 'segmento' : 'segmentos'}
          </span>
          <span>
            {transcript.filter(s => !s.isPartial).length} finalizados
          </span>
          {isRecording && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>En vivo</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}