#!/bin/bash

# Script de démarrage rapide pour VPS
# Usage: ./start_vps.sh

echo "🚀 Démarrage du monitoring Solana Bollinger Bands"
echo "=================================================="

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé!"
    echo "Installez-le avec: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Vérifier les variables d'environnement
if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
    echo ""
    echo "⚠️  Variables d'environnement manquantes!"
    echo ""
    echo "Configurez-les avec:"
    echo "  export TELEGRAM_BOT_TOKEN='votre_token'"
    echo "  export TELEGRAM_CHAT_ID='votre_chat_id'"
    echo ""
    echo "Ou créez un fichier .env (voir .env.example)"
    exit 1
fi

echo "✅ Configuration Telegram détectée"

# Vérifier si PM2 est disponible
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 détecté - Utilisation de PM2"
    pm2 start solana_monitor_vps.js --name "solana-bb" --time
    pm2 save
    echo ""
    echo "✅ Bot démarré avec PM2!"
    echo "📊 Voir les logs: pm2 logs solana-bb"
    echo "⏸️  Arrêter: pm2 stop solana-bb"
    echo "🔄 Redémarrer: pm2 restart solana-bb"
else
    echo "⚠️  PM2 non trouvé - Démarrage simple"
    echo "💡 Installez PM2 pour une meilleure gestion: sudo npm install -g pm2"
    echo ""
    echo "Démarrage du bot..."
    node solana_monitor_vps.js
fi
