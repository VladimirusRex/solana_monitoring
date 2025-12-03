# 🚀 Bot d'Alertes Bollinger pour Tokens Solana

Script Python qui surveille les tokens Solana et envoie des alertes Telegram quand le prix dépasse la bande de Bollinger supérieure.

## 📋 Prérequis

- Python 3.8 ou supérieur
- Un compte Telegram
- Un bot Telegram (gratuit)

## 🔧 Installation

1. **Cloner ou télécharger les fichiers**

2. **Installer les dépendances Python**
```bash
pip install -r requirements.txt
```

## 🤖 Configuration du Bot Telegram

### Étape 1 : Créer un bot Telegram
1. Ouvrez Telegram et cherchez **@BotFather**
2. Envoyez `/newbot`
3. Choisissez un nom pour votre bot
4. Choisissez un username (doit finir par "bot")
5. **Copiez le token** que BotFather vous donne (ex: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Étape 2 : Obtenir votre Chat ID
1. Cherchez **@userinfobot** sur Telegram
2. Envoyez `/start`
3. Le bot vous donnera votre **Chat ID** (ex: `123456789`)

### Étape 3 : Configurer le script
Ouvrez `solana_bollinger_alert.py` et modifiez ces lignes :

```python
TELEGRAM_BOT_TOKEN = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz"  # Votre token
TELEGRAM_CHAT_ID = "123456789"                                 # Votre chat ID
```

## ⚙️ Configuration du Token à Surveiller

### Trouver l'adresse d'un token Solana

1. Allez sur [DexScreener](https://dexscreener.com/)
2. Cherchez votre token (ex: "Bonk", "WIF", etc.)
3. Copiez l'adresse du contrat (Contract Address)

### Exemples d'adresses :
- **Bonk**: `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263`
- **WIF**: `EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm`

Modifiez cette ligne dans le script :
```python
TOKEN_ADDRESS = "ADRESSE_DU_TOKEN_ICI"
```

## 🎛️ Paramètres Personnalisables

Dans le script, vous pouvez ajuster :

```python
# Paramètres des bandes de Bollinger
BOLLINGER_PERIOD = 20  # Période pour la moyenne mobile (défaut: 20)
BOLLINGER_STD = 2      # Écarts-types (défaut: 2)

# Timeframe pour l'analyse
TIMEFRAME = 15         # Minutes (défaut: 15)

# Fréquence de vérification
CHECK_INTERVAL = 60    # Secondes entre chaque vérification
```

### Explications :
- **BOLLINGER_PERIOD** : Nombre de bougies pour calculer la moyenne
- **BOLLINGER_STD** : Sensibilité des bandes (2 = standard, 3 = moins d'alertes)
- **TIMEFRAME** : Période d'analyse (5, 15, 30 minutes...)
- **CHECK_INTERVAL** : Fréquence de vérification (60 sec = 1 minute)

## 🚀 Lancement

```bash
python solana_bollinger_alert.py
```

Vous verrez :
```
============================================================
🚀 SURVEILLANCE DES TOKENS SOLANA - BANDES DE BOLLINGER
============================================================

📊 Configuration:
  • Token: DezX...
  • Timeframe: 15 minutes
  • Période Bollinger: 20
  • Écart-type: 2
  • Intervalle de vérification: 60 secondes

============================================================

🔄 Démarrage de la surveillance...

[2025-01-15 14:23:45]
Prix actuel: $0.00002341
Bande haute: $0.00002398
Moyenne:     $0.00002321
Bande basse: $0.00002244
Distance de la bande haute: 2.43%
```

## 📱 Format des Alertes Telegram

Quand un breakout est détecté, vous recevrez :

```
🚨 ALERTE BOLLINGER BREAKOUT! 🚨

💰 Token: BONK
📈 Prix actuel: $0.00002456

📊 Bandes de Bollinger (15min):
  • Bande haute: $0.00002398
  • Moyenne: $0.00002321
  • Bande basse: $0.00002244

🔥 Déviation: +2.42% au-dessus de la bande haute

🔗 Voir sur DexScreener
⏰ 2025-01-15 14:25:30
```

## 📊 Comment fonctionnent les Bandes de Bollinger ?

Les bandes de Bollinger sont composées de :
- **Bande supérieure** : Moyenne + (2 × écart-type)
- **Moyenne mobile** : Moyenne des X derniers prix
- **Bande inférieure** : Moyenne - (2 × écart-type)

**Signal haussier** : Prix > Bande supérieure = Momentum fort, potentiel de continuation ou surachat

## 🔄 Utilisation avec GMGN (alternative)

Le script inclut aussi une fonction pour GMGN. Pour l'utiliser, modifiez la fonction `main()` :

```python
# Remplacer cette ligne :
token_data = get_dexscreener_data(TOKEN_ADDRESS)

# Par celle-ci :
token_data = get_gmgn_data(TOKEN_ADDRESS)
```

**Note** : GMGN peut avoir des limitations de taux différentes.

## ⚠️ Conseils Importants

1. **Période de collecte** : Le script a besoin de collecter au moins 20 prix avant de pouvoir calculer les bandes de Bollinger
   
2. **Cooldown** : Par défaut, 5 minutes entre chaque alerte pour éviter le spam

3. **Surveillance continue** : Laissez le script tourner en continu pour une surveillance 24/7

4. **VPS recommandé** : Pour une surveillance permanente, utilisez un VPS ou serveur cloud

## 🛠️ Lancer en arrière-plan (Linux/Mac)

```bash
# Avec nohup
nohup python solana_bollinger_alert.py > output.log 2>&1 &

# Avec screen
screen -S bollinger
python solana_bollinger_alert.py
# Ctrl+A puis D pour détacher
```

## 🐛 Dépannage

### "Erreur lors de la récupération des données"
- Vérifiez votre connexion internet
- L'adresse du token est peut-être incorrecte
- L'API peut être temporairement indisponible

### "Erreur lors de l'envoi du message Telegram"
- Vérifiez votre token et chat_id
- Assurez-vous d'avoir démarré une conversation avec votre bot
- Envoyez `/start` à votre bot sur Telegram

### Les bandes ne s'affichent pas
- Le script collecte encore des données (attendez 20 vérifications minimum)

## 📈 Améliorations Possibles

- Surveiller plusieurs tokens simultanément
- Ajouter des alertes pour la bande inférieure (signal baissier)
- Intégrer d'autres indicateurs (RSI, MACD)
- Ajouter des graphiques
- Enregistrer l'historique dans une base de données

## ⚖️ Disclaimer

Ce script est fourni à titre éducatif. Le trading de crypto-monnaies comporte des risques. Ne tradez que ce que vous pouvez vous permettre de perdre.

## 📝 License

MIT - Libre d'utilisation et de modification

---

**Bon trading ! 🚀📈**
