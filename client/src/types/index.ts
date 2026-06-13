export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  preview?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteListItem {
  id: string;
  title: string;
  tags: string[];
  preview: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  id: string;
  title: string;
  tags: string[];
  preview: string;
  updatedAt: string;
  score: number;
}

export interface GraphNode {
  id: string;
  title: string;
  tags: string[];
  linkCount: number;
  // D3 simulation fields added at runtime
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type AppView = 'notes' | 'graph' | 'search' | 'chat';
