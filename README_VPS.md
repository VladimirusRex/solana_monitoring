# Solana Bollinger Bands Monitor - VPS Edition

Système de surveillance 24/7 des breakouts de Bandes de Bollinger pour les tokens Solana avec alertes Telegram.

## 🚀 Fonctionnalités

- ✅ Surveillance continue 24/7 sur VPS
- 📊 Bandes de Bollinger (20 périodes, 2 écarts-types)
- 📈 Calcul RSI(14)
- 🔔 Alertes Telegram instantanées
- ⏱️ Bougies de 1 heure (configurable)
- 🛡️ Cooldown de 15 minutes entre alertes
- 📉 Support multi-tokens

## 📋 Prérequis

- Node.js 14+ installé sur votre VPS
- Un bot Telegram (créé via [@BotFather](https://t.me/BotFather))
- Votre Chat ID Telegram (obtenez-le via [@userinfobot](https://t.me/userinfobot))

## 🔧 Installation sur VPS

### 1. Connexion au VPS

```bash
ssh votre_utilisateur@votre_vps_ip
```

### 2. Installation de Node.js (si nécessaire)

```bash
# Pour Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Vérifier l'installation
node --version
npm --version
```

### 3. Cloner ou copier les fichiers

```bash
# Créer un dossier pour le bot
mkdir -p ~/solana-monitor
cd ~/solana-monitor

# Copier le fichier solana_monitor_vps.js sur votre VPS
# Méthode 1: Avec scp depuis votre ordinateur local
scp solana_monitor_vps.js votre_utilisateur@votre_vps_ip:~/solana-monitor/

# Méthode 2: Créer le fichier directement
nano solana_monitor_vps.js
# Coller le contenu et sauvegarder (Ctrl+X, Y, Enter)
```

### 4. Rendre le script exécutable

```bash
chmod +x solana_monitor_vps.js
```

### 5. Configuration

Vous pouvez configurer le bot de deux façons:

**Option A: Variables d'environnement (recommandé)**

```bash
export TELEGRAM_BOT_TOKEN="***REDACTED***"
export TELEGRAM_CHAT_ID="1155086635"
export CHECK_FREQUENCY="30"
```

**Option B: Modifier directement le fichier**

Éditez `solana_monitor_vps.js` et modifiez les constantes:
```javascript
const TELEGRAM_BOT_TOKEN = 'votre_token_ici';
const TELEGRAM_CHAT_ID = 'votre_chat_id_ici';
const CHECK_FREQUENCY = 30; // en secondes
```

## 🏃 Lancement

### Lancement simple (test)

```bash
node solana_monitor_vps.js
```

### Lancement en arrière-plan avec PM2 (recommandé pour production)

PM2 est un gestionnaire de processus qui maintient votre bot en vie même après déconnexion.

```bash
# Installer PM2 globalement
sudo npm install -g pm2

# Démarrer le bot
pm2 start solana_monitor_vps.js --name "solana-monitor"

# Configurer PM2 pour démarrer au boot du VPS
pm2 startup
pm2 save

# Commandes utiles PM2
pm2 status              # Voir le statut
pm2 logs solana-monitor # Voir les logs en temps réel
pm2 restart solana-monitor # Redémarrer
pm2 stop solana-monitor    # Arrêter
pm2 delete solana-monitor  # Supprimer
```

### Lancement avec Screen (alternative)

Screen permet de garder le processus actif après déconnexion.

```bash
# Installer screen si nécessaire
sudo apt-get install screen

# Créer une nouvelle session screen
screen -S solana

# Lancer le bot
node solana_monitor_vps.js

# Détacher la session: Ctrl+A puis D
# Rattacher la session: screen -r solana
```

### Lancement avec nohup (alternative simple)

```bash
# Lancer en arrière-plan
nohup node solana_monitor_vps.js > output.log 2>&1 &

# Voir les logs
tail -f output.log

# Arrêter
pkill -f solana_monitor_vps.js
```

## 📊 Configuration des tokens

Pour modifier les tokens surveillés, éditez le fichier `solana_monitor_vps.js` et modifiez le tableau `TOKENS`:

```javascript
const TOKENS = [
    {
        name: "VOTRE_TOKEN",
        symbol: "$SYMBOL",
        address: "adresse_du_token",
        pool: "adresse_du_pool_geckoterminal",
        candle_interval: 60  // 60 = 1 heure
    },
    // ... autres tokens
];
```

### Trouver les bonnes informations:

1. **Adresse du token**: Disponible sur [Solscan](https://solscan.io/)
2. **Pool GeckoTerminal**:
   - Allez sur [GeckoTerminal](https://www.geckoterminal.com/)
   - Recherchez votre token
   - Copiez l'ID du pool depuis l'URL ou les détails du pool
   - Vérifiez le volume et la TVL pour choisir le meilleur pool

## 🔔 Vérification du bot Telegram

Pour vérifier que votre bot fonctionne:

```bash
# Tester l'envoi d'un message
curl -X POST "https://api.telegram.org/bot***REDACTED***/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id":"1155086635","text":"Test depuis le VPS ✅"}'
```

## 📝 Logs et monitoring

### Avec PM2:
```bash
pm2 logs solana-monitor        # Logs en temps réel
pm2 logs solana-monitor --lines 100  # 100 dernières lignes
```

### Avec nohup:
```bash
tail -f output.log             # Logs en temps réel
tail -n 100 output.log         # 100 dernières lignes
```

## ⚙️ Paramètres configurables

Dans le fichier `solana_monitor_vps.js`:

```javascript
const CHECK_FREQUENCY = 30;        // Fréquence de vérification (secondes)
const BOLLINGER_PERIOD = 20;       // Période pour les bandes de Bollinger
const BOLLINGER_STD = 2;           // Nombre d'écarts-types
const ALERT_COOLDOWN = 900000;     // Cooldown entre alertes (ms) - 15 min
```

## 🛠️ Dépannage

### Le bot ne démarre pas
```bash
# Vérifier les logs d'erreur
pm2 logs solana-monitor --err
```

### Pas d'alertes Telegram
1. Vérifiez votre Bot Token et Chat ID
2. Testez manuellement avec curl (voir section "Vérification du bot")
3. Vérifiez que le bot n'est pas en cooldown

### Erreur "données insuffisantes"
- Le pool peut ne pas avoir assez d'historique OHLCV
- Essayez un pool différent avec plus de volume
- Vérifiez que le pool existe sur GeckoTerminal

### Consommation mémoire élevée
```bash
# Avec PM2, limiter la mémoire
pm2 start solana_monitor_vps.js --max-memory-restart 200M
```

## 📈 Optimisations pour vacances

Pour un trading plus sûr pendant les vacances:

1. **Augmentez le cooldown**: 30-60 minutes au lieu de 15
   ```javascript
   const ALERT_COOLDOWN = 3600000; // 1 heure
   ```

2. **Ajoutez des filtres RSI**:
   - Modifiez la condition de breakout pour inclure RSI > 70
   - Évite les faux signaux

3. **Notifications par email** (en plus de Telegram):
   - Installez nodemailer: `npm install nodemailer`
   - Ajoutez une fonction d'envoi d'email en plus de Telegram

## 🔒 Sécurité

1. **Ne commitez jamais vos tokens/IDs sur Git**:
   ```bash
   # Créer un fichier .env
   echo "TELEGRAM_BOT_TOKEN=votre_token" > .env
   echo "TELEGRAM_CHAT_ID=votre_id" >> .env
   echo ".env" >> .gitignore
   ```

2. **Permissions du fichier**:
   ```bash
   chmod 600 solana_monitor_vps.js  # Lecture/écriture pour vous uniquement
   ```

3. **Firewall VPS**:
   ```bash
   # Autoriser seulement SSH et fermer le reste
   sudo ufw allow 22
   sudo ufw enable
   ```

## 📞 Support

Pour toute question:
- Vérifiez les logs du bot
- Testez l'API GeckoTerminal manuellement
- Vérifiez que votre VPS a accès à internet

## 📜 Licence

Utilisation personnelle uniquement.
