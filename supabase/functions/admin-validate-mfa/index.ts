import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

export const validateMFA = async (userId: string, otp: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    type: 'totp',
    token: otp,
    userId,
  });

  if (error) {
    console.error('MFA validation failed:', error);
    return false;
  }

  return data?.verified || false;
};