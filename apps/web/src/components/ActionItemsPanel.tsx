'use client';

import React, { useState } from 'react';
import { CheckCircle, Clock, AlertCircle, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { ActionItem } from '@/lib/schemas';

interface ActionItemsPanelProps {
  actionItems: ActionItem[];
  onCreateLinearTasks: (items: ActionItem[]) => void;
  onCreateCodaTasks: (items: ActionItem[]) => void;
}

export default function ActionItemsPanel({
  actionItems,
  onCreateLinearTasks,
  onCreateCodaTasks,
}: ActionItemsPanelProps) {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isCreatingLinear, setIsCreatingLinear] = useState(false);
  const [isCreatingCoda, setIsCreatingCoda] = useState(false);

  const handleSelectItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === actionItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(Array.from({ length: actionItems.length }, (_, i) => i)));
    }
  };

  const handleCreateLinear = async () => {
    const itemsToCreate = actionItems.filter((_, index) => selectedItems.has(index));
    if (itemsToCreate.length === 0) return;

    setIsCreatingLinear(true);
    try {
      await onCreateLinearTasks(itemsToCreate);
      setSelectedItems(new Set()); // Limpiar selección
    } catch (error) {
      console.error('Error creating Linear tasks:', error);
    } finally {
      setIsCreatingLinear(false);
    }
  };

  const handleCreateCoda = async () => {
    const itemsToCreate = actionItems.filter((_, index) => selectedItems.has(index));
    if (itemsToCreate.length === 0) return;

    setIsCreatingCoda(true);
    try {
      await onCreateCodaTasks(itemsToCreate);
      setSelectedItems(new Set()); // Limpiar selección
    } catch (error) {
      console.error('Error creating Coda tasks:', error);
    } finally {
      setIsCreatingCoda(false);
    }
  };

  const getStatusIcon = (status: ActionItem['status']) => {
    switch (status) {
      case 'created':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ActionItem['status']) => {
    switch (status) {
      case 'created':
        return 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const getPriorityColor = (priority?: ActionItem['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return null;
    
    const date = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays === -1) return 'Ayer';
    if (diffDays < 0) return `Hace ${Math.abs(diffDays)} días`;
    return `En ${diffDays} días`;
  };

  if (actionItems.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-4">✅</div>
          <p className="text-lg font-medium">No hay tareas aún</p>
          <p className="text-sm">Los action items aparecerán aquí durante la reunión</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header con controles */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={selectedItems.size === actionItems.length && actionItems.length > 0}
              onChange={handleSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Seleccionar todos ({selectedItems.size})</span>
          </label>
        </div>
        
        {selectedItems.size > 0 && (
          <div className="flex space-x-2">
            <button
              onClick={handleCreateLinear}
              disabled={isCreatingLinear}
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreatingLinear ? (
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ExternalLink className="w-3 h-3" />
              )}
              <span>Linear ({selectedItems.size})</span>
            </button>
            
            <button
              onClick={handleCreateCoda}
              disabled={isCreatingCoda}
              className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {isCreatingCoda ? (
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
              <span>Coda ({selectedItems.size})</span>
            </button>
          </div>
        )}
      </div>

      {/* Lista de Action Items */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 p-4">
          {actionItems.map((item, index) => (
            <div
              key={index}
              className={`border rounded-lg p-3 transition-all duration-200 ${getStatusColor(item.status)} ${
                selectedItems.has(index) ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={selectedItems.has(index)}
                  onChange={() => handleSelectItem(index)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-gray-900 text-sm leading-5">
                      {item.title}
                    </h3>
                    <div className="flex items-center space-x-1 ml-2">
                      {getStatusIcon(item.status)}
                    </div>
                  </div>
                  
                  {item.description && (
                    <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  
                  <div className="flex items-center flex-wrap gap-2 mt-2">
                    {item.priority && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    )}
                    
                    {item.ownerEmail && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                        {item.ownerEmail}
                      </span>
                    )}
                    
                    {item.dueDate && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800">
                        📅 {formatDueDate(item.dueDate)}
                      </span>
                    )}
                    
                    {item.timestampSec && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                        ⏱️ {Math.floor(item.timestampSec / 60)}:{String(item.timestampSec % 60).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer con estadísticas */}
      <div className="border-t bg-gray-50 px-4 py-2">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>
            {actionItems.length} {actionItems.length === 1 ? 'tarea' : 'tareas'}
          </span>
          <span>
            {actionItems.filter(item => item.status === 'created').length} creadas
          </span>
        </div>
      </div>
    </div>
  );
}