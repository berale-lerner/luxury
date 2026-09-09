import type { ConversationMessage, ConversationSummary, MessageCursor } from './types';

/**
 * The API client.
 *
 * A 401 or 403 is not an error to display in the thread — it means the
 * session ended or the address was removed from the allowlist, and the right
 * response is to show the sign-in screen rather than a red banner.
 */
export class NotSignedInError extends Error {}
export class NotAllowedError extends Error {
  constructor(readonly email?: string) {
    super('not allowed');
  }
}

export type AuthFailure = 'signed-out' | 'not-allowed';

const authListeners = new Set<(failure: AuthFailure) => void>();

/**
 * Announces that the server stopped accepting this session.
 *
 * It is reported from here, once, rather than by each page catching the two
 * error types: the shell subscribes and replaces the screen, so a page added
 * later gets that behaviour without knowing it exists. A page that forgets to
 * handle an expired session is then not a page that silently keeps rendering
 * stale data.
 *
 * The errors are still thrown — a caller that wants to stop what it was doing
 * has to see them.
 */
export function onAuthFailure(listener: (failure: AuthFailure) => void): () => void {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

function reportAuthFailure(failure: AuthFailure): void {
  for (const listener of authListeners) listener(failure);
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (response.status === 401) {
    reportAuthFailure('signed-out');
    throw new NotSignedInError();
  }
  if (response.status === 403) {
    reportAuthFailure('not-allowed');
    throw new NotAllowedError();
  }
  if (!response.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${url} failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

export const api = {
  me: () => request<{ admin: { email: string; name: string | null } }>('/api/me'),

  conversations: (search: string) =>
    request<{ conversations: ConversationSummary[] }>(
      `/api/conversations${search ? `?search=${encodeURIComponent(search)}` : ''}`,
    ),

  conversation: (id: string) =>
    request<{
      conversation: ConversationSummary;
      messages: ConversationMessage[];
      cursor: MessageCursor | null;
    }>(`/api/conversations/${id}`),

  /** What polling asks for. Usually returns an empty list. */
  messagesSince: (id: string, cursor: MessageCursor) =>
    request<{ messages: ConversationMessage[]; cursor: MessageCursor }>(
      `/api/conversations/${id}/messages?at=${encodeURIComponent(cursor.at)}&id=${cursor.id}`,
    ),

  send: (id: string, body: string) =>
    request<{ message: ConversationMessage }>(`/api/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  setAgentMuted: (id: string, muted: boolean) =>
    request<{ muted: boolean }>(`/api/conversations/${id}/agent`, {
      method: 'POST',
      body: JSON.stringify({ muted }),
    }),
};
