import type { ConversationMessage, ConversationSummary } from './types';

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

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (response.status === 401) throw new NotSignedInError();
  if (response.status === 403) throw new NotAllowedError();
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
    request<{ conversation: ConversationSummary; messages: ConversationMessage[] }>(
      `/api/conversations/${id}`,
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
