# 🚀 Solana Bollinger Bands Monitor

Système de surveillance 24/7 des breakouts de Bandes de Bollinger pour les tokens Solana avec alertes Telegram en temps réel.

![Version](https://img.shields.io/badge/version-2.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D14-green)
![License](https://img.shields.io/badge/license-Private-red)

## ✨ Fonctionnalités

- 📊 **Bandes de Bollinger** (20 périodes, 2 écarts-types)
- 📈 **RSI (14)** pour confirmation
- 🕐 **Bougies d'1 heure** (optimisé pour swing trading)
- 🔔 **Alertes Telegram** instantanées
- ⏱️ **Cooldown 15 minutes** entre alertes
- 🖥️ **Version navigateur** avec interface graphique
- 🌐 **Version VPS** pour monitoring 24/7
- 📱 **Multi-tokens** simultanés

## 📁 Structure du projet

```
.
├── solana_monitor_enhanced.html   # Interface web avec UI graphique
├── solana_monitor_vps.js          # Version serveur pour VPS
├── test_vps.js                    # Script de test rapide
├── install_vps.sh                 # Installation automatique VPS
├── start_vps.sh                   # Script de démarrage
├── GUIDE_RAPIDE.md                # Guide rapide en français
├── README_VPS.md                  # Documentation VPS complète
└── .env.example                   # Template de configuration
```

## 🚀 Démarrage rapide

### Version navigateur (interface graphique)

1. Ouvrez `solana_monitor_enhanced.html` dans votre navigateur
2. Configurez vos identifiants Telegram
3. Cliquez sur "Démarrer la surveillance"

### Version VPS (24/7)

```bash
# 1. Cloner le projet
git clone <votre-repo>
cd BotSolana

# 2. Installation automatique
./install_vps.sh

# 3. Démarrer le bot
./start_vps.sh
```

## 📊 Tokens actuellement surveillés

| Token | Symbole | Bougies | Pool |
|-------|---------|---------|------|
| 67 | $67 | 1h | DMAFL613... |
| NEET | $NEET | 1h | 5wNu5Qhd... |
| FRANKLIN | $FRANKLIN | 1h | 8wXzwpLj... |
| WOJAK | $WOJAK | 1h | FDrY5i5k... |
| AVICI | $AVICI | 1h | J7z6TZgW... |
| JELLY | $JELLY | 1h | 3bC2e2Rx... |

## 🔧 Configuration

### Variables d'environnement

```bash
export TELEGRAM_BOT_TOKEN="votre_token"
export TELEGRAM_CHAT_ID="votre_chat_id"
export CHECK_FREQUENCY="30"  # en secondes
```

### Obtenir les identifiants Telegram

1. **Bot Token**: Parlez à [@BotFather](https://t.me/BotFather)
2. **Chat ID**: Parlez à [@userinfobot](https://t.me/userinfobot)

## 📖 Documentation

- [GUIDE_RAPIDE.md](GUIDE_RAPIDE.md) - Guide rapide en français
- [README_VPS.md](README_VPS.md) - Documentation VPS complète

## 🧪 Test

```bash
# Test rapide sans alertes
node test_vps.js
```

## 📱 Format des alertes Telegram

```
🚨 ALERTE BOLLINGER BREAKOUT! 🚨

💰 Token: $EXEMPLE
📈 Prix: $0.123456

📊 Bandes Bollinger (60min):
  • Bande haute: $0.120000
  • Moyenne: $0.100000
  • Bande basse: $0.080000

🔥 Deviation: +2.88% au-dessus

📊 Volume: $123.45K
📈 RSI(14): 75.32

🔗 https://gmgn.ai/sol/token/...

⏰ 21/12/2025 15:30:00
```

## 🛠️ Technologies

- **API**: [GeckoTerminal](https://www.geckoterminal.com/) (gratuit, sans clé)
- **Alertes**: [Telegram Bot API](https://core.telegram.org/bots/api)
- **Serveur**: Node.js (natif, sans dépendances npm)
- **Gestionnaire**: PM2 (optionnel mais recommandé)

## 📈 Stratégie

### Bandes de Bollinger
- **Période**: 20 bougies
- **Écarts-types**: 2σ
- **Signal**: Prix > Bande haute = potentiel breakout

### Interprétation
- ✅ **Breakout confirmé**: Prix > bande haute + RSI > 70
- ⚠️ **Faux signal possible**: Prix > bande haute mais RSI < 70
- 📉 **Pas de signal**: Prix entre les bandes

## 🏖️ Mode vacances

Pour un monitoring plus tranquille:

1. **Augmenter le cooldown** (1h au lieu de 15min)
2. **Ajouter filtre RSI** (seulement si RSI > 70)
3. **Réduire fréquence** (60s au lieu de 30s)

Voir [GUIDE_RAPIDE.md](GUIDE_RAPIDE.md) pour les détails.

## ⚠️ Avertissements

- Les breakouts ne garantissent **pas** une hausse continue
- Utilisez avec votre propre stratégie de trading
- Testez toujours avant de trader réellement
- Ne tradez que ce que vous pouvez vous permettre de perdre

## 🤝 Contribution

Projet personnel - Utilisation privée uniquement

## 📝 Changelog

### v2.0 (2025-12-21)
- ✅ Passage aux bougies d'1 heure
- ✅ Version VPS pour monitoring 24/7
- ✅ Scripts d'installation automatique
- ✅ Support multi-tokens amélioré

### v1.0 (2025-12-20)
- ✅ Version initiale avec bougies 15min
- ✅ Interface web graphique
- ✅ Alertes Telegram

## 📞 Support

Consultez les logs:
```bash
pm2 logs solana-bb
```

Vérifiez l'API:
```bash
node test_vps.js
```

---

**Bon monitoring! 📊🚀**
