import { apiRequest } from './client';

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    chat_messages: number;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations: unknown;
  model?: string;
  createdAt: string;
}

export interface ConversationWithMessages extends Conversation {
  chat_messages: Message[];
}

export interface SendMessageResponse {
  userMessage: Message;
  assistantMessage: Message;
}

/**
 * Fetches all conversations for the current user
 */
export async function getConversations(): Promise<Conversation[]> {
  return apiRequest<Conversation[]>('/api/conversations');
}

/**
 * Fetches a single conversation with its messages
 * @param id Conversation ID
 */
export async function getConversation(id: string): Promise<ConversationWithMessages> {
  return apiRequest<ConversationWithMessages>(`/api/conversations/${id}`);
}

/**
 * Creates a new conversation
 * @param title Initial title (default: 'Nouvelle conversation')
 */
export async function createConversation(title: string = 'Nouvelle conversation'): Promise<Conversation> {
  return apiRequest<Conversation>('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

/**
 * Renames a conversation
 * @param id Conversation ID
 * @param title New title
 */
export async function renameConversation(id: string, title: string): Promise<Conversation> {
  return apiRequest<Conversation>(`/api/conversations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

/**
 * Deletes a conversation
 * @param id Conversation ID
 */
export async function deleteConversation(id: string): Promise<void> {
  await apiRequest(`/api/conversations/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Sends a message to a conversation
 * @param conversationId Conversation ID
 * @param content Message content
 */
export async function sendMessage(conversationId: string, content: string): Promise<SendMessageResponse> {
  return apiRequest<SendMessageResponse>(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}
