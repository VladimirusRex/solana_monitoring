#!/usr/bin/env node

/**
 * Solana Bollinger Bands Monitor - VPS Edition v2.2
 * Split candle fetch (5min) vs signal check (25s) pour réduire les 429
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ==================== POOL PERSISTENCE ====================

const POOLS_FILE = path.join(__dirname, 'pools.json');

function loadPools() {
    try {
        if (fs.existsSync(POOLS_FILE)) {
            const saved = JSON.parse(fs.readFileSync(POOLS_FILE, 'utf8'));
            for (const token of TOKENS) {
                if (saved[token.address]) {
                    token.pool = saved[token.address];
                }
            }
            log('📂 Pools chargées depuis pools.json');
        }
    } catch (e) {
        log(`⚠️ Erreur lecture pools.json: ${e.message}`);
    }
}

function savePools() {
    try {
        const data = {};
        for (const token of TOKENS) {
            data[token.address] = token.pool;
        }
        fs.writeFileSync(POOLS_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        log(`⚠️ Erreur sauvegarde pools.json: ${e.message}`);
    }
}

// ==================== ALERT STATE PERSISTENCE ====================
// Les cooldowns d'alerte survivent aux restarts PM2 (sinon chaque redéploiement
// re-déclenche une alerte sur un token déjà en breakout).

const ALERT_STATE_FILE = path.join(__dirname, 'alert_state.json');

function loadAlertState() {
    try {
        if (fs.existsSync(ALERT_STATE_FILE)) {
            const saved = JSON.parse(fs.readFileSync(ALERT_STATE_FILE, 'utf8'));
            if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
                lastAlertTimes = saved;
                log(`📂 Cooldowns chargés depuis alert_state.json (${Object.keys(saved).length} entrée(s))`);
            }
        }
    } catch (e) {
        // Fichier corrompu → ignoré, les cooldowns repartent à zéro
        log(`⚠️ alert_state.json illisible (${e.message}) — ignoré`);
    }
}

function saveAlertState() {
    try {
        fs.writeFileSync(ALERT_STATE_FILE, JSON.stringify(lastAlertTimes, null, 2));
    } catch (e) {
        log(`⚠️ Erreur sauvegarde alert_state.json: ${e.message}`);
    }
}

// ==================== CSV LOGGING ====================

const CSV_FILE_5MIN = path.join(__dirname, 'data_5min.csv');
const CSV_FILE_15MIN = path.join(__dirname, 'data_15min.csv');
const CSV_HEADER = 'timestamp,token,symbol,price_sol,bb_upper,bb_middle,bb_lower,ecart_bb_pct,supertrend,volume_last_candle,signal\n';

function initCSV() {
    if (!fs.existsSync(CSV_FILE_5MIN)) {
        fs.writeFileSync(CSV_FILE_5MIN, CSV_HEADER);
        log('📄 Fichier data_5min.csv créé');
    }
    if (!fs.existsSync(CSV_FILE_15MIN)) {
        fs.writeFileSync(CSV_FILE_15MIN, CSV_HEADER);
        log('📄 Fichier data_15min.csv créé');
    }
}

function appendCSV(token, price, bands, superTrend, lastCandle, signal, timeframe) {
    try {
        const csvFile = timeframe === 5 ? CSV_FILE_5MIN : CSV_FILE_15MIN;
        const ts = new Date().toISOString();
        const st = superTrend?.trend || 'N/A';
        const vol = lastCandle?.volume != null ? lastCandle.volume.toFixed(6) : '';
        const row = [
            ts,
            token.name.replace(/,/g, ''),
            token.symbol,
            price.toFixed(12),
            bands.upper?.toFixed(12) || '',
            bands.middle?.toFixed(12) || '',
            bands.lower?.toFixed(12) || '',
            (((bands.upper - price) / bands.upper) * 100).toFixed(4),
            st,
            vol,
            signal
        ].join(',') + '\n';
        fs.appendFileSync(csvFile, row);
    } catch (e) {
        log(`⚠️ Erreur CSV: ${e.message}`);
    }
}

// ==================== CONFIGURATION ====================

const TOKENS = [
    {
        name: "Jotchua",
        symbol: "$Jotchua",
        address: "BcHEaaTCvycPwwsJ9yQTXdHP9X2gCLkznDbZ8VySpump",
        pool: "CQEYFv3KGnJ6xxRyrUNWbXjPHGnbyCbjuZDTGocV92ug",
        candle_interval: 15
    },
    {
        name: "BURNIE",
        symbol: "$BURNIE",
        address: "CGEDT9QZDvvH5GmVkWJH2BXiMJqMJySC9ihWyr7Spump",
        pool: "5tYFviFWQRKV9BJSTHGitbdqEYC1BGUgRUDnSADUXqJP",
        candle_interval: 15
    },
    {
        name: "TROLL",
        symbol: "$TROLL",
        address: "5UUH9RTDiSpq6HKS6bp4NdU9PNJpXRXuiw6ShBTBhgH2",
        pool: "4w2cysotX6czaUGmmWg13hDpY4QEMG2CzeKYEQyK9Ama",
        candle_interval: 15
    },
    {
        name: "three",
        symbol: "$three",
        address: "FeMbDoX7R1Psc4GEcvJdsbNbZA3bfztcyDCatJVJpump",
        pool: "5ByL7MZoLABYnwMPZKPKjf4MGkZ7FeBzrAnos19Pre2z",
        candle_interval: 15
    },
    {
        name: "Buttcoin",
        symbol: "$Buttcoin",
        address: "Cm6fNnMk7NfzStP9CZpsQA2v3jjzbcYGAxdJySmHpump",
        pool: "FFcYgSSgWHforA9rXXkA48p8YFoz8TSW85Jpo3CQHDyS",
        candle_interval: 15
    },
    {
        name: "neet",
        symbol: "$neet",
        address: "Ce2gx9KGXJ6C9Mp5b5x1sn9Mg87JwEbrQby4Zqo3pump",
        pool: "5wNu5QhdpRGrL37ffcd6TMMqZugQgxwafgz477rShtHy",
        candle_interval: 15
    },
];

// Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const BOLLINGER_PERIOD = 20;
const BOLLINGER_STD = 2;
const ALERT_COOLDOWN = 900000; // 15 min
const STATUS_INTERVAL = 14400000; // 4 heures
const STALE_CACHE_THRESHOLD = 5 * 60 * 1000; // 5min sans refresh candles → données périmées

// State
let checkCount = 0;
let alertCount = 0;
let lastAlertTimes = {};
let tokenStats = {};
let staleWarned = {};   // { [symbol]: bool } — évite le spam de warning cache périmé

// Cache candles — rafraîchi toutes les CANDLE_REFRESH_INTERVAL.
// ARCHITECTURE ZÉRO-429 : le refresh candles est la SEULE source d'appels API.
// Le check (détection breakout) lit uniquement ce cache, aucun appel réseau.
// 1 appel/token/minute = 6 appels/min, très en dessous de la limite 30/min.
const CANDLE_REFRESH_INTERVAL = 120 * 1000; // 2 minutes (cycle complet refresh+check)
const candleCache = {}; // { [symbol]: { candles, fetchedAt } }

// ==================== UTILITY FUNCTIONS ====================

function log(message) {
    const timestamp = new Date().toLocaleString('fr-FR');
    console.log(`[${timestamp}] ${message}`);
}

function formatPriceSOL(price) {
    if (!price) return 'N/A';
    if (price < 0.00000001) return `${price.toFixed(12)} SOL`;
    if (price < 0.000001) return `${price.toFixed(10)} SOL`;
    if (price < 0.0001) return `${price.toFixed(8)} SOL`;
    if (price < 1) return `${price.toFixed(6)} SOL`;
    return `${price.toFixed(4)} SOL`;
}

// ==================== HTTP REQUEST ====================

const GECKO_HEADERS = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// Throttle global ADAPTATIF GeckoTerminal : espacement minimum entre TOUS les
// appels, qui s'auto-ajuste. Sur 429 → on augmente l'intervalle (backoff). Tant
// que ça passe → on le réduit doucement vers le plancher. Le bot trouve tout seul
// le débit max sans 429, quelle que soit la vraie limite de l'IP/free tier.
const GECKO_MIN_FLOOR = 7000;   // intervalle plancher (ms) — élevé pour quasi-zéro 429
const GECKO_MAX_CEIL = 25000;   // intervalle plafond (ms)
let geckoInterval = GECKO_MIN_FLOOR; // intervalle courant, ajusté dynamiquement
let geckoChain = Promise.resolve();
let geckoLastCall = 0;
function geckoThrottle() {
    geckoChain = geckoChain.then(async () => {
        const wait = geckoInterval - (Date.now() - geckoLastCall);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        geckoLastCall = Date.now();
    });
    return geckoChain;
}
// Appelé après chaque réponse gecko pour ajuster le rythme.
function geckoFeedback(got429, retryAfterSec) {
    if (got429) {
        // Backoff : si le serveur donne un Retry-After, on le respecte (min 5s),
        // sinon on double l'intervalle. Plafonné.
        const bump = retryAfterSec ? retryAfterSec * 1000 : geckoInterval * 2;
        geckoInterval = Math.min(GECKO_MAX_CEIL, Math.max(geckoInterval, bump));
    } else {
        // Succès : on réduit doucement vers le plancher (-5% par succès).
        geckoInterval = Math.max(GECKO_MIN_FLOOR, Math.round(geckoInterval * 0.95));
    }
}

async function httpsRequest(url, options = {}) {
    const isGecko = url.includes('geckoterminal.com');
    // Espacer les appels GeckoTerminal via le throttle global adaptatif.
    if (isGecko) await geckoThrottle();
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            timeout: options.timeout || 8000
        };

        const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    if (isGecko) geckoFeedback(false);
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    const ra = res.headers['retry-after'] != null ? parseInt(res.headers['retry-after'], 10) : null;
                    if (isGecko && res.statusCode === 429) geckoFeedback(true, ra);
                    log(`⚠️ HTTP ${res.statusCode} sur ${urlObj.pathname} (throttle→${geckoInterval}ms)`);
                    const err = new Error(`HTTP ${res.statusCode}`);
                    err.statusCode = res.statusCode;
                    if (ra != null) err.retryAfter = ra;
                    reject(err);
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        if (options.body) req.write(options.body);
        req.end();
    });
}

// ==================== API FUNCTIONS ====================

async function getGeckoTerminalOHLCV(poolAddress, aggregate = 15, limit = 25, retries = 2) {
    const endpoint = aggregate >= 60 ? 'hour' : 'minute';
    const actualAggregate = aggregate >= 60 ? 1 : aggregate;
    const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}/ohlcv/${endpoint}?aggregate=${actualAggregate}&limit=${limit}&currency=token`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const data = await httpsRequest(url, { headers: GECKO_HEADERS });
            if (data?.data?.attributes?.ohlcv_list) {
                return data.data.attributes.ohlcv_list.map(c => ({
                    timestamp: c[0],
                    open: parseFloat(c[1]),
                    high: parseFloat(c[2]),
                    low: parseFloat(c[3]),
                    close: parseFloat(c[4]),
                    volume: parseFloat(c[5])
                })).sort((a, b) => a.timestamp - b.timestamp);
            }
            // Données vides mais pas d'erreur HTTP — pas la peine de retry
            return null;
        } catch (error) {
            // Pas de délai fixe ici : le throttle adaptatif a déjà augmenté
            // l'intervalle global suite au 429. Le prochain attempt attendra
            // automatiquement le bon délai via geckoThrottle().
        }
    }
    return null;
}

async function getTopPool(tokenAddress) {
    try {
        const url = `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${tokenAddress}/pools`;
        const data = await httpsRequest(url, { headers: GECKO_HEADERS });
        const pools = data?.data;
        if (!pools || pools.length === 0) return null;

        // IMPORTANT: ne garder que les pools quotées en SOL.
        // Le bot calcule tout en SOL — une pool USDC casserait la BB.
        const solPools = pools.filter(p => {
            const name = (p.attributes?.name || '').toUpperCase();
            // name du type "TOKEN / SOL" ou "TOKEN / USDC"
            const quote = name.split('/')[1]?.trim();
            return quote === 'SOL';
        });
        if (solPools.length === 0) return null;

        // Trier par volume 24h décroissant et retourner la top pool SOL
        const sorted = solPools.slice().sort((a, b) => {
            const volA = parseFloat(a.attributes?.volume_usd?.h24 || 0);
            const volB = parseFloat(b.attributes?.volume_usd?.h24 || 0);
            return volB - volA;
        });

        const topPool = sorted[0];
        const poolAddress = topPool.id.replace('solana_', '');
        const volume = parseFloat(topPool.attributes?.volume_usd?.h24 || 0);
        return { address: poolAddress, volume };
    } catch (error) {
        return null;
    }
}

async function refreshPools() {
    log('🔄 Refresh des pools (top volume 24h)...');
    const changes = [];

    for (let i = 0; i < TOKENS.length; i++) {
        const token = TOKENS[i];
        const top = await getTopPool(token.address);
        if (top && top.address !== token.pool) {
            const oldPool = token.pool;
            token.pool = top.address;
            changes.push(`${token.symbol}: ${oldPool.slice(0, 8)}... → ${top.address.slice(0, 8)}... ($${(top.volume / 1000).toFixed(0)}K vol)`);
            log(`🔄 ${token.symbol}: pool mise à jour → ${top.address}`);
        }
        // Délai entre chaque requête pour éviter le rate limit
        if (i < TOKENS.length - 1) await new Promise(r => setTimeout(r, 3000));
    }

    savePools(); // Toujours sauvegarder (même si aucun changement, pour init pools.json)

    if (changes.length > 0) {
        const msg = `🔄 <b>Pools mises à jour automatiquement</b>\n\n${changes.map(c => `• ${c}`).join('\n')}`;
        await sendTelegramMessage(msg);
        log(`✅ ${changes.length} pool(s) mise(s) à jour`);
    } else {
        log('✅ Toutes les pools sont déjà les meilleures');
    }
}

// Charge les candles d'un seul token dans le cache. Retourne true si OK.
async function fetchCandlesFor(token) {
    try {
        const candles = await getGeckoTerminalOHLCV(token.pool, token.candle_interval, 25);
        if (candles && candles.length >= BOLLINGER_PERIOD) {
            candleCache[token.symbol] = { candles, fetchedAt: Date.now() };
            log(`📡 ${token.symbol}: candles OK (${candles.length})`);
            return true;
        }
        log(`⚠️ ${token.symbol}: candles insuffisantes ou null`);
    } catch (e) {
        log(`❌ ${token.symbol}: erreur fetch candles - ${e.message}`);
    }
    return false;
}

// Tier 2 : fetch candles pour tous les tokens en séquentiel.
// On N'ABANDONNE JAMAIS un token : les échecs (429) sont retentés en boucle,
// avec une pause croissante entre les passes, jusqu'à ce qu'il ne reste plus
// que des tokens vraiment cassés (pool morte) ou que le max de passes soit atteint.
const REFRESH_MAX_PASSES = 3; // passes de retry max (cycle 1min, un échec sera retenté la minute suivante)
let refreshRunning = false; // garde-fou anti-chevauchement de refreshAllCandles
async function refreshAllCandles() {
    if (refreshRunning) {
        log('⏭️ Refresh candles précédent encore en cours — skip');
        return;
    }
    refreshRunning = true;
    try {
        await doRefreshAllCandles();
    } finally {
        refreshRunning = false;
    }
}

async function doRefreshAllCandles() {
    log('📡 Refresh candles (Tier 2)...');
    let pending = TOKENS.slice();
    let pass = 0;

    while (pending.length > 0 && pass < REFRESH_MAX_PASSES) {
        if (pass > 0) {
            const wait = Math.min(5000 + pass * 3000, 20000); // 8s, 11s, 14s... plafonné 20s
            log(`🔁 Retry candles (passe ${pass}) pour ${pending.length} token(s): ${pending.map(t => t.symbol).join(', ')} — attente ${wait / 1000}s`);
            await new Promise(r => setTimeout(r, wait));
        }
        const stillFailed = [];
        for (let i = 0; i < pending.length; i++) {
            const ok = await fetchCandlesFor(pending[i]);
            if (!ok) stillFailed.push(pending[i]);
            if (i + 1 < pending.length) await new Promise(r => setTimeout(r, 500));
        }
        pending = stillFailed;
        pass++;
    }

    if (pending.length > 0) {
        log(`❌ Candles toujours KO après ${REFRESH_MAX_PASSES} passes: ${pending.map(t => t.symbol).join(', ')} — pool possiblement morte`);
    }
}

// Envoi Telegram fiabilisé : timeout 10s par tentative, 3 retries avec backoff
// (2s, 5s, 10s). Retourne true SEULEMENT si l'envoi a réussi — l'appelant ne
// doit poser le cooldown qu'après confirmation.
const TELEGRAM_TIMEOUT = 10000;
const TELEGRAM_RETRY_DELAYS = [2000, 5000, 10000];

async function sendTelegramMessage(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false;
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const body = JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: false
    });
    for (let attempt = 0; attempt <= TELEGRAM_RETRY_DELAYS.length; attempt++) {
        try {
            await httpsRequest(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
                body: body,
                timeout: TELEGRAM_TIMEOUT
            });
            return true;
        } catch (error) {
            const isLast = attempt === TELEGRAM_RETRY_DELAYS.length;
            log(`❌ Erreur Telegram (tentative ${attempt + 1}/${TELEGRAM_RETRY_DELAYS.length + 1}): ${error.message}`);
            if (!isLast) await new Promise(r => setTimeout(r, TELEGRAM_RETRY_DELAYS[attempt]));
        }
    }
    return false;
}

// ==================== CALCULATIONS ====================

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

function calculateATR(candles, period = 10) {
    if (candles.length < period + 1) return null;
    const trs = [];
    for (let i = 1; i < candles.length; i++) {
        const high = candles[i].high;
        const low = candles[i].low;
        const prevClose = candles[i - 1].close;
        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        trs.push(tr);
    }
    const recentTRs = trs.slice(-period);
    return recentTRs.reduce((a, b) => a + b, 0) / period;
}

function calculateSuperTrend(candles, period = 10, multiplier = 3) {
    if (candles.length < period + 2) return null;

    // Calculer ATR pour chaque bougie
    const trs = [];
    for (let i = 1; i < candles.length; i++) {
        const tr = Math.max(
            candles[i].high - candles[i].low,
            Math.abs(candles[i].high - candles[i - 1].close),
            Math.abs(candles[i].low - candles[i - 1].close)
        );
        trs.push(tr);
    }

    // On a besoin de suffisamment de données
    if (trs.length < period) return null;

    // Calculer SuperTrend sur les dernières bougies avec état
    let trend = 1; // 1 = UP, -1 = DOWN
    let previousTrend = 1; // trend de l'avant-dernière bougie
    let prevUpperBand = 0;
    let prevLowerBand = 0;
    let prevSuperTrend = 0;

    for (let i = period; i < candles.length; i++) {
        // ATR = moyenne des 'period' derniers TR
        const atr = trs.slice(i - period, i).reduce((a, b) => a + b, 0) / period;

        const hl2 = (candles[i].high + candles[i].low) / 2;
        let upperBand = hl2 + (multiplier * atr);
        let lowerBand = hl2 - (multiplier * atr);

        // Ajustement des bandes (la vraie logique SuperTrend)
        if (i > period) {
            if (lowerBand > prevLowerBand || candles[i - 1].close < prevLowerBand) {
                lowerBand = lowerBand;
            } else {
                lowerBand = prevLowerBand;
            }

            if (upperBand < prevUpperBand || candles[i - 1].close > prevUpperBand) {
                upperBand = upperBand;
            } else {
                upperBand = prevUpperBand;
            }
        }

        // Déterminer la tendance
        const close = candles[i].close;
        const prevClose = candles[i - 1].close;

        previousTrend = trend; // sauvegarder le trend avant mise à jour

        if (prevSuperTrend === prevUpperBand) {
            trend = close > upperBand ? 1 : -1;
        } else {
            trend = close < lowerBand ? -1 : 1;
        }

        prevUpperBand = upperBand;
        prevLowerBand = lowerBand;
        prevSuperTrend = trend === 1 ? lowerBand : upperBand;
    }

    return {
        upperBand: prevUpperBand,
        lowerBand: prevLowerBand,
        trend: trend === 1 ? 'UP' : 'DOWN',
        prevTrend: previousTrend === 1 ? 'UP' : 'DOWN',
        value: prevSuperTrend
    };
}

// ==================== MONITORING ====================

async function checkToken(token) {
    try {
        // Lecture du cache candles uniquement — AUCUN appel API ici (zéro 429).
        // Le cache est rafraîchi chaque minute par refreshAllCandles.
        const cached = candleCache[token.symbol];
        const candles = cached?.candles || null;

        if (!candles || candles.length < BOLLINGER_PERIOD) {
            log(`❌ ${token.symbol}: Données insuffisantes`);
            return null;
        }

        // Cache périmé — si les candles n'ont pas été rafraîchies depuis trop
        // longtemps, ne pas alerter sur données mortes.
        const cacheAge = Date.now() - (cached.fetchedAt || 0);
        if (cacheAge > STALE_CACHE_THRESHOLD) {
            if (!staleWarned[token.symbol]) {
                staleWarned[token.symbol] = true;
                const min = Math.round(cacheAge / 60000);
                await sendTelegramMessage(`⚠️ <b>${token.symbol}</b>: données périmées (${min}min sans refresh). Alertes suspendues pour ce token.`);
                log(`⚠️ ${token.symbol}: cache périmé (${min}min) — alertes suspendues`);
            }
            return null;
        }
        staleWarned[token.symbol] = false;

        const closePrices = candles.map(c => c.close);
        const lastCandle = candles[candles.length - 1];
        const bands = calculateBollingerBands(closePrices, BOLLINGER_PERIOD, BOLLINGER_STD);
        const superTrend = calculateSuperTrend(candles, 10, 3);

        if (!bands.upper) {
            log(`❌ ${token.symbol}: Calcul impossible`);
            return null;
        }

        // Prix courant = close de la dernière bougie cachée (rafraîchie chaque minute).
        const currentPrice = lastCandle.close;

        // Écart par rapport à la bande haute (négatif = au-dessus)
        const ecartBB = ((bands.upper - currentPrice) / bands.upper) * 100;

        // Double détection: CLOSE ou HIGH de la dernière bougie au-dessus de BB haute.
        // Le HIGH capte les wicks intra-bougie (les bougies sont rafraîchies chaque minute).
        const closeBreakout = lastCandle.close >= bands.upper;
        const highBreakout = (lastCandle?.high || 0) >= bands.upper;
        const isBreakout = closeBreakout || highBreakout;

        tokenStats[token.symbol] = {
            price: currentPrice,
            ecartBB,
            superTrend: superTrend?.trend || 'N/A',
            isBreakout
        };

        log(`✅ ${token.symbol}: ${formatPriceSOL(currentPrice)} | BB: ${ecartBB.toFixed(1)}%`);

        // Breakout detection (LIVE / CLOSE / HIGH touche la BB haute)
        if (isBreakout) {
            const lastAlert = lastAlertTimes[token.address] || 0;
            const timeSinceLastAlert = Date.now() - lastAlert;

            if (timeSinceLastAlert > ALERT_COOLDOWN) {
                const deviation = ((currentPrice - bands.upper) / bands.upper) * 100;
                const stEmoji = superTrend?.trend === 'UP' ? '🟢' : '🔴';
                const stStatus = superTrend?.trend === 'UP' ? 'HAUSSIÈRE' : 'BAISSIÈRE';

                const message = `🚨 <b>BREAKOUT ${token.symbol}</b>

💰 Prix: <b>${formatPriceSOL(currentPrice)}</b>

🎯 BB haute: ${formatPriceSOL(bands.upper)} (<b>+${deviation.toFixed(2)}%</b>)
${stEmoji} SuperTrend: <b>${stStatus}</b>

🔗 https://gmgn.ai/sol/token/${token.address}`;

                const sent = await sendTelegramMessage(message);
                if (sent) {
                    // Cooldown posé APRÈS confirmation d'envoi : si Telegram est
                    // down malgré les retries, on retentera au prochain cycle.
                    lastAlertTimes[token.address] = Date.now();
                    saveAlertState();
                    alertCount++;
                    log(`🚨 BREAKOUT ${token.symbol} - Alerte envoyée!`);
                } else {
                    log(`❌ BREAKOUT ${token.symbol} - envoi Telegram échoué, nouvel essai au prochain cycle`);
                }
            } else {
                const minLeft = Math.ceil((ALERT_COOLDOWN - timeSinceLastAlert) / 60000);
                log(`⏳ ${token.symbol}: Cooldown (${minLeft}min)`);
            }
        }

        // Déterminer le signal pour le CSV
        const signal = isBreakout ? 'BB_BREAKOUT' : 'NONE';

        // Log CSV
        appendCSV(token, currentPrice, bands, superTrend, lastCandle, signal, token.candle_interval);

        return { token, currentPrice, bands };

    } catch (error) {
        log(`❌ Erreur ${token.symbol}: ${error.message}`);
        return null;
    }
}

// Check de détection — lecture du cache uniquement, aucun appel API, instantané.
// Déclenché juste après chaque refresh candles (donc 1×/minute).
async function performCheck() {
    checkCount++;
    log(`\n🔄 VÉRIFICATION #${checkCount}`);
    for (const token of TOKENS) {
        await checkToken(token);
    }
    log(`✅ Terminé`);
}

// ==================== MAIN ====================

async function main() {
    log('🚀 Solana Bollinger Monitor v2.2');
    log(`📊 ${TOKENS.length} tokens | ⏱️ cycle ${CANDLE_REFRESH_INTERVAL / 1000}s | 📏 ${TOKENS[0].candle_interval}min\n`);

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        log('⚠️ Config Telegram manquante!');
        process.exit(1);
    }

    const startMsg = `🚀 <b>Bot démarré</b>

📊 Tokens: ${TOKENS.map(t => t.symbol).join(', ')}
⏱️ Cycle: ${CANDLE_REFRESH_INTERVAL / 1000}s | Bougies: ${TOKENS[0].candle_interval}min
📈 Bollinger: ${BOLLINGER_PERIOD} périodes

⏰ ${new Date().toLocaleString('fr-FR')}`;

    initCSV();
    loadPools();
    loadAlertState();
    await sendTelegramMessage(startMsg);

    // On NE refresh PAS les pools au boot : les pools du code/pools.json sont
    // déjà les bonnes (vérifiées manuellement). Ça évite 6 appels inutiles au
    // démarrage (cause de 429) et le re-switch intempestif. refreshPools tourne
    // ensuite toutes les 4h.

    // Boucle unique : refresh candles (seule source d'API) PUIS check (lecture
    // cache). Enchaînés pour que le check tourne toujours sur des données fraîches.
    // 1 cycle/minute = 6 appels API/min, très en dessous de la limite 30/min → zéro 429.
    async function cycle() {
        await refreshAllCandles();
        await performCheck();
    }
    await cycle();
    setInterval(cycle, CANDLE_REFRESH_INTERVAL);

    setInterval(refreshPools, STATUS_INTERVAL); // Refresh pools toutes les 4h

    process.on('SIGINT', async () => {
        log('\n⏸️ Arrêt...');
        await sendTelegramMessage(`⏸️ Bot arrêté | ${checkCount} checks | ${alertCount} alertes`);
        process.exit(0);
    });
}

main().catch(e => { log(`❌ Erreur: ${e.message}`); process.exit(1); });
