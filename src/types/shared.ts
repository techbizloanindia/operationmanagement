export interface ChatMessage {
  text: string;
  sender: string;
  timestamp: string;
  isSent: boolean;
}

export type TeamType = 'sales' | 'credit' | 'both' | undefined;

// Enhanced query interface with operation markings and status
export interface Query {
  id: string;
  title: string;
  tat: string;
  team?: TeamType;
  messages: ChatMessage[];
  status: 'pending' | 'resolved' | 'in_progress';
  markedForTeam?: TeamType; // Which team Operations marked this query for
  allowMessaging?: boolean; // Whether messaging is enabled for current user's team
  priority?: 'high' | 'medium' | 'low';
  description?: string;
  caseId?: string;
  customerName?: string;
  branch?: string;
  branchCode?: string;
  createdBy?: string;
  createdAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionReason?: string;
}

// Resolved query interface for Query Resolve page
export interface ResolvedQuery {
  id: string;
  queryId: string;
  title: string;
  caseId: string;
  customerName: string;
  branch: string;
  branchCode?: string;
  resolvedAt: string;
  resolvedBy: string;
  resolutionReason: string;
  priority: 'high' | 'medium' | 'low';
  team: TeamType;
  history: QueryHistoryItem[];
}

// Query history item for tracking all actions
export interface QueryHistoryItem {
  id: string;
  timestamp: string;
  action: 'created' | 'message_sent' | 'reverted' | 'resolved' | 'marked_for_team';
  actor: string; // Employee ID or name
  details: string;
  additionalData?: any;
}

export interface Case {
  id: string;
  customerName: string;
  branch: string;
  branchCode?: string;
  queries: Query[];
}

// Authentication types
export type UserRole = 'sales' | 'credit' | 'operations' | 'admin';

export interface User {
  employeeId: string;
  name: string;
  role: UserRole;
  isAuthenticated: boolean;
  branch?: string | null;
  branchCode?: string | null;
  assignedBranches?: string[]; // Admin-assigned branch codes for sales/credit users
  department?: string;
  permissions?: string[];
}

export interface LoginCredentials {
  employeeId: string;
  password: string;
  branch?: string;
  branchCode?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
} 