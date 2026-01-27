import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = data.message || message;
    } catch (e) {
      // Fallback to text if JSON parse fails
      const text = await res.text().catch(() => "");
      if (text) message = text;
    }
    throw new Error(message);
  }
}

import { supabase } from "./supabase";

// Helper to get auth headers with active organization context
async function getHeaders(customHeaders?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...customHeaders };

  // Inject Supabase Auth Token
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    headers["Authorization"] = `Bearer ${data.session.access_token}`;
  }

  // Inject Active Organization ID if present
  const activeOrgId = localStorage.getItem("nexus_active_org");
  if (activeOrgId) {
    headers["x-organization-id"] = activeOrgId;
  }

  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  customHeaders?: Record<string, string>
): Promise<Response> {
  const headers = await getHeaders(customHeaders);

  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...headers
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Creates a query function with configurable 401 handling.
 * @param options - Configuration for unauthorized behavior
 * @returns Query function for React Query
 */
export function getQueryFn<T>(options: { on401: UnauthorizedBehavior }): QueryFunction<T> {
  return async ({ queryKey }) => {
    const url = queryKey.join("/");
    const headers = await getHeaders();

    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    if (options.on401 === "returnNull" && res.status === 401) {
      return null as T;
    }

    await throwIfResNotOk(res);
    return res.json() as Promise<T>;
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes - data considered fresh
      gcTime: 1000 * 60 * 30, // 30 minutes - keep in memory for reuse
      retry: 1, // Retry once on failure
      retryDelay: 1000,
      structuralSharing: true, // Optimize re-renders with structural comparison
      refetchOnReconnect: true, // Refetch when network reconnects
    },
    mutations: {
      retry: false,
    },
  },
});
