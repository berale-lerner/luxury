import type {
  AdminRole,
  AdminUser,
  ConversationMessage,
  ConversationSummary,
  Me,
  MessageCursor,
} from './types';

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

/** A refusal the server explained, so the screen can say which one it was. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
  ) {
    super(code ?? `request failed with ${status}`);
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
    // Only when there is a body. Declaring a JSON content type on a request
    // that carries nothing makes Fastify's parser look for a body and reject
    // the request as malformed — which is what a DELETE looked like.
    headers: {
      ...(init?.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
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
    // The server names why it refused; the caller decides what that means to
    // the person reading the screen. Without the code every refusal reads as
    // "something went wrong", including the ones that are simply an answer.
    const code = await response
      .clone()
      .json()
      .then((body: { error?: string }) => body.error)
      .catch(() => undefined);
    throw new ApiError(response.status, code);
  }

  // 204: a delete has nothing to say.
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  me: () => request<{ admin: Me }>('/api/me'),

  users: () => request<{ users: AdminUser[] }>('/api/users'),

  addUser: (email: string, role: AdminRole) =>
    request<{ user: AdminUser }>('/api/users', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  changeRole: (id: string, role: AdminRole) =>
    request<{ user: AdminUser }>(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  removeUser: (id: string) => request<void>(`/api/users/${id}`, { method: 'DELETE' }),

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
