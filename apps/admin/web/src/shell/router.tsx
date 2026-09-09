import { useSyncExternalStore, type MouseEvent, type ReactNode } from 'react';

/**
 * The smallest router that is actually correct.
 *
 * Hand-written rather than a dependency because what this application needs
 * from routing is a flat list of pages and one id in a path. What makes
 * hand-written routing go wrong is the history API, not the matching — so
 * that part is not improvised: back and forward are `popstate`, which is
 * subscribed to properly, and `navigate` announces its own pushes because
 * pushState deliberately does not fire an event.
 *
 * The moment a page needs nested layouts, loaders, or a route that can
 * suspend, replace this with a real router rather than growing it.
 */

const listeners = new Set<() => void>();

function announce(): void {
  for (const listener of listeners) listener();
}

window.addEventListener('popstate', announce);

function currentPath(): string {
  return window.location.pathname;
}

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  if (to === currentPath()) return;
  // replace, for a redirect the user did not ask for: pushing would put a
  // location they never chose into the history, and back would return to it.
  if (options.replace) window.history.replaceState(null, '', to);
  else window.history.pushState(null, '', to);
  announce();
}

export function usePath(): string {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
    currentPath,
  );
}

interface LinkProps {
  to: string;
  className?: string | undefined;
  title?: string | undefined;
  'aria-current'?: 'page' | undefined;
  'aria-label'?: string | undefined;
  children: ReactNode;
}

/**
 * A real anchor that happens to navigate without a reload.
 *
 * The href is not decoration: it is what makes the target visible on hover,
 * openable in a new tab, and reachable by a screen reader as a link. So the
 * modified clicks that mean "open this somewhere else" are left alone.
 */
export function Link({ to, children, ...rest }: LinkProps) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to);
  };

  return (
    <a href={to} onClick={onClick} {...rest}>
      {children}
    </a>
  );
}

export interface RouteMatch<T> {
  readonly route: T;
  readonly params: Readonly<Record<string, string>>;
}

/**
 * Matches a path against patterns whose segments are either literal or
 * `:name`. Segment counts must agree, so `/conversations` and
 * `/conversations/:id` are different routes rather than one with an optional
 * tail — which is what lets them declare different behaviour.
 */
export function matchRoute<T extends { path: string }>(
  routes: readonly T[],
  path: string,
): RouteMatch<T> | null {
  const parts = split(path);

  for (const route of routes) {
    const pattern = split(route.path);
    if (pattern.length !== parts.length) continue;

    const params: Record<string, string> = {};
    let matched = true;

    for (const [index, segment] of pattern.entries()) {
      const value = parts[index]!;
      if (segment.startsWith(':')) params[segment.slice(1)] = decodeURIComponent(value);
      else if (segment !== value) {
        matched = false;
        break;
      }
    }

    if (matched) return { route, params };
  }

  return null;
}

function split(path: string): string[] {
  return path.split('/').filter((segment) => segment.length > 0);
}
