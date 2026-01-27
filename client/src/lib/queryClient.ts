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
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const url = queryKey.join("/");
      const headers = await getHeaders();

      const res = await fetch(url as string, {
        headers,
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
