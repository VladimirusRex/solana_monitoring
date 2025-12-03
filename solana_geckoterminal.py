#!/usr/bin/env python3
"""
Script de surveillance avec GeckoTerminal API
100% GRATUIT - Aucune clé API nécessaire
Utilise le PRIX EN TEMPS RÉEL + bougies OHLCV pour Bollinger
Surveille: 67, FWOG, UMBRA, WOJAK, AVICI, SPSC, KABUTO
"""

import requests
import pandas as pd
import numpy as np
import time
from datetime import datetime, timedelta
import json
import os
from dotenv import load_dotenv

# Charger les variables d'environnement depuis .env
load_dotenv()

# ============= CONFIGURATION =============
# Charger les clés Telegram depuis les variables d'environnement
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

# Vérifier que les clés Telegram sont présentes
if not all([TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID]):
    raise ValueError("❌ Erreur: Fichier .env manquant ou incomplet. Créez un fichier .env avec vos clés Telegram (voir .env.example)")

# Tokens Solana à surveiller
TOKENS = [
    {
        "name": "67",
        "symbol": "$67",
        "address": "9AvytnUKsLxPxFHFqS6VLxaxt5p6BhYNr53SD2Chpump",
        "pool": "DMAFL613XTipuA3jFNYczavWT7XsiYf9cR3qmRMZQhB6",  # Pool avec la plus grosse TVL (~746k$)
        "candle_interval": 15  # Bougies de 15 minutes
    },
    {
        "name": "FWOG",
        "symbol": "$FWOG",
        "address": "A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump",
        "pool": "AB1eu2L1Jr3nfEft85AuD2zGksUbam1Kr8MR3uM2sjwt",  # Pool avec la plus grosse TVL (~2.88M$)
        "candle_interval": 15  # Bougies de 15 minutes
    },
    {
        "name": "UMBRA",
        "symbol": "$UMBRA",
        "address": "PRVT6TB7uss3FrUd2D9xs2zqDBsa3GbMJMwCQsgmeta",
        "pool": "7dVri3qjYD3uobSZL3Zth8vSCgU6r6R2nvFsh7uVfDte",  # Pool avec la plus grosse TVL (~2.87M$)
        "candle_interval": 15  # Bougies de 15 minutes
    },
    {
        "name": "WOJAK",
        "symbol": "$WOJAK",
        "address": "8J69rbLTzWWgUJziFY8jeu5tDwEPBwUz4pKBMr5rpump",
        "pool": "FDrY5i5kuadZ1ik8gPS26qjj9Rw9mpufXMegGC2HNSP7",  # Pool avec la plus grosse TVL (~483k$)
        "candle_interval": 15  # Bougies de 15 minutes
    },
    {
        "name": "AVICI",
        "symbol": "$AVICI",
        "address": "BANKJmvhT8tiJRsBSS1n2HryMBPvT5Ze4HU95DUAmeta",
        "pool": "5gB4NPgFB3MHFHSeKN4sbaY6t9MB8ikCe9HyiKYid4Td",  # Pool avec la plus grosse TVL (~1.97M$)
        "candle_interval": 15  # Bougies de 15 minutes
    },
    {
        "name": "SPSC",
        "symbol": "$SPSC",
        "address": "4nswj3o1Lo9iWYvvRJxUD8vbCy9ay7QQoXYcncHNbonk",
        "pool": "GcbZqAaWWmCse1Q68sfd5Sh32ZuHWPugq1NYowQuc5k1",  # Pool avec la plus grosse TVL (~517k$ - Meteora)
        "candle_interval": 15  # Bougies de 15 minutes
    },
    {
        "name": "KABUTO",
        "symbol": "$KABUTO",
        "address": "A9E2AopuG56LWYiXsvGLLTcLjUjQ539PY6k5Fhfepump",
        "pool": "7dZ9VfMUX8eprV3MmieSWvdfo1cdVn58QE5GqPZKenwp",  # Pool avec la plus grosse TVL (~559k$)
        "candle_interval": 15  # Bougies de 15 minutes
    },
]

# Paramètres des bandes de Bollinger
BOLLINGER_PERIOD = 20  # Nombre de périodes pour la moyenne mobile
BOLLINGER_STD = 2      # Nombre d'écarts-types

# Paramètres du RSI (Relative Strength Index)
RSI_PERIOD = 2         # Période du RSI (2 = très réactif)
RSI_THRESHOLD = 90     # Seuil de surachat (>90 = zone extrême)

# Timeframe des bougies (en minutes)
CANDLE_INTERVAL = 15  # Bougies de 15 minutes

# Fréquence des vérifications (en secondes)
CHECK_FREQUENCY = 30  # Check toutes les 30 secondes

# Cooldown pour les alertes (en secondes)
ALERT_COOLDOWN = 900  # 15 minutes (cohérent avec les bougies de 15min)

# ============= FONCTIONS =============

def get_geckoterminal_ohlcv(pool_address, aggregate=5, limit=25):
    """
    Récupère les bougies OHLCV depuis GeckoTerminal API
    100% GRATUIT - Aucune clé API nécessaire
    """
    try:
        url = f"https://api.geckoterminal.com/api/v2/networks/solana/pools/{pool_address}/ohlcv/minute"

        headers = {
            "Accept": "application/json"
        }

        params = {
            "aggregate": aggregate,
            "limit": limit,
            "currency": "usd"
        }

        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if data.get("data") and data["data"].get("attributes"):
            ohlcv_list = data["data"]["attributes"]["ohlcv_list"]
            # Format: [[timestamp, open, high, low, close, volume], ...]
            candles = []
            for candle in ohlcv_list:
                candles.append({
                    "timestamp": candle[0],
                    "open": float(candle[1]),
                    "high": float(candle[2]),
                    "low": float(candle[3]),
                    "close": float(candle[4]),
                    "volume": float(candle[5])
                })
            return candles

        return None
    except Exception as e:
        print(f"❌ Erreur GeckoTerminal API: {e}")
        return None

def get_geckoterminal_realtime_price(pool_address):
    """
    Récupère le prix EN TEMPS RÉEL depuis GeckoTerminal API
    Correspond exactement au prix affiché sur le site web
    """
    try:
        url = f"https://api.geckoterminal.com/api/v2/networks/solana/pools/{pool_address}"

        headers = {
            "Accept": "application/json"
        }

        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        if data.get("data") and data["data"].get("attributes"):
            # Prix actuel en USD
            price_usd = data["data"]["attributes"].get("base_token_price_usd")
            if price_usd:
                return float(price_usd)

        return None
    except Exception as e:
        print(f"❌ Erreur prix temps réel: {e}")
        return None

def calculate_bollinger_bands(prices, period=20, std_dev=2):
    """Calcule les bandes de Bollinger"""
    if len(prices) < period:
        return None, None, None

    df = pd.DataFrame({'price': prices})
    df['sma'] = df['price'].rolling(window=period).mean()
    df['std'] = df['price'].rolling(window=period).std()
    df['upper_band'] = df['sma'] + (std_dev * df['std'])
    df['lower_band'] = df['sma'] - (std_dev * df['std'])

    last_row = df.iloc[-1]
    return last_row['upper_band'], last_row['sma'], last_row['lower_band']

def calculate_rsi(prices, period=2):
    """Calcule le RSI (Relative Strength Index)

    RSI = 100 - (100 / (1 + RS))
    où RS = Moyenne des gains / Moyenne des pertes

    Args:
        prices: Liste des prix de clôture
        period: Période du RSI (défaut: 2 pour RSI très réactif)

    Returns:
        Valeur du RSI entre 0 et 100, ou None si pas assez de données
    """
    if len(prices) < period + 1:
        return None

    df = pd.DataFrame({'price': prices})

    # Calculer les variations de prix
    df['change'] = df['price'].diff()

    # Séparer gains et pertes
    df['gain'] = df['change'].apply(lambda x: x if x > 0 else 0)
    df['loss'] = df['change'].apply(lambda x: abs(x) if x < 0 else 0)

    # Moyenne des gains et pertes sur la période
    avg_gain = df['gain'].rolling(window=period).mean()
    avg_loss = df['loss'].rolling(window=period).mean()

    # Calculer RS et RSI
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))

    # Retourner le dernier RSI
    last_rsi = rsi.iloc[-1]

    # Gérer le cas où avg_loss = 0 (tous des gains)
    if pd.isna(last_rsi):
        return 100.0

    return last_rsi

def send_telegram_message(message):
    """Envoie un message sur Telegram"""
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        data = {
            'chat_id': TELEGRAM_CHAT_ID,
            'text': message,
            'parse_mode': 'HTML'
        }
        response = requests.post(url, data=data)
        response.raise_for_status()
        return True
    except Exception as e:
        print(f"❌ Erreur Telegram: {e}")
        return False

def format_price(price):
    """Formate le prix pour l'affichage"""
    if price is None:
        return "N/A"
    if price < 0.000001:
        return f"${price:.10f}"
    elif price < 0.01:
        return f"${price:.8f}"
    elif price < 1:
        return f"${price:.6f}"
    else:
        return f"${price:.2f}"

class TokenMonitor:
    def __init__(self, token_name, token_symbol, token_address, pool_address, candle_interval):
        self.token_name = token_name
        self.token_symbol = token_symbol
        self.token_address = token_address
        self.pool_address = pool_address
        self.candle_interval = candle_interval
        self.last_alert_time = 0

    def check_bollinger_breakout(self, candles, realtime_price=None):
        """Vérifie si le prix dépasse la bande de Bollinger supérieure

        Args:
            candles: Bougies OHLCV pour calculer les Bollinger Bands
            realtime_price: Prix en temps réel (si None, utilise le close de la dernière bougie)
        """
        if not candles or len(candles) < BOLLINGER_PERIOD:
            return False, {
                'current_price': realtime_price if realtime_price else (candles[-1]['close'] if candles else None),
                'upper_band': None,
                'middle_band': None,
                'lower_band': None,
                'volume': candles[-1]['volume'] if candles else 0,
                'candle_count': len(candles) if candles else 0
            }

        # Extraire les prix de clôture pour calculer Bollinger
        close_prices = [c["close"] for c in candles]

        # Utiliser le prix en temps réel si disponible, sinon le close de la dernière bougie
        current_price = realtime_price if realtime_price is not None else close_prices[-1]

        upper_band, middle_band, lower_band = calculate_bollinger_bands(
            close_prices,
            period=BOLLINGER_PERIOD,
            std_dev=BOLLINGER_STD
        )

        info = {
            'current_price': current_price,
            'upper_band': upper_band,
            'middle_band': middle_band,
            'lower_band': lower_band,
            'volume': candles[-1]['volume'],
            'candle_count': len(candles)
        }

        if upper_band is None:
            return False, info

        # Vérifier si le prix touche ou dépasse la bande supérieure
        if current_price >= upper_band:
            # Vérifier le cooldown
            if time.time() - self.last_alert_time > ALERT_COOLDOWN:
                self.last_alert_time = time.time()
                info['deviation'] = ((current_price - upper_band) / upper_band) * 100
                return True, info

        return False, info

def wait_for_next_check():
    """Attend CHECK_FREQUENCY secondes avant la prochaine vérification"""
    next_check = datetime.now() + timedelta(seconds=CHECK_FREQUENCY)
    print(f"\n⏳ Prochaine vérification à {next_check.strftime('%H:%M:%S')} (dans {CHECK_FREQUENCY} secondes)")
    time.sleep(CHECK_FREQUENCY)

def main():
    """Fonction principale"""
    print("=" * 80)
    print("🚀 SURVEILLANCE MULTI-TOKENS - GECKOTERMINAL (100% GRATUIT)")
    print("=" * 80)
    print(f"\n📊 Configuration:")
    print(f"  • Source: GeckoTerminal API (AUCUNE clé nécessaire)")
    print(f"  • Tokens surveillés: {len(TOKENS)}")
    for token in TOKENS:
        print(f"    - {token['symbol']} ({token['name']}) - Bougies {token['candle_interval']}min")
    print(f"  ⚡ Prix: TEMPS RÉEL (identique au site web)")
    print(f"  ⚡ Checks: Toutes les {CHECK_FREQUENCY} secondes")
    print(f"  📊 Bollinger: BB({BOLLINGER_PERIOD},{BOLLINGER_STD})")
    print(f"  🔔 Cooldown alertes: {ALERT_COOLDOWN//60} minutes")
    print("\n" + "=" * 80)

    # Créer un moniteur pour chaque token
    monitors = {}
    for token in TOKENS:
        monitors[token['name']] = TokenMonitor(
            token['name'],
            token['symbol'],
            token['address'],
            token['pool'],
            token['candle_interval']
        )

    print("\n🔄 Démarrage de la surveillance (ACTIF IMMÉDIATEMENT)...\n")

    check_count = 0

    while True:
        try:
            check_count += 1
            now = datetime.now()
            print(f"\n{'='*80}")
            print(f"🕐 VÉRIFICATION #{check_count} - {now.strftime('%H:%M:%S')}")
            print(f"{'='*80}\n")

            # Vérifier chaque token
            for token in TOKENS:
                monitor = monitors[token['name']]

                # Récupérer le prix EN TEMPS RÉEL
                realtime_price = get_geckoterminal_realtime_price(token['pool'])

                # Récupérer les bougies OHLCV pour calculer Bollinger (utilise l'intervalle spécifique au token)
                candles = get_geckoterminal_ohlcv(token['pool'], aggregate=token['candle_interval'], limit=25)

                if candles:
                    # Vérifier le breakout avec le prix temps réel
                    is_breakout, info = monitor.check_bollinger_breakout(candles, realtime_price)

                    if is_breakout:
                        message = f"""
🚨 <b>ALERTE BOLLINGER BREAKOUT!</b> 🚨

💰 <b>Token:</b> {token['symbol']}
📈 <b>Prix:</b> {format_price(info['current_price'])}

📊 <b>Bandes Bollinger ({token['candle_interval']}min):</b>
  • Bande haute: {format_price(info['upper_band'])}
  • Moyenne: {format_price(info['middle_band'])}
  • Bande basse: {format_price(info['lower_band'])}

🔥 <b>Deviation:</b> +{info['deviation']:.2f}% au-dessus

📊 <b>Volume:</b> ${info['volume']:,.0f}

🔗 <a href="https://gmgn.ai/sol/token/{token['address']}">Voir sur GMGN</a>

⏰ {datetime.now().strftime('%H:%M:%S')}
"""
                        send_telegram_message(message)
                        print(f"🚨 BREAKOUT pour {token['symbol']}! Alerte envoyée.")

                    # Affichage dans le terminal
                    price_source = "⚡ TEMPS RÉEL" if realtime_price else "📈 Close"
                    if info['candle_count'] < BOLLINGER_PERIOD:
                        print(f"📊 {token['symbol']:12s} | Prix: {format_price(info['current_price']):15s} ({price_source}) | Données: {info['candle_count']}/{BOLLINGER_PERIOD} bougies")
                    else:
                        distance = ((info['upper_band'] - info['current_price']) / info['current_price'] * 100)
                        status = "🔥 BREAKOUT" if is_breakout else "✅ Normal"
                        print(f"📊 {token['symbol']:12s} | Prix: {format_price(info['current_price']):15s} ({price_source}) | Bande haute: {format_price(info['upper_band']):15s} | Distance: {distance:+6.2f}% | {status}")
                        print(f"   📊 Volume: ${info['volume']:,.0f}")
                else:
                    print(f"❌ {token['symbol']:12s} | Impossible de récupérer les données GeckoTerminal")

            # Message après la première vérification
            if check_count == 1:
                print("\n✅ Première vérification terminée - Bot ULTRA-RÉACTIF opérationnel!")
                print(f"⚡ Prix EN TEMPS RÉEL + Bougies de {CANDLE_INTERVAL} minutes pour Bollinger")
                print(f"⚡ Checks toutes les {CHECK_FREQUENCY} secondes pour {len(TOKENS)} tokens")
                print("📈 Prix identique à GeckoTerminal - Notification instantanée des breakouts!")
                print("💰 100% GRATUIT - Aucune limite de quota")

            # Attendre la prochaine vérification
            wait_for_next_check()

        except KeyboardInterrupt:
            print("\n\n👋 Arrêt de la surveillance...")
            break
        except Exception as e:
            print(f"\n❌ Erreur: {e}")
            import traceback
            traceback.print_exc()
            # Attendre 1 minute avant de réessayer
            time.sleep(60)

if __name__ == "__main__":
    main()
