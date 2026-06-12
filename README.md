# 🚀 Solana Bollinger Bands Monitor

Bot de surveillance 24/7 de memecoins Solana : détection de breakouts Bollinger + alertes Telegram instantanées. En production sur VPS depuis janvier 2026.

## ✨ Fonctionnalités

- 📊 **Bandes de Bollinger** (20 périodes, 2 écarts-types) calculées sur bougies 15min en SOL
- 📈 **SuperTrend** (10, 3) affiché dans chaque alerte
- 🎯 **Double détection** : close OU high de bougie au-dessus de la bande haute (capte les wicks)
- 🔔 **Alertes Telegram** fiabilisées : timeout 10s, 4 tentatives avec backoff, cooldown posé seulement après envoi confirmé
- ⏱️ **Cooldown 15min** par token, **persisté sur disque** — survit aux redémarrages PM2
- 🛡️ **Architecture "zéro-429"** : un seul cycle API toutes les 2min + throttle adaptatif qui s'auto-régule sous le rate limit de GeckoTerminal

## 🏗️ Architecture

```
┌─ cycle (2min) ──────────────────────────────────────┐
│  refreshAllCandles()        ← SEULE source d'appels │
│   ├─ throttle adaptatif     (backoff sur 429,       │
│   │                          accélère sur succès)   │
│   └─ retry en boucle        (aucun token abandonné) │
│  performCheck()             ← lecture cache, 0 appel│
│   ├─ Bollinger + SuperTrend                         │
│   ├─ détection breakout (close/high)                │
│   └─ alerte Telegram (retry + cooldown persisté)    │
└──────────────────────────────────────────────────────┘
```

Principes clés :
- **Une seule source d'appels API** : le check de détection lit un cache local, zéro requête réseau
- **Throttle adaptatif** : l'intervalle entre appels (plancher 7s) double sur 429 (ou respecte `Retry-After`), redescend de 5 % par succès — le bot trouve seul le débit max supportable
- **Données périmées = alertes suspendues** : si un token n'a pas été rafraîchi depuis 5min, warning Telegram au lieu de signaux sur données mortes
- **État persistant** : cooldowns (`alert_state.json`) et pools (`pools.json`) rechargés au boot

## 📁 Fichiers

```
.
├── solana_monitor_vps.js          # Bot principal (Node.js natif, zéro dépendance npm)
├── solana_monitor_enhanced.html   # Dashboard navigateur (legacy)
├── test_vps.js                    # Script de test (legacy)
└── .env.example                   # Template de configuration
```

## 📊 Tokens surveillés

La liste tourne en permanence (memecoins → rotation hebdomadaire voire quotidienne). La liste à jour vit dans le tableau `TOKENS` de [`solana_monitor_vps.js`](solana_monitor_vps.js) — chaque token est mappé sur sa pool au plus gros volume 24h, **quotée en SOL uniquement** (une pool USDC fausserait le calcul des bandes).

## 🚀 Utilisation

```bash
# Configuration (voir .env.example)
export TELEGRAM_BOT_TOKEN="votre_token"   # via @BotFather
export TELEGRAM_CHAT_ID="votre_chat_id"   # via @userinfobot

# Lancement
node solana_monitor_vps.js

# En production (PM2)
pm2 start solana_monitor_vps.js --name solana-bb
pm2 logs solana-bb
```

## 🛠️ Stack technique

- **API** : [GeckoTerminal](https://www.geckoterminal.com/) (free tier, ~30 req/min)
- **Alertes** : Telegram Bot API
- **Runtime** : Node.js (natif — `https`, `fs`, zéro dépendance npm)
- **Process manager** : PM2
- **VPS** : Contabo (Ubuntu 24.04)

## 📈 Stratégie

- **Signal** : le prix franchit la bande de Bollinger supérieure (close ou wick)
- **Période** : 20 bougies de 15 minutes, 2σ
- **Usage** : signal d'entrée/sortie pour positions LP (Meteora DLMM) sur memecoins

## ⚠️ Disclaimer

Les breakouts ne garantissent pas de hausse. Trading à vos risques et périls.

---

**Bot opérationnel sur VPS 24/7 depuis janvier 2026** 🚀
