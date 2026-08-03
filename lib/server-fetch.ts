import { getInternalOrigin } from "@/lib/request-context";

/**
 * Fetch ke API route sendiri (misal /api/dashboard) dari dalam Server
 * Component — perlu forward cookie sesi secara manual karena fetch di
 * server itu request HTTP baru yang terpisah dari cookie browser user.
 */
export async function fetchInternal(path: string, init?: RequestInit) {
  const { origin, cookieHeader } = await getInternalOrigin();
  return fetch(`${origin}${path}`, {
    ...init,
    headers: { ...(init?.headers || {}), cookie: cookieHeader },
    cache: "no-store",
  });
}
