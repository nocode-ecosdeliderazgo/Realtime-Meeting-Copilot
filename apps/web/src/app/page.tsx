'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Componentes dinámicos para evitar problemas con SSR
const MicButton = dynamic(() => import('@/components/MicButton'), { ssr: false });
const LiveTranscript = dynamic(() => import('@/components/LiveTranscript'), { ssr: false });
const ActionItemsPanel = dynamic(() => import('@/components/ActionItemsPanel'), { ssr: false });
const SessionSummary = dynamic(() => import('@/components/SessionSummary'), { ssr: false });

import { ActionItem, TranscriptSegment } from '@/lib/schemas';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Generar ID de sesión al cargar la página
    setSessionId(`session-${Date.now()}`);
  }, []);

  const handleStartRecording = () => {
    setIsRecording(true);
    // Limpiar estado anterior
    setTranscript([]);
    setActionItems([]);
    setSummary('');
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const handleTranscriptUpdate = (newSegment: TranscriptSegment) => {
    setTranscript(prev => {
      // Si es parcial, reemplazar el último segmento parcial o agregarlo
      if (newSegment.isPartial) {
        const lastIndex = prev.length - 1;
        if (lastIndex >= 0 && prev[lastIndex].isPartial) {
          return [...prev.slice(0, lastIndex), newSegment];
        }
        return [...prev, newSegment];
      }
      
      // Si es final, reemplazar el último parcial si existe o agregarlo
      const lastIndex = prev.length - 1;
      if (lastIndex >= 0 && prev[lastIndex].isPartial) {
        return [...prev.slice(0, lastIndex), newSegment];
      }
      return [...prev, newSegment];
    });
  };

  const handleActionItemsUpdate = (newItems: ActionItem[]) => {
    setActionItems(prev => {
      // Evitar duplicados basándose en el título
      const existingTitles = new Set(prev.map(item => item.title));
      const uniqueNewItems = newItems.filter(item => !existingTitles.has(item.title));
      return [...prev, ...uniqueNewItems];
    });
  };

  const handleSummaryUpdate = (newSummary: string) => {
    setSummary(newSummary);
  };

  const handleCreateLinearTasks = async (items: ActionItem[]) => {
    try {
      const response = await fetch('/api/tasks/linear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, sessionId }),
      });

      if (!response.ok) {
        throw new Error('Error creating Linear tasks');
      }

      const result = await response.json();
      console.log('Linear tasks created:', result);
      
      // Actualizar el estado de los items creados
      setActionItems(prev =>
        prev.map(item => {
          const created = result.results.find((r: any) => r.title === item.title);
          return created && created.success 
            ? { ...item, status: 'created' as const }
            : item;
        })
      );
    } catch (error) {
      console.error('Error creating Linear tasks:', error);
    }
  };

  const handleCreateCodaTasks = async (items: ActionItem[]) => {
    try {
      const response = await fetch('/api/tasks/coda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, sessionId }),
      });

      if (!response.ok) {
        throw new Error('Error creating Coda tasks');
      }

      const result = await response.json();
      console.log('Coda tasks created:', result);
      
      // Actualizar el estado de los items creados
      setActionItems(prev =>
        prev.map(item => {
          const created = result.results.find((r: any) => r.title === item.title);
          return created && created.success 
            ? { ...item, status: 'created' as const }
            : item;
        })
      );
    } catch (error) {
      console.error('Error creating Coda tasks:', error);
    }
  };

  const handleSaveSession = async () => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Reunión ${new Date().toLocaleDateString()}`,
          summary,
          actionItems,
          transcript,
        }),
      });

      if (!response.ok) {
        throw new Error('Error saving session');
      }

      const result = await response.json();
      console.log('Session saved:', result);
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Meeting Copilot
              </h1>
              <p className="text-sm text-gray-600">
                AI-powered meeting assistant with real-time transcription
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <MicButton
                isRecording={isRecording}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                onTranscriptUpdate={handleTranscriptUpdate}
                onActionItemsUpdate={handleActionItemsUpdate}
                onSummaryUpdate={handleSummaryUpdate}
              />
              
              {!isRecording && (actionItems.length > 0 || summary) && (
                <button
                  onClick={handleSaveSession}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Guardar Sesión
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          
          {/* Panel Izquierdo - Transcripción en Vivo */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
                }`} />
                Transcripción en Vivo
              </h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <LiveTranscript 
                transcript={transcript}
                isRecording={isRecording}
              />
            </div>
          </div>

          {/* Panel Derecho */}
          <div className="space-y-6">
            
            {/* Action Items Panel */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">
                  Action Items ({actionItems.length})
                </h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <ActionItemsPanel
                  actionItems={actionItems}
                  onCreateLinearTasks={handleCreateLinearTasks}
                  onCreateCodaTasks={handleCreateCodaTasks}
                />
              </div>
            </div>

            {/* Session Summary Panel */}
            {summary && (
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Resumen de Sesión
                  </h2>
                </div>
                <div className="p-4">
                  <SessionSummary summary={summary} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}