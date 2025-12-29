# 🚀 Solana Bollinger Bands Monitor

Bot de surveillance 24/7 des tokens Solana avec stratégie Bollinger Bands et alertes Telegram.

## ✨ Fonctionnalités

- 📊 **Bandes de Bollinger** (20 périodes, 2 écarts-types)
- 📈 **RSI (14)** pour confirmation
- 🕐 **Bougies de 15 minutes**
- 🔔 **Alertes Telegram** instantanées
- ⏱️ **Cooldown 15 minutes** entre alertes
- 🖥️ **Version navigateur** avec interface graphique
- 🌐 **Version VPS** pour monitoring 24/7 (actuellement déployée)

## 📁 Fichiers

```
.
├── solana_monitor_enhanced.html   # Interface web avec UI graphique
├── solana_monitor_vps.js          # Version serveur Node.js (sur VPS)
├── test_vps.js                    # Script de test rapide
└── .env.example                   # Template de configuration
```

## 📊 Tokens surveillés

| Token | Symbole | Bougies |
|-------|---------|---------|
| 67 | $67 | 15min |
| CARDS | $CARDS | 15min |
| SPSC | $SPSC | 15min |
| SNOWBALL | $SNOWBALL | 15min |
| FKH | $FKH | 15min |
| WHITEWHALE | $WHITEWHALE | 15min |

## 🚀 Utilisation

### Version navigateur (local)

Ouvrez `solana_monitor_enhanced.html` dans votre navigateur.

### Version VPS (production)

```bash
# Sur le VPS (déjà configuré)
ssh root@185.182.184.62

# Voir les logs
pm2 logs solana-bb

# Statut
pm2 status

# Redémarrer
pm2 restart solana-bb
```

## 🔧 Configuration

### Variables d'environnement

```bash
TELEGRAM_BOT_TOKEN="votre_token"
TELEGRAM_CHAT_ID="votre_chat_id"
CHECK_FREQUENCY="30"  # secondes
```

### Obtenir les identifiants Telegram

1. **Bot Token**: [@BotFather](https://t.me/BotFather)
2. **Chat ID**: [@userinfobot](https://t.me/userinfobot)

## 🧪 Test

```bash
node test_vps.js
```

## 🛠️ Stack Technique

- **API**: [GeckoTerminal](https://www.geckoterminal.com/) (gratuit)
- **Alertes**: Telegram Bot API
- **Runtime**: Node.js v18 (natif, sans dépendances npm)
- **Process Manager**: PM2
- **VPS**: Contabo (Ubuntu 24.04)

## 📈 Stratégie

- **Signal d'achat**: Prix franchit la bande de Bollinger supérieure
- **Période**: 20 bougies de 15 minutes
- **Écarts-types**: 2σ (95% de probabilité)
- **Confirmation**: RSI calculé mais non filtrant actuellement

## ⚠️ Disclaimer

Les breakouts ne garantissent pas de hausse. Trading à vos risques et périls.

---

**Bot opérationnel sur VPS 24/7** 🚀
