# 🚀 Guide Rapide - Surveillance Solana Bollinger Bands

## ✅ Ce qui a été fait

### 1. **Passage aux bougies d'1 heure**
- Tous les tokens utilisent maintenant des bougies de 60 minutes (1h)
- L'API utilise automatiquement l'endpoint `/ohlcv/hour` au lieu de `/minute`
- Plus adapté pour un monitoring de vacances (moins de faux signaux)

### 2. **Version VPS pour fonctionnement 24/7**
- Nouveau fichier: `solana_monitor_vps.js`
- Fonctionne avec Node.js sans navigateur
- Pas de dépendances externes à installer
- Peut tourner en arrière-plan pendant vos vacances

## 📁 Fichiers du projet

1. **[solana_monitor_enhanced.html](solana_monitor_enhanced.html)** - Version navigateur avec interface graphique
2. **[solana_monitor_vps.js](solana_monitor_vps.js)** - Version serveur VPS (nouveau!)
3. **[README_VPS.md](README_VPS.md)** - Instructions détaillées de déploiement VPS

## 🎯 Pour déployer sur VPS

### Option 1: Déploiement rapide avec PM2 (recommandé)

```bash
# Sur votre VPS
cd ~
mkdir solana-monitor
cd solana-monitor

# Copier le fichier (depuis votre ordinateur)
scp solana_monitor_vps.js utilisateur@ip_vps:~/solana-monitor/

# Sur le VPS
chmod +x solana_monitor_vps.js

# Installer PM2
sudo npm install -g pm2

# Configurer les variables (utilisez vos propres valeurs!)
export TELEGRAM_BOT_TOKEN="***REDACTED***"
export TELEGRAM_CHAT_ID="1155086635"
export CHECK_FREQUENCY="30"

# Lancer le bot
pm2 start solana_monitor_vps.js --name "solana-bb"

# Configurer le démarrage automatique
pm2 startup
pm2 save

# Voir les logs
pm2 logs solana-bb
```

### Option 2: Lancement simple avec Screen

```bash
# Créer une session screen
screen -S solana

# Lancer le bot
node solana_monitor_vps.js

# Détacher: Ctrl+A puis D
# Rattacher: screen -r solana
```

## 📊 Configuration actuelle

### Tokens surveillés
1. **$67** - Bougies 1h
2. **$NEET** - Bougies 1h (⚠️ peut avoir des problèmes de données)
3. **$FRANKLIN** - Bougies 1h
4. **$WOJAK** - Bougies 1h
5. **$AVICI** - Bougies 1h
6. **$JELLY** - Bougies 1h

### Paramètres
- **Fréquence de vérification**: 30 secondes (configurable)
- **Bandes de Bollinger**: 20 périodes, 2 écarts-types
- **Cooldown alertes**: 15 minutes entre chaque alerte pour un même token
- **RSI**: Calculé sur 14 périodes

## 🔧 Modifier les tokens

Éditez le fichier `solana_monitor_vps.js`, section `TOKENS`:

```javascript
const TOKENS = [
    {
        name: "NOM",
        symbol: "$SYMBOL",
        address: "adresse_token_solana",
        pool: "pool_id_geckoterminal",
        candle_interval: 60  // 60 = 1 heure
    },
    // ... autres tokens
];
```

### Trouver un bon pool:
1. Allez sur [GeckoTerminal](https://www.geckoterminal.com/)
2. Cherchez votre token
3. Choisissez le pool avec le **volume le plus élevé**
4. Copiez l'ID du pool depuis l'URL

## 📱 Configuration Telegram

### Vos informations actuelles:
- **Bot Token**: `***REDACTED***`
- **Chat ID**: `1155086635`

### Tester le bot:
```bash
curl -X POST "https://api.telegram.org/bot***REDACTED***/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id":"1155086635","text":"✅ Test VPS"}'
```

## 🏖️ Optimisations pour les vacances

### 1. Augmenter le cooldown (éviter trop d'alertes)

Dans `solana_monitor_vps.js`, ligne 65:
```javascript
const ALERT_COOLDOWN = 3600000; // 1 heure au lieu de 15 min
```

### 2. Ajouter un filtre RSI (éviter les faux breakouts)

Dans la fonction `checkToken`, autour de la ligne 265, remplacez:
```javascript
if (currentPrice >= bands.upper) {
```

Par:
```javascript
if (currentPrice >= bands.upper && rsi && rsi > 70) {
```

Cela n'enverra des alertes QUE si le prix dépasse la bande haute ET que le RSI est surachat (>70).

### 3. Réduire la fréquence de vérification

Pour économiser les ressources:
```bash
export CHECK_FREQUENCY="60"  # Vérifier toutes les 60 secondes au lieu de 30
```

## 📊 Commandes utiles PM2

```bash
pm2 status              # Voir si le bot tourne
pm2 logs solana-bb      # Voir les logs en direct
pm2 restart solana-bb   # Redémarrer
pm2 stop solana-bb      # Arrêter
pm2 delete solana-bb    # Supprimer complètement
pm2 monit               # Interface de monitoring
```

## ❓ Problèmes fréquents

### "Données insuffisantes"
- Le pool n'a pas assez d'historique
- Solution: Changer de pool (choisir un avec plus de volume)

### "Pas d'alertes"
1. Vérifiez que le bot tourne: `pm2 status`
2. Vérifiez les logs: `pm2 logs solana-bb`
3. Testez Telegram avec la commande curl ci-dessus
4. Vérifiez que le prix dépasse réellement la bande haute

### Bot s'arrête tout seul
- Utilisez PM2 au lieu de lancer directement avec `node`
- PM2 redémarre automatiquement en cas de crash

## 🎓 Comprendre les alertes

Une alerte Bollinger Breakout signifie:
- Le prix a **dépassé** la bande haute de Bollinger
- Statistiquement, c'est rare (2 écarts-types)
- Peut indiquer un mouvement fort à la hausse
- Mais attention: peut aussi être un "bull trap"

## 📞 Support

Pour plus de détails, consultez:
- [README_VPS.md](README_VPS.md) - Guide complet de déploiement
- Logs du bot: `pm2 logs solana-bb`

---

**Bon monitoring et bonnes vacances! 🏖️**
