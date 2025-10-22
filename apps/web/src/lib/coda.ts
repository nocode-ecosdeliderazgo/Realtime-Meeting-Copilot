export interface CodaDoc {
  id: string;
  type: string;
  href: string;
  name: string;
  owner: string;
  ownerName: string;
  docSize: number;
  sourceDoc?: {
    id: string;
    type: string;
    href: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CodaTable {
  id: string;
  type: string;
  href: string;
  name: string;
  displayColumn: {
    id: string;
    name: string;
  };
  rowCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CodaColumn {
  id: string;
  type: string;
  href: string;
  name: string;
  display: boolean;
  calculated: boolean;
  formula?: string;
  defaultValue?: any;
  format?: {
    type: string;
    isDateTime?: boolean;
    dateFormat?: string;
    timeFormat?: string;
  };
}

export interface CodaRow {
  id: string;
  type: string;
  href: string;
  name: string;
  index: number;
  values: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CodaRowInput {
  cells: Array<{
    column: string;
    value: any;
  }>;
}

export class CodaClient {
  private apiToken: string;
  private apiUrl = 'https://coda.io/apis/v1';

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async getDoc(docId: string): Promise<CodaDoc> {
    return this.request<CodaDoc>(`/docs/${docId}`);
  }

  async getTables(docId: string): Promise<CodaTable[]> {
    const response = await this.request<{ items: CodaTable[] }>(`/docs/${docId}/tables`);
    return response.items;
  }

  async getTable(docId: string, tableId: string): Promise<CodaTable> {
    return this.request<CodaTable>(`/docs/${docId}/tables/${tableId}`);
  }

  async getColumns(docId: string, tableId: string): Promise<CodaColumn[]> {
    const response = await this.request<{ items: CodaColumn[] }>(`/docs/${docId}/tables/${tableId}/columns`);
    return response.items;
  }

  async getRows(docId: string, tableId: string, limit: number = 50): Promise<CodaRow[]> {
    const response = await this.request<{ items: CodaRow[] }>(`/docs/${docId}/tables/${tableId}/rows?limit=${limit}`);
    return response.items;
  }

  async insertRows(docId: string, tableId: string, rows: CodaRowInput[]): Promise<CodaRow[]> {
    const response = await this.request<{ items: CodaRow[] }>(
      `/docs/${docId}/tables/${tableId}/rows`,
      {
        method: 'POST',
        body: JSON.stringify({
          rows: rows,
          keyColumns: [], // Let Coda auto-generate keys
        }),
      }
    );

    return response.items;
  }

  async insertRow(docId: string, tableId: string, cells: Record<string, any>): Promise<CodaRow> {
    const rowInput: CodaRowInput = {
      cells: Object.entries(cells).map(([column, value]) => ({
        column,
        value,
      })),
    };

    const rows = await this.insertRows(docId, tableId, [rowInput]);
    return rows[0];
  }

  // Helper methods para trabajar con action items

  async createActionItemRow(
    docId: string,
    tableId: string,
    actionItem: {
      title: string;
      description?: string;
      ownerEmail?: string;
      dueDate?: string;
      priority?: string;
      source?: string;
      timestampSec?: number;
    },
    sessionId?: string
  ): Promise<CodaRow> {
    // Preparar descripción completa
    let fullDescription = actionItem.description || '';
    if (sessionId) {
      fullDescription += `\n\nCreado desde sesión: ${sessionId}`;
    }
    if (actionItem.source) {
      fullDescription += `\nFuente: ${actionItem.source}`;
    }
    if (actionItem.timestampSec) {
      const minutes = Math.floor(actionItem.timestampSec / 60);
      const seconds = actionItem.timestampSec % 60;
      fullDescription += `\nTiempo: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Preparar fecha de vencimiento
    let dueDate = null;
    if (actionItem.dueDate) {
      try {
        dueDate = new Date(actionItem.dueDate).toISOString().split('T')[0];
      } catch (error) {
        console.warn('Invalid date format for dueDate:', actionItem.dueDate);
      }
    }

    // Crear las celdas
    const cells: Record<string, any> = {
      'Título': actionItem.title,
      'Descripción': fullDescription.trim(),
      'Estado': 'Pendiente',
      'Prioridad': actionItem.priority || 'medium',
      'Creado': new Date().toISOString(),
    };

    // Agregar campos opcionales solo si existen
    if (actionItem.ownerEmail) {
      cells['OwnerEmail'] = actionItem.ownerEmail;
    }

    if (dueDate) {
      cells['Fecha Límite'] = dueDate;
    }

    if (sessionId) {
      cells['Sesión'] = sessionId;
    }

    return this.insertRow(docId, tableId, cells);
  }

  async validateTableStructure(docId: string, tableId: string): Promise<{
    isValid: boolean;
    missingColumns: string[];
    availableColumns: string[];
  }> {
    try {
      const columns = await this.getColumns(docId, tableId);
      const columnNames = columns.map(col => col.name);

      const requiredColumns = ['Título'];
      const recommendedColumns = [
        'Descripción',
        'OwnerEmail', 
        'Fecha Límite',
        'Estado',
        'Prioridad',
        'Creado',
        'Sesión'
      ];

      const missingRequired = requiredColumns.filter(col => !columnNames.includes(col));
      const missingRecommended = recommendedColumns.filter(col => !columnNames.includes(col));

      return {
        isValid: missingRequired.length === 0,
        missingColumns: [...missingRequired, ...missingRecommended],
        availableColumns: columnNames,
      };
    } catch (error) {
      throw new Error(`Error validating table structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper para mapear prioridades
  mapPriorityText(priority?: string): string {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'urgent':
        return 'Alta';
      case 'medium':
        return 'Media';
      case 'low':
        return 'Baja';
      default:
        return 'Media';
    }
  }
}