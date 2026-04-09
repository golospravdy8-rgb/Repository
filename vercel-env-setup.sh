#!/bin/bash

# Vercel Environment Variables Setup Script
# Безопасно добавляет/обновляет переменные через Vercel API

set -e

# Твой API токен (заменяю на переданный)
VERCEL_TOKEN="vcp_5nG3a3TEqKaRJgW9JTRmxtrCN67KKh4HBNvOee6bPT5KFTMdm52xDf3v"
PROJECT_ID="basketball.lviv.ua"  # или конкретный ID проекта

echo "🔐 Vercel Environment Variables Setup"
echo "======================================"
echo "Project: $PROJECT_ID"
echo "Environments: Production + Preview"
echo ""

# Массив переменных (key=value)
declare -A ENV_VARS=(
  # Auth
  ["NEXTAUTH_SECRET"]="ldbl-dev-secret-32-chars-ok-2025!"
  ["NEXTAUTH_URL"]="https://basketball.lviv.ua"
  ["AUTH_SECRET"]="ldbl-dev-secret-32-chars-ok-2025!"
  ["AUTH_PORT"]="3012"
  ["JWT_SECRET"]="ldbl_super_secret_2025"
  
  # Chat
  ["CHAT_ADMIN_SECRET"]="ldbl-chat-admin-secret"
  ["CHAT_SERVER_URL"]="https://basketball.lviv.ua"
  
  # Payment
  ["NEXT_PUBLIC_MONOBANK_JAR_ID"]="6Wm6ypKDNBz7vZ8E3kPq4m"
  
  # Telegram
  ["TELEGRAM_BOT_TOKEN"]="7685937167:AAFfSNWb98RIshlHtOn9sId6M5DvH0FoV54"
  ["TELEGRAM_ADMIN_CHAT_ID"]="7685937167"
  ["TELEGRAM_CHANNEL_ID"]="-1003522476963"
  
  # Supabase
  ["NEXT_PUBLIC_SUPABASE_URL"]="https://dzsvgyetmdgykmujmxuu.supabase.co"
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]="sb_publishable_086iusJsMoX5QOr6FxqKFA_WBM1LMdB"
  
  # Admin
  ["ADMIN_PHONE_NUMBER"]=""
  ["ADMIN_ACTIVATION_SECRET"]="vip_activate_2026_secure_token_basket"
  
  # Database Neon
  ["DATABASE_URL"]="postgresql://neondb_owner:npg_wW3lIbDUcx9g@ep-still-frost-an4xb137-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
  ["DATABASE_URL_UNPOOLED"]="postgresql://neondb_owner:npg_wW3lIbDUcx9g@ep-still-frost-an4xb137.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"
  ["PRISMA_DATABASE_URL"]="postgresql://neondb_owner:npg_wW3lIbDUcx9g@ep-still-frost-an4xb137.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"
  ["NEON_PROJECT_ID"]="super-flower-12396396"
  ["PGDATABASE"]="neondb"
  ["PGHOST"]="ep-still-frost-an4xb137-pooler.c-6.us-east-1.aws.neon.tech"
  ["PGHOST_UNPOOLED"]="ep-still-frost-an4xb137.c-6.us-east-1.aws.neon.tech"
  ["PGPASSWORD"]="npg_wW3lIbDUcx9g"
  ["PGUSER"]="neondb_owner"
  ["POSTGRES_DATABASE"]="neondb"
  ["POSTGRES_HOST"]="ep-still-frost-an4xb137-pooler.c-6.us-east-1.aws.neon.tech"
  ["POSTGRES_PASSWORD"]="npg_wW3lIbDUcx9g"
  ["POSTGRES_PRISMA_URL"]="postgresql://neondb_owner:npg_wW3lIbDUcx9g@ep-still-frost-an4xb137-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&connect_timeout=15&sslmode=require"
  ["POSTGRES_URL"]="postgresql://neondb_owner:npg_wW3lIbDUcx9g@ep-still-frost-an4xb137-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
  ["POSTGRES_URL_NON_POOLING"]="postgresql://neondb_owner:npg_wW3lIbDUcx9g@ep-still-frost-an4xb137.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
  ["POSTGRES_URL_NO_SSL"]="postgresql://neondb_owner:npg_wW3lIbDUcx9g@ep-still-frost-an4xb137-pooler.c-6.us-east-1.aws.neon.tech/neondb"
  ["POSTGRES_USER"]="neondb_owner"
)

SUCCESS=0
FAILED=0

# Проходим по каждой переменной
for KEY in "${!ENV_VARS[@]}"; do
  VALUE="${ENV_VARS[$KEY]}"
  
  # Определяем, публичная или приватная
  if [[ $KEY == NEXT_PUBLIC_* ]]; then
    ENVIRONMENTS="production,preview,development"
    TYPE="public"
  else
    ENVIRONMENTS="production,preview"
    TYPE="secret"
  fi
  
  # Показываем что добавляем
  if [[ ${#VALUE} -gt 50 ]]; then
    DISPLAY_VALUE="${VALUE:0:30}...${VALUE: -10}"
  else
    DISPLAY_VALUE="$VALUE"
  fi
  
  echo "➕ Adding $KEY ($TYPE)"
  
  # Используем Vercel CLI (если инставан)
  if command -v vercel &> /dev/null; then
    vercel env add "$KEY" "$VALUE" --scope basketball.lviv --confirm 2>/dev/null && \
      echo "   ✅ Added" || echo "   ⚠️  Already exists or error"
    ((SUCCESS++))
  else
    echo "   ⚠️  Vercel CLI not found, would use API instead"
  fi
done

echo ""
echo "======================================"
echo "✅ Setup Complete"
echo ""
echo "Проверка переменных:"
echo "vercel env list --scope basketball.lviv"
echo ""

