#!/bin/bash

# Script d'installation pour VPS
# Configure automatiquement l'environnement

echo "🔧 Installation du monitoring Solana Bollinger Bands"
echo "===================================================="
echo ""

# Vérifier le système
if [ -f /etc/debian_version ]; then
    echo "✅ Système Debian/Ubuntu détecté"
elif [ -f /etc/redhat-release ]; then
    echo "✅ Système RedHat/CentOS détecté"
else
    echo "⚠️  Système non reconnu - continuez à vos risques"
fi

echo ""
read -p "Voulez-vous installer Node.js? (o/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Oo]$ ]]; then
    echo "📦 Installation de Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✅ Node.js $(node --version) installé"
fi

echo ""
read -p "Voulez-vous installer PM2? (o/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Oo]$ ]]; then
    echo "📦 Installation de PM2..."
    sudo npm install -g pm2
    echo "✅ PM2 installé"
fi

echo ""
echo "📝 Configuration Telegram"
echo "========================="
echo ""

# Configuration Telegram
read -p "Bot Token Telegram: " BOT_TOKEN
read -p "Chat ID Telegram: " CHAT_ID
read -p "Fréquence de vérification (secondes, défaut=30): " FREQUENCY
FREQUENCY=${FREQUENCY:-30}

# Créer fichier .env
cat > .env << ENVEOF
TELEGRAM_BOT_TOKEN=$BOT_TOKEN
TELEGRAM_CHAT_ID=$CHAT_ID
CHECK_FREQUENCY=$FREQUENCY
ENVEOF

echo ""
echo "✅ Configuration sauvegardée dans .env"
echo ""

# Tester la configuration
echo "🧪 Test de la configuration..."
export TELEGRAM_BOT_TOKEN="$BOT_TOKEN"
export TELEGRAM_CHAT_ID="$CHAT_ID"

node test_vps.js

echo ""
echo "=================================================="
echo "✅ Installation terminée!"
echo "=================================================="
echo ""
echo "Pour démarrer le bot:"
echo "  ./start_vps.sh"
echo ""
echo "Ou manuellement avec PM2:"
echo "  source .env"
echo "  export TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID CHECK_FREQUENCY"
echo "  pm2 start solana_monitor_vps.js --name solana-bb"
echo ""
