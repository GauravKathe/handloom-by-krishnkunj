import { supabase } from "@/integrations/supabase/client";

const getCookie = (name: string): string => {
  const match = document.cookie.split('; ').find(row => row.startsWith(name + '='));
  return match ? match.split('=')[1] : '';
};

/**
 * Fetch CSRF token if not present
 */
async function ensureCsrfToken(): Promise<string> {
  let token = getCookie('XSRF-TOKEN');
  
  if (!token) {
    console.log('[AdminAPI] No CSRF token found, fetching...');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/csrf-token`, { 
        method: 'GET', 
        credentials: 'include',
        mode: 'cors',
      });
      
      if (response.ok) {
        const data = await response.json();
        // The token should now be in the cookie, but we can also use the response
        token = getCookie('XSRF-TOKEN') || data.token || '';
        console.log('[AdminAPI] CSRF token fetched:', token ? 'success' : 'failed');
      }
    } catch (e) {
      console.warn('[AdminAPI] Failed to fetch CSRF token:', e);
    }
  }
  
  return token;
}

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
      console.error('[AdminAPI] Not authenticated - no access token');
      return { data: null, error: new Error('Not authenticated') };
    }

    const csrfToken = await ensureCsrfToken();
    console.log('[AdminAPI] Calling', functionName, 'with CSRF:', csrfToken ? 'present' : 'missing');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    console.log('[AdminAPI] Response:', response.status, result);

    if (!response.ok) {
      return { data: null, error: new Error(result.error || 'Request failed') };
    }

    return { data: result as T, error: null };
  } catch (err) {
    console.error('[AdminAPI] Error:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}
