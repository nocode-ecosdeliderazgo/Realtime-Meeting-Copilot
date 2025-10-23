export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  url: string;
  state: {
    name: string;
  };
  assignee?: {
    id: string;
    email: string;
    name: string;
  };
  team: {
    id: string;
    name: string;
  };
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

export interface LinearUser {
  id: string;
  email: string;
  name: string;
}

export class LinearClient {
  private apiKey: string;
  private apiUrl = 'https://api.linear.app/graphql';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async graphqlRequest<T>(query: string, variables: any = {}): Promise<T> {
    console.log('🔄 [Linear GraphQL] Enviando consulta:', {
      query: query.trim(),
      variables
    });
    console.log('🔑 [Linear] API Key (primeros 15 chars):', this.apiKey.substring(0, 15));
    
    const requestBody = JSON.stringify({
      query,
      variables,
    });
    
    console.log('📤 [Linear] Request body completo:', requestBody);
    console.log('🌐 [Linear] URL de destino:', this.apiUrl);
    
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });

    console.log('📥 [Linear] Response status:', response.status);
    console.log('📥 [Linear] Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📥 [Linear] Response raw text:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ [Linear] JSON Parse Error:', parseError);
      console.error('❌ [Linear] Raw response that failed to parse:', responseText);
      throw new Error(`Failed to parse JSON response: ${parseError}`);
    }
    
    console.log('📦 [Linear GraphQL] Respuesta parseada:', {
      status: response.status,
      result
    });

    if (!response.ok) {
      console.error('❌ [Linear GraphQL] Error HTTP:', response.status, result);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (result.errors) {
      console.error('❌ [Linear GraphQL] Errores GraphQL:', result.errors);
      throw new Error(`GraphQL Error: ${result.errors.map((e: any) => e.message).join(', ')}`);
    }

    return result.data;
  }

  async createIssue(input: {
    teamId: string;
    title: string;
    description?: string;
    assigneeId?: string;
    priority?: number;
    labelIds?: string[];
  }): Promise<LinearIssue> {
    const mutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            description
            url
            state {
              name
            }
            assignee {
              id
              email
              name
            }
            team {
              id
              name
            }
          }
        }
      }
    `;

    const result = await this.graphqlRequest<{
      issueCreate: {
        success: boolean;
        issue: LinearIssue;
      };
    }>(mutation, { input });

    if (!result.issueCreate.success) {
      throw new Error('Failed to create issue');
    }

    return result.issueCreate.issue;
  }

  async getTeams(): Promise<LinearTeam[]> {
    const query = `
      query GetTeams {
        teams {
          nodes {
            id
            name
            key
          }
        }
      }
    `;

    const result = await this.graphqlRequest<{
      teams: {
        nodes: LinearTeam[];
      };
    }>(query);

    return result.teams.nodes;
  }

  async getUsers(teamId?: string): Promise<LinearUser[]> {
    const query = `
      query GetUsers($teamId: String) {
        users(filter: { isMe: { eq: false } }) {
          nodes {
            id
            email
            name
            ${teamId ? `
              teamMemberships(filter: { team: { id: { eq: $teamId } } }) {
                nodes {
                  id
                }
              }
            ` : ''}
          }
        }
      }
    `;

    const result = await this.graphqlRequest<{
      users: {
        nodes: (LinearUser & { teamMemberships?: { nodes: { id: string }[] } })[];
      };
    }>(query, teamId ? { teamId } : {});

    // Filtrar por miembros del equipo si se especificó teamId
    const users = result.users.nodes.filter(user => {
      if (!teamId) return true;
      return user.teamMemberships && user.teamMemberships.nodes.length > 0;
    });

    return users.map(({ teamMemberships, ...user }) => user);
  }

  async getUserByEmail(email: string): Promise<LinearUser | null> {
    const query = `
      query GetUserByEmail($email: String!) {
        users(filter: { email: { eq: $email } }) {
          nodes {
            id
            email
            name
          }
        }
      }
    `;

    const result = await this.graphqlRequest<{
      users: {
        nodes: LinearUser[];
      };
    }>(query, { email });

    return result.users.nodes[0] || null;
  }

  async getTeamById(teamId: string): Promise<LinearTeam | null> {
    const query = `
      query GetTeam($teamId: String!) {
        team(id: $teamId) {
          id
          name
          key
        }
      }
    `;

    const result = await this.graphqlRequest<{
      team: LinearTeam | null;
    }>(query, { teamId });

    return result.team;
  }

  // Método helper para mapear emails a assignee IDs
  async resolveAssigneeId(email?: string, teamId?: string): Promise<string | undefined> {
    if (!email) return undefined;

    try {
      console.log(`🔍 [Linear] Buscando usuario con email: ${email}`);
      const user = await this.getUserByEmail(email);
      
      if (user) {
        console.log(`✅ [Linear] Usuario encontrado: ${user.name} (${user.id})`);
        return user.id;
      } else {
        console.log(`⚠️ [Linear] Usuario no encontrado para email: ${email}`);
        return undefined;
      }
    } catch (error) {
      console.warn(`❌ [Linear] Error buscando usuario ${email}:`, error instanceof Error ? error.message : error);
      return undefined;
    }
  }

  // Método helper para mapear prioridad texto a número
  mapPriorityToNumber(priority?: string): number {
    switch (priority?.toLowerCase()) {
      case 'urgent':
      case 'high':
        return 1; // High priority
      case 'medium':
        return 2; // Medium priority
      case 'low':
        return 3; // Low priority
      default:
        return 2; // Default to medium
    }
  }
}