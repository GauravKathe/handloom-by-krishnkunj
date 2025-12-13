import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

export const validateMFA = async (userId: string, factorId: string, code: string): Promise<boolean> => {
  try {
    // Verify TOTP using the MFA API
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (error) {
      console.error('MFA validation failed:', error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('MFA validation error:', err);
    return false;
  }
};
