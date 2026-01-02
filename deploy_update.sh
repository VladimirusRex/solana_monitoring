#!/bin/bash

# Script de déploiement automatique vers le VPS

echo "🚀 Déploiement des tokens mis à jour vers le VPS..."

# Copier le fichier vers le VPS
echo "📤 Copie du fichier vers le VPS..."
scp solana_monitor_vps.js root@185.182.184.62:~/solana-bot/

# Se connecter et redémarrer
echo "🔄 Redémarrage du bot..."
ssh root@185.182.184.62 << 'ENDSSH'
cd ~/solana-bot
export TELEGRAM_BOT_TOKEN="***REDACTED***"
export TELEGRAM_CHAT_ID="1155086635"
export CHECK_FREQUENCY="30"
pm2 restart solana-bb
echo ""
echo "✅ Bot redémarré!"
echo "📊 Nouveaux tokens: $SNOWBALL, $1, $SPSC, $FKH, $WHITEWHALE, $WOJAK"
echo ""
echo "🔍 Logs: pm2 logs solana-bb"
ENDSSH

echo ""
echo "✅ Déploiement terminé!"
