#!/bin/sh
# Keeps the free-tier Supabase project from pausing after a week without activity.
# cron runs this every 3 days; .cpanel.yml installs the cron entry on deploy.
# The anon key is the same public key the website ships to every visitor.
SUPABASE_URL="https://dtygmvmfztldurxspaxg.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eWdtdm1menRsZHVyeHNwYXhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMjA4NTQsImV4cCI6MjA5Mzg5Njg1NH0.o6jKE6uYoe07F1HRGfn13vKKYGeKBXPlFiIN428g-w0"

code=$(curl -sS --max-time 30 -o /dev/null -w '%{http_code}' \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  "$SUPABASE_URL/rest/v1/store_config?select=id&limit=1")
echo "$(date '+%Y-%m-%d %H:%M') HTTP $code"
[ "$code" = "200" ]
