import { supabase } from "@/integrations/supabase/client";

const getCookie = (name: string): string => {
  const match = document.cookie.split('; ').find(row => row.startsWith(name + '='));
  return match ? match.split('=')[1] : '';
};

/**
 * Invoke an admin edge function with proper CSRF and auth headers
 */
export async function invokeAdminFunction<T = unknown>(
  functionName: string,
  body: Record<string, unknown>
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const csrfToken = getCookie('XSRF-TOKEN');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      return { data: null, error: new Error(result.error || 'Request failed') };
    }

    return { data: result as T, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}
