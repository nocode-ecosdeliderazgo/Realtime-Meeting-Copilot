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
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
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
      const user = await this.getUserByEmail(email);
      return user?.id;
    } catch (error) {
      console.warn(`Could not resolve assignee for email ${email}:`, error);
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