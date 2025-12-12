#!/bin/bash
# Staging RLS Migration Script
# Run in a staging/test Supabase environment ONLY before applying to production.
# Usage: ./scripts/apply-rls-staging.sh <staging_supabase_url> <staging_service_key>

set -e

SUPABASE_URL=${1}
SERVICE_KEY=${2}

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_KEY" ]; then
  echo "Usage: ./scripts/apply-rls-staging.sh <supabase_url> <service_key>"
  exit 1
fi

echo "Applying RLS policies to staging database at $SUPABASE_URL..."

# Source the SQL from rls-policies.sql and execute via curl
# This is a placeholder; in practice, you'd use the Supabase CLI or direct SQL execution.

# For now, the SQL in sql/rls-policies.sql can be copied and pasted into the Supabase SQL Editor.
# Or use the Supabase CLI:
#   supabase db push --linked

echo "RLS policies queued. Apply them using the Supabase UI or CLI."
echo "After applying, run: node scripts/test-rls.js --supabaseUrl=$SUPABASE_URL"
