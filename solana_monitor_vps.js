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
        name: "67",
        symbol: "$67",
        address: "9AvytnUKsLxPxFHFqS6VLxaxt5p6BhYNr53SD2Chpump",
        pool: "DMAFL613XTipuA3jFNYczavWT7XsiYf9cR3qmRMZQhB6",
        candle_interval: 60
    },
    {
        name: "NEET",
        symbol: "$NEET",
        address: "Ce2gx9KGXJ6C9Mp5b5x1sn9Mg87JwEbrQby4Zqo3pump",
        pool: "5wNu5QhdpRGrL37ffcd6TMMqZugQgxwafgz477rShtHy",
        candle_interval: 60
    },
    {
        name: "FRANKLIN",
        symbol: "$FRANKLIN",
        address: "CSrwNk6B1DwWCHRMsaoDVUfD5bBMQCJPY72ZG3Nnpump",
        pool: "8wXzwpLjk6QJMYYC1VHueNnxRVW2nFGvQjgEnV4Mv8sY",
        candle_interval: 60
    },
    {
        name: "WOJAK",
        symbol: "$WOJAK",
        address: "8J69rbLTzWWgUJziFY8jeu5tDwEPBwUz4pKBMr5rpump",
        pool: "FDrY5i5kuadZ1ik8gPS26qjj9Rw9mpufXMegGC2HNSP7",
        candle_interval: 60
    },
    {
        name: "AVICI",
        symbol: "$AVICI",
        address: "BANKJmvhT8tiJRsBSS1n2HryMBPvT5Ze4HU95DUAmeta",
        pool: "J7z6TZgWecZughSLJ41FsttUBTjH5oX3CQ5ZmD182BpD",
        candle_interval: 60
    },
    {
        name: "JELLYJELLY",
        symbol: "$JELLY",
        address: "FeR8VBqNRSUD5NtXAj2n3j1dAHkZHfyDktKuLXD4pump",
        pool: "3bC2e2RxcfvF9oP22LvbaNsVwoS2T98q6ErCRoayQYdq",
        candle_interval: 60
    }
];

// Configuration from environment variables (REQUIS - pas de valeurs par défaut pour sécurité)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const CHECK_FREQUENCY = parseInt(process.env.CHECK_FREQUENCY || '30'); // seconds
const BOLLINGER_PERIOD = 20;
const BOLLINGER_STD = 2;
const ALERT_COOLDOWN = 900000; // 15 minutes in milliseconds

// ==================== STATE ====================

let checkCount = 0;
let alertCount = 0;
let lastAlertTimes = {};

// ==================== UTILITY FUNCTIONS ====================

function log(message) {
    const timestamp = new Date().toLocaleString('fr-FR');
    console.log(`[${timestamp}] ${message}`);
}

function formatPrice(price) {
    if (!price) return 'N/A';
    if (price < 0.000001) return `$${price.toFixed(10)}`;
    if (price < 0.01) return `$${price.toFixed(8)}`;
    if (price < 1) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(2)}`;
}

function formatVolume(volume) {
    if (!volume) return '$0';
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
    return `$${volume.toFixed(0)}`;
}

// ==================== HTTP REQUEST HELPER ====================

function httpsRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(options.body);
        }

        req.end();
    });
}

// ==================== API FUNCTIONS ====================

async function getGeckoTerminalOHLCV(poolAddress, aggregate = 60, limit = 25) {
    try {
        // Utiliser l'endpoint /hour pour les bougies de 60 minutes, sinon /minute
        const endpoint = aggregate >= 60 ? 'hour' : 'minute';
        const actualAggregate = aggregate >= 60 ? 1 : aggregate;

        const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}/ohlcv/${endpoint}?aggregate=${actualAggregate}&limit=${limit}&currency=usd`;
        const data = await httpsRequest(url, {
            headers: { 'Accept': 'application/json' }
        });

        if (data?.data?.attributes?.ohlcv_list) {
            return data.data.attributes.ohlcv_list.map(candle => ({
                timestamp: candle[0],
                open: parseFloat(candle[1]),
                high: parseFloat(candle[2]),
                low: parseFloat(candle[3]),
                close: parseFloat(candle[4]),
                volume: parseFloat(candle[5])
            }));
        }

        return null;
    } catch (error) {
        log(`❌ Erreur GeckoTerminal OHLCV: ${error.message}`);
        return null;
    }
}

async function getGeckoTerminalRealtimePrice(poolAddress) {
    try {
        const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}?include=base_token`;
        const data = await httpsRequest(url, {
            headers: { 'Accept': 'application/json' }
        });

        const price = data?.data?.attributes?.base_token_price_usd ? parseFloat(data.data.attributes.base_token_price_usd) : null;
        return { price };
    } catch (error) {
        log(`❌ Erreur prix temps réel: ${error.message}`);
        return { price: null };
    }
}

async function sendTelegramMessage(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        log('⚠️ Configuration Telegram manquante');
        return false;
    }

    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const body = JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });

        await httpsRequest(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            },
            body: body
        });

        return true;
    } catch (error) {
        log(`❌ Erreur Telegram: ${error.message}`);
        return false;
    }
}

// ==================== CALCULATION FUNCTIONS ====================

function calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) return { upper: null, middle: null, lower: null };

    const slice = prices.slice(-period);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const std = Math.sqrt(variance);

    return {
        upper: mean + (stdDev * std),
        middle: mean,
        lower: mean - (stdDev * std)
    };
}

function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) {
            gains += change;
        } else {
            losses += Math.abs(change);
        }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
}

// ==================== MONITORING FUNCTIONS ====================

async function checkToken(token) {
    try {
        const realtimeData = await getGeckoTerminalRealtimePrice(token.pool);
        const candles = await getGeckoTerminalOHLCV(token.pool, token.candle_interval, 25);

        if (!candles || candles.length < BOLLINGER_PERIOD) {
            log(`❌ ${token.symbol}: Données insuffisantes (${candles ? candles.length : 0}/${BOLLINGER_PERIOD})`);
            return;
        }

        const closePrices = candles.map(c => c.close);
        const currentPrice = realtimeData.price || closePrices[closePrices.length - 1];
        const bands = calculateBollingerBands(closePrices, BOLLINGER_PERIOD, BOLLINGER_STD);
        const rsi = calculateRSI(closePrices, 14);

        if (!bands.upper || !bands.middle || !bands.lower) {
            log(`❌ ${token.symbol}: Impossible de calculer les bandes de Bollinger`);
            return;
        }

        const distance = ((bands.upper - currentPrice) / currentPrice * 100);
        const volume = candles[candles.length - 1].volume;

        // Log current status
        log(`✅ ${token.symbol}: ${formatPrice(currentPrice)} | Distance: ${distance.toFixed(2)}% | RSI: ${rsi ? rsi.toFixed(2) : 'N/A'} | Vol: ${formatVolume(volume)}`);

        // Check for breakout
        if (currentPrice >= bands.upper) {
            const lastAlert = lastAlertTimes[token.name] || 0;
            const timeSinceLastAlert = Date.now() - lastAlert;

            if (timeSinceLastAlert > ALERT_COOLDOWN) {
                lastAlertTimes[token.name] = Date.now();
                alertCount++;

                const deviation = ((currentPrice - bands.upper) / bands.upper) * 100;

                const message = `🚨 ALERTE BOLLINGER BREAKOUT! 🚨\n\n💰 Token: ${token.symbol}\n📈 Prix: ${formatPrice(currentPrice)}\n\n📊 Bandes Bollinger (${token.candle_interval}min):\n  • Bande haute: ${formatPrice(bands.upper)}\n  • Moyenne: ${formatPrice(bands.middle)}\n  • Bande basse: ${formatPrice(bands.lower)}\n\n🔥 Deviation: +${deviation.toFixed(2)}% au-dessus\n\n📊 Volume: ${formatVolume(volume)}\n📈 RSI(14): ${rsi ? rsi.toFixed(2) : 'N/A'}\n\n🔗 https://gmgn.ai/sol/token/${token.address}\n\n⏰ ${new Date().toLocaleString('fr-FR')}`;

                await sendTelegramMessage(message);
                log(`🚨 BREAKOUT ${token.symbol} - Alerte envoyée! (Deviation: +${deviation.toFixed(2)}%)`);
            } else {
                const minutesRemaining = Math.ceil((ALERT_COOLDOWN - timeSinceLastAlert) / 60000);
                log(`⏳ ${token.symbol}: En cooldown (${minutesRemaining} min restantes)`);
            }
        }

    } catch (error) {
        log(`❌ Erreur pour ${token.symbol}: ${error.message}`);
    }
}

async function performCheck() {
    checkCount++;
    log(`\n🔄 ========== VÉRIFICATION #${checkCount} (${new Date().toLocaleString('fr-FR')}) ==========`);

    for (const token of TOKENS) {
        await checkToken(token);
        // Small delay between tokens to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    log(`✅ Vérification terminée. Prochaine vérification dans ${CHECK_FREQUENCY} secondes.`);
    log(`📊 Statistiques: ${checkCount} checks | ${alertCount} alertes envoyées\n`);
}

// ==================== MAIN EXECUTION ====================

async function main() {
    log('========================================');
    log('🚀 Solana Bollinger Bands Monitor VPS');
    log('========================================');
    log(`📊 Tokens surveillés: ${TOKENS.length}`);
    log(`⏱️  Fréquence: ${CHECK_FREQUENCY} secondes`);
    log(`📏 Bougies: ${TOKENS[0].candle_interval} minutes`);
    log(`📈 Bollinger: ${BOLLINGER_PERIOD} périodes, ${BOLLINGER_STD} écarts-types`);
    log(`⏳ Cooldown: ${ALERT_COOLDOWN / 60000} minutes`);
    log(`📱 Telegram configuré: ${TELEGRAM_BOT_TOKEN ? 'Oui' : 'Non'}`);
    log('========================================\n');

    // Vérifier la configuration Telegram
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        log('⚠️ ATTENTION: Configuration Telegram manquante!');
        log('Définissez les variables d\'environnement:');
        log('  TELEGRAM_BOT_TOKEN=votre_token');
        log('  TELEGRAM_CHAT_ID=votre_chat_id');
        process.exit(1);
    }

    // Envoyer un message de démarrage
    await sendTelegramMessage('🚀 Surveillance Solana démarrée!\n\n' +
        `📊 Tokens: ${TOKENS.map(t => t.symbol).join(', ')}\n` +
        `⏱️ Fréquence: ${CHECK_FREQUENCY}s\n` +
        `📏 Bougies: ${TOKENS[0].candle_interval}min\n` +
        `📈 Bollinger: ${BOLLINGER_PERIOD} périodes\n\n` +
        `⏰ ${new Date().toLocaleString('fr-FR')}`);

    // Première vérification immédiate
    await performCheck();

    // Planifier les vérifications suivantes
    setInterval(performCheck, CHECK_FREQUENCY * 1000);

    // Gérer l'arrêt gracieux
    process.on('SIGINT', async () => {
        log('\n⏸️  Arrêt du monitoring...');
        await sendTelegramMessage(`⏸️ Surveillance Solana arrêtée.\n\n📊 Stats finales:\n  • ${checkCount} vérifications\n  • ${alertCount} alertes\n\n⏰ ${new Date().toLocaleString('fr-FR')}`);
        process.exit(0);
    });
}

// Start the bot
main().catch(error => {
    log(`❌ Erreur fatale: ${error.message}`);
    process.exit(1);
});
