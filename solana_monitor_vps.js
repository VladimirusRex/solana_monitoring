#!/usr/bin/env node

/**
 * Solana Bollinger Bands Monitor - VPS Edition v2.0
 * Monitors Solana tokens for Bollinger Band breakouts and sends Telegram alerts
 * Designed for 24/7 operation on a VPS
 *
 * Améliorations v2.0:
 * - Requêtes API en parallèle (plus rapide)
 * - Messages Telegram améliorés avec graphique ASCII
 * - Variation 24h dans les alertes
 * - Liens vers DexScreener et GeckoTerminal
 * - Rapport de statut toutes les heures
 */

const https = require('https');

// ==================== CONFIGURATION ====================

const TOKENS = [
    {
        name: "NOTHING",
        symbol: "$NOTHING",
        address: "F7pB3ZdfBnyFw2LRHydWEn9BmhEa5XihXLjhySFRpump",
        pool: "2pA1GMh9WbPtURmr6Rt5oxNs6RdpLzxJphSJQcdyaNFq",
        candle_interval: 15
    },
    {
        name: "1 coin",
        symbol: "$1",
        address: "GMvCfcZg8YvkkQmwDaAzCtHDrrEtgE74nQpQ7xNabonk",
        pool: "6sEkZ73vph5AFYmQTzaV6H5vAQQLZ2C8WqeCQ6MhLqFk",
        candle_interval: 15
    },
    {
        name: "SPSC",
        symbol: "$SPSC",
        address: "4nswj3o1Lo9iWYvvRJxUD8vbCy9ay7QQoXYcncHNbonk",
        pool: "6MHj1z5BgC1UiTNEWrnJfbGtQPuPdh2qgdWkemGxT2c5",
        candle_interval: 15
    },
    {
        name: "FKH",
        symbol: "$FKH",
        address: "BCXpjsHYmgVpRKdv4EQv1RARhYagnnwPkJjYbvM6bonk",
        pool: "8Lq7gz2aEzkMQNfLpYmjv3V8JbD26LRbFd11SnRicCE6",
        candle_interval: 15
    },
    {
        name: "67",
        symbol: "$67",
        address: "9AvytnUKsLxPxFHFqS6VLxaxt5p6BhYNr53SD2Chpump",
        pool: "DMAFL613XTipuA3jFNYczavWT7XsiYf9cR3qmRMZQhB6",
        candle_interval: 15
    },
    {
        name: "WOJAK",
        symbol: "$WOJAK",
        address: "8J69rbLTzWWgUJziFY8jeu5tDwEPBwUz4pKBMr5rpump",
        pool: "FDrY5i5kuadZ1ik8gPS26qjj9Rw9mpufXMegGC2HNSP7",
        candle_interval: 15
    }
];

// Configuration from environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const CHECK_FREQUENCY = parseInt(process.env.CHECK_FREQUENCY || '30'); // seconds
const BOLLINGER_PERIOD = 20;
const BOLLINGER_STD = 2;
const ALERT_COOLDOWN = 900000; // 15 minutes in milliseconds
const STATUS_INTERVAL = 3600000; // 1 heure en millisecondes

// ==================== STATE ====================

let checkCount = 0;
let alertCount = 0;
let lastAlertTimes = {};
let lastStatusTime = Date.now();
let tokenStats = {}; // Pour tracker les stats par token

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

function formatPercent(value) {
    if (value === null || value === undefined) return 'N/A';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}

// Génère un mini graphique ASCII pour visualiser la position du prix
function generatePriceBar(currentPrice, lower, middle, upper) {
    const totalWidth = 20;
    const range = upper - lower;
    if (range === 0) return '|' + '─'.repeat(totalWidth) + '|';

    const pricePosition = Math.max(0, Math.min(1, (currentPrice - lower) / range));
    const middlePosition = (middle - lower) / range;

    const priceIndex = Math.floor(pricePosition * totalWidth);
    const middleIndex = Math.floor(middlePosition * totalWidth);

    let bar = '';
    for (let i = 0; i <= totalWidth; i++) {
        if (i === 0) bar += '▕';
        else if (i === totalWidth) bar += '▏';
        else if (i === priceIndex) bar += '●';
        else if (i === middleIndex) bar += '│';
        else bar += '─';
    }

    return bar;
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
            headers: options.headers || {},
            timeout: 10000
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
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });

        if (options.body) {
            req.write(options.body);
        }

        req.end();
    });
}

// ==================== API FUNCTIONS ====================

async function getGeckoTerminalOHLCV(poolAddress, aggregate = 60, limit = 25) {
    try {
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
        return null;
    }
}

async function getGeckoTerminalPoolData(poolAddress) {
    try {
        const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}?include=base_token`;
        const data = await httpsRequest(url, {
            headers: { 'Accept': 'application/json' }
        });

        const attrs = data?.data?.attributes;
        if (!attrs) return null;

        return {
            price: attrs.base_token_price_usd ? parseFloat(attrs.base_token_price_usd) : null,
            priceChange24h: attrs.price_change_percentage?.h24 ? parseFloat(attrs.price_change_percentage.h24) : null,
            volume24h: attrs.volume_usd?.h24 ? parseFloat(attrs.volume_usd.h24) : null,
            txCount24h: attrs.transactions?.h24 ? (attrs.transactions.h24.buys + attrs.transactions.h24.sells) : null
        };
    } catch (error) {
        return null;
    }
}

// Récupérer toutes les données d'un token en parallèle
async function getTokenData(token) {
    try {
        const [poolData, candles] = await Promise.all([
            getGeckoTerminalPoolData(token.pool),
            getGeckoTerminalOHLCV(token.pool, token.candle_interval, 25)
        ]);

        return { poolData, candles };
    } catch (error) {
        return { poolData: null, candles: null };
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
            parse_mode: 'HTML',
            disable_web_page_preview: true
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
        const { poolData, candles } = await getTokenData(token);

        if (!candles || candles.length < BOLLINGER_PERIOD) {
            log(`❌ ${token.symbol}: Données insuffisantes`);
            return null;
        }

        const closePrices = candles.map(c => c.close);
        const currentPrice = poolData?.price || closePrices[closePrices.length - 1];
        const bands = calculateBollingerBands(closePrices, BOLLINGER_PERIOD, BOLLINGER_STD);
        const rsi = calculateRSI(closePrices, 14);

        if (!bands.upper) {
            log(`❌ ${token.symbol}: Impossible de calculer les bandes`);
            return null;
        }

        const distance = ((bands.upper - currentPrice) / currentPrice * 100);
        const volume = candles[candles.length - 1].volume;
        const priceChange24h = poolData?.priceChange24h;
        const volume24h = poolData?.volume24h;

        // Sauvegarder les stats
        tokenStats[token.symbol] = {
            price: currentPrice,
            distance,
            rsi,
            priceChange24h,
            isBreakout: currentPrice >= bands.upper
        };

        // Log current status
        const changeStr = priceChange24h !== null ? ` | 24h: ${formatPercent(priceChange24h)}` : '';
        log(`✅ ${token.symbol}: ${formatPrice(currentPrice)} | Dist: ${distance.toFixed(1)}% | RSI: ${rsi ? rsi.toFixed(0) : 'N/A'}${changeStr}`);

        // Check for breakout
        if (currentPrice >= bands.upper) {
            const lastAlert = lastAlertTimes[token.name] || 0;
            const timeSinceLastAlert = Date.now() - lastAlert;

            if (timeSinceLastAlert > ALERT_COOLDOWN) {
                lastAlertTimes[token.name] = Date.now();
                alertCount++;

                const deviation = ((currentPrice - bands.upper) / bands.upper) * 100;
                const priceBar = generatePriceBar(currentPrice, bands.lower, bands.middle, bands.upper);

                // Message Telegram amélioré
                const message =
`🚨 <b>BREAKOUT BOLLINGER</b> 🚨

━━━━━━━━━━━━━━━━━━━━

💎 <b>${token.symbol}</b>
💰 Prix: <b>${formatPrice(currentPrice)}</b>
${priceChange24h !== null ? `📊 24h: <b>${formatPercent(priceChange24h)}</b>` : ''}

━━━━━━━━━━━━━━━━━━━━

📈 <b>Bandes Bollinger (${token.candle_interval}min)</b>

<code>${priceBar}</code>
<code>▕ Bas      │Mid      Haut▏</code>

🔺 Haute:  ${formatPrice(bands.upper)}
➖ Moyenne: ${formatPrice(bands.middle)}
🔻 Basse:  ${formatPrice(bands.lower)}

🔥 <b>+${deviation.toFixed(2)}%</b> au-dessus

━━━━━━━━━━━━━━━━━━━━

📊 RSI(14): <b>${rsi ? rsi.toFixed(1) : 'N/A'}</b> ${rsi > 70 ? '🔴 Surachat' : rsi > 50 ? '🟡 Neutre' : '🟢 Survente'}
💹 Volume 24h: <b>${formatVolume(volume24h)}</b>

━━━━━━━━━━━━━━━━━━━━

🔗 <a href="https://dexscreener.com/solana/${token.address}">DexScreener</a> | <a href="https://www.geckoterminal.com/solana/pools/${token.pool}">GeckoTerminal</a>

⏰ ${new Date().toLocaleString('fr-FR')}`;

                await sendTelegramMessage(message);
                log(`🚨 BREAKOUT ${token.symbol} - Alerte envoyée!`);
            } else {
                const minutesRemaining = Math.ceil((ALERT_COOLDOWN - timeSinceLastAlert) / 60000);
                log(`⏳ ${token.symbol}: Cooldown (${minutesRemaining}min)`);
            }
        }

        return { token, currentPrice, bands, rsi, priceChange24h };

    } catch (error) {
        log(`❌ Erreur ${token.symbol}: ${error.message}`);
        return null;
    }
}

async function performCheck() {
    checkCount++;
    const startTime = Date.now();
    log(`\n🔄 ═══ VÉRIFICATION #${checkCount} ═══`);

    // Vérifier tous les tokens en parallèle (par groupes de 3 pour éviter le rate limiting)
    const results = [];
    for (let i = 0; i < TOKENS.length; i += 3) {
        const batch = TOKENS.slice(i, i + 3);
        const batchResults = await Promise.all(batch.map(token => checkToken(token)));
        results.push(...batchResults);
        if (i + 3 < TOKENS.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`✅ Terminé en ${elapsed}s | Prochain check: ${CHECK_FREQUENCY}s`);

    // Envoyer rapport de statut toutes les heures
    if (Date.now() - lastStatusTime >= STATUS_INTERVAL) {
        await sendStatusReport();
        lastStatusTime = Date.now();
    }
}

async function sendStatusReport() {
    const breakouts = Object.entries(tokenStats).filter(([_, s]) => s.isBreakout);
    const topMover = Object.entries(tokenStats)
        .filter(([_, s]) => s.priceChange24h !== null)
        .sort((a, b) => (b[1].priceChange24h || 0) - (a[1].priceChange24h || 0))[0];

    let statusMessage =
`📊 <b>RAPPORT HORAIRE</b> 📊

━━━━━━━━━━━━━━━━━━━━

⏱️ Uptime: <b>${checkCount}</b> vérifications
🚨 Alertes envoyées: <b>${alertCount}</b>

━━━━━━━━━━━━━━━━━━━━

<b>État des tokens:</b>
`;

    for (const [symbol, stats] of Object.entries(tokenStats)) {
        const emoji = stats.isBreakout ? '🔥' : (stats.distance < 5 ? '👀' : '✅');
        const change = stats.priceChange24h !== null ? ` (${formatPercent(stats.priceChange24h)})` : '';
        statusMessage += `${emoji} ${symbol}: ${formatPrice(stats.price)}${change}\n`;
    }

    if (topMover) {
        statusMessage += `\n🏆 Top performer: <b>${topMover[0]}</b> ${formatPercent(topMover[1].priceChange24h)}`;
    }

    if (breakouts.length > 0) {
        statusMessage += `\n\n⚠️ <b>${breakouts.length} token(s) en breakout!</b>`;
    }

    statusMessage += `\n\n⏰ ${new Date().toLocaleString('fr-FR')}`;

    await sendTelegramMessage(statusMessage);
    log('📊 Rapport horaire envoyé');
}

// ==================== MAIN EXECUTION ====================

async function main() {
    log('════════════════════════════════════════');
    log('🚀 Solana Bollinger Bands Monitor v2.0');
    log('════════════════════════════════════════');
    log(`📊 Tokens: ${TOKENS.length}`);
    log(`⏱️  Fréquence: ${CHECK_FREQUENCY}s`);
    log(`📏 Bougies: ${TOKENS[0].candle_interval}min`);
    log(`📈 Bollinger: ${BOLLINGER_PERIOD} périodes`);
    log(`⏳ Cooldown alertes: ${ALERT_COOLDOWN / 60000}min`);
    log(`📊 Rapport statut: toutes les heures`);
    log('════════════════════════════════════════\n');

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        log('⚠️ Configuration Telegram manquante!');
        process.exit(1);
    }

    // Message de démarrage amélioré
    const startMessage =
`🚀 <b>Bot Bollinger démarré!</b>

━━━━━━━━━━━━━━━━━━━━

📊 <b>Tokens surveillés:</b>
${TOKENS.map(t => `• ${t.symbol}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━

⚙️ <b>Configuration:</b>
• Bougies: ${TOKENS[0].candle_interval} minutes
• Bollinger: ${BOLLINGER_PERIOD} périodes, ${BOLLINGER_STD}σ
• Check: toutes les ${CHECK_FREQUENCY}s
• Cooldown: ${ALERT_COOLDOWN / 60000}min
• Rapport: toutes les heures

━━━━━━━━━━━━━━━━━━━━

⏰ ${new Date().toLocaleString('fr-FR')}`;

    await sendTelegramMessage(startMessage);

    // Première vérification
    await performCheck();

    // Planifier les vérifications
    setInterval(performCheck, CHECK_FREQUENCY * 1000);

    // Arrêt gracieux
    process.on('SIGINT', async () => {
        log('\n⏸️ Arrêt...');
        await sendTelegramMessage(
`⏸️ <b>Bot arrêté</b>

📊 Stats finales:
• ${checkCount} vérifications
• ${alertCount} alertes

⏰ ${new Date().toLocaleString('fr-FR')}`
        );
        process.exit(0);
    });
}

main().catch(error => {
    log(`❌ Erreur fatale: ${error.message}`);
    process.exit(1);
});
