#!/bin/bash

# Script de mise à jour automatique des tokens sur le VPS

echo "🔄 Mise à jour des tokens surveillés..."

cd ~/solana-bot

# Backup de l'ancien fichier
cp solana_monitor_vps.js solana_monitor_vps.js.backup

# Créer le nouveau fichier avec les tokens mis à jour
cat > solana_monitor_vps_temp.js << 'EOF'
#!/usr/bin/env node

/**
 * Solana Bollinger Bands Monitor - VPS Edition
 * Monitors Solana tokens for Bollinger Band breakouts and sends Telegram alerts
 * Designed for 24/7 operation on a VPS
 */

const https = require('https');

// ==================== CONFIGURATION ====================

const TOKENS = [
    {
        name: "SNOWBALL",
        symbol: "$SNOWBALL",
        address: "Gbu7JAKhTVtGyRryg8cYPiKNhonXpUqbrZuCDjfUpump",
        pool: "4KfHWqcSJWsrTq19FLzFYm3cGN4oASAj7ZCiUoFx16KS",
        candle_interval: 15
    },
    {
        name: "1 coin",
        symbol: "$1",
        address: "GMvCfcZg8YvkkQmwDaAzCtHDrrEtgE74nQpQ7xNabonk",
        pool: "6sEkZ73vph5AFYmQTzaV6H5vAQQLZ2C8WqeCQ6MhLqFk",
        candle_interval: 15
    },
    {
        name: "SPSC",
        symbol: "$SPSC",
        address: "4nswj3o1Lo9iWYvvRJxUD8vbCy9ay7QQoXYcncHNbonk",
        pool: "6MHj1z5BgC1UiTNEWrnJfbGtQPuPdh2qgdWkemGxT2c5",
        candle_interval: 15
    },
    {
        name: "FKH",
        symbol: "$FKH",
        address: "BCXpjsHYmgVpRKdv4EQv1RARhYagnnwPkJjYbvM6bonk",
        pool: "8Lq7gz2aEzkMQNfLpYmjv3V8JbD26LRbFd11SnRicCE6",
        candle_interval: 15
    },
    {
        name: "WHITEWHALE",
        symbol: "$WHITEWHALE",
        address: "a3W4qutoEJA4232T2gwZUfgYJTetr96pU4SJMwppump",
        pool: "4qxSqMh6iEdbdvtMp8r5MK2psAGKNk57PfGeVo2VhczQ",
        candle_interval: 15
    },
    {
        name: "WOJAK",
        symbol: "$WOJAK",
        address: "8J69rbLTzWWgUJziFY8jeu5tDwEPBwUz4pKBMr5rpump",
        pool: "FDrY5i5kuadZ1ik8gPS26qjj9Rw9mpufXMegGC2HNSP7",
        candle_interval: 15
    }
];
EOF

# Extraire le reste du fichier (après la ligne 56)
tail -n +57 solana_monitor_vps.js.backup >> solana_monitor_vps_temp.js

# Remplacer l'ancien fichier
mv solana_monitor_vps_temp.js solana_monitor_vps.js
chmod +x solana_monitor_vps.js

echo "✅ Fichier mis à jour"
echo "🔄 Redémarrage du bot PM2..."

# Charger les variables d'environnement et redémarrer
export TELEGRAM_BOT_TOKEN="***REDACTED***"
export TELEGRAM_CHAT_ID="1155086635"
export CHECK_FREQUENCY="30"

pm2 restart solana-bb

echo "✅ Bot redémarré avec les nouveaux tokens!"
echo ""
echo "📊 Nouveaux tokens surveillés:"
echo "  - $SNOWBALL"
echo "  - $1 (nouveau)"
echo "  - $SPSC"
echo "  - $FKH"
echo "  - $WHITEWHALE"
echo "  - $WOJAK (nouveau)"
echo ""
echo "🔍 Vérifier les logs: pm2 logs solana-bb"
