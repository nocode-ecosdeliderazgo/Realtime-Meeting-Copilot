'use client';

import React from 'react';
import { FileText, Users, Clock } from 'lucide-react';

interface SessionSummaryProps {
  summary: string;
}

export default function SessionSummary({ summary }: SessionSummaryProps) {
  const formatSummary = (text: string) => {
    // Convertir bullets y lista en formato markdown-like a HTML
    return text
      .split('\n')
      .map((line, index) => {
        const trimmed = line.trim();
        
        // Detectar bullets (-, *, •)
        if (trimmed.match(/^[-*•]\s+/)) {
          return (
            <li key={index} className="text-sm text-gray-700 leading-relaxed">
              {trimmed.replace(/^[-*•]\s+/, '')}
            </li>
          );
        }
        
        // Detectar líneas numeradas
        if (trimmed.match(/^\d+\.\s+/)) {
          return (
            <li key={index} className="text-sm text-gray-700 leading-relaxed">
              {trimmed.replace(/^\d+\.\s+/, '')}
            </li>
          );
        }
        
        // Líneas normales
        if (trimmed) {
          return (
            <p key={index} className="text-sm text-gray-700 leading-relaxed">
              {trimmed}
            </p>
          );
        }
        
        return null;
      })
      .filter(Boolean);
  };

  const summaryLines = formatSummary(summary);
  const hasBullets = summary.match(/^[-*•]\s+/m) || summary.match(/^\d+\.\s+/m);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-2 text-gray-600">
        <FileText className="w-4 h-4" />
        <span className="text-sm font-medium">Resumen generado por IA</span>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {hasBullets ? (
          <ul className="space-y-2 pl-4 list-disc list-outside">
            {summaryLines}
          </ul>
        ) : (
          <div className="space-y-2">
            {summaryLines}
          </div>
        )}
      </div>

      {/* Footer con metadata */}
      <div className="pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Actualizado hace unos segundos</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <span>📝</span>
            <span>Resumen automático</span>
          </div>
        </div>
      </div>
    </div>
  );
}