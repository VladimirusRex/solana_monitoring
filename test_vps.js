#!/usr/bin/env node

/**
 * Script de test rapide pour le monitoring VPS
 * Vérifie une seule fois tous les tokens sans envoyer d'alertes
 */

const https = require('https');

// Configuration
const TOKENS = [
    { name: "$NOTHING", pool: "2pA1GMh9WbPtURmr6Rt5oxNs6RdpLzxJphSJQcdyaNFq", candle_interval: 15 },
    { name: "$1", pool: "6sEkZ73vph5AFYmQTzaV6H5vAQQLZ2C8WqeCQ6MhLqFk", candle_interval: 15 },
    { name: "$SPSC", pool: "6MHj1z5BgC1UiTNEWrnJfbGtQPuPdh2qgdWkemGxT2c5", candle_interval: 15 },
    { name: "$FKH", pool: "8Lq7gz2aEzkMQNfLpYmjv3V8JbD26LRbFd11SnRicCE6", candle_interval: 15 },
    { name: "$TROLL", pool: "4w2cysotX6czaUGmmWg13hDpY4QEMG2CzeKYEQyK9Ama", candle_interval: 15 },
    { name: "$WOJAK", pool: "FDrY5i5kuadZ1ik8gPS26qjj9Rw9mpufXMegGC2HNSP7", candle_interval: 15 }
];

const BOLLINGER_PERIOD = 20;
const BOLLINGER_STD = 2;

function httpsRequest(url) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        };

        https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        }).on('error', reject).end();
    });
}

async function getOHLCV(poolAddress, aggregate = 60) {
    const endpoint = aggregate >= 60 ? 'hour' : 'minute';
    const actualAggregate = aggregate >= 60 ? 1 : aggregate;
    const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}/ohlcv/${endpoint}?aggregate=${actualAggregate}&limit=25&currency=usd`;

    const data = await httpsRequest(url);
    return data?.data?.attributes?.ohlcv_list?.map(c => ({
        close: parseFloat(c[4]),
        volume: parseFloat(c[5])
    })) || null;
}

async function getPrice(poolAddress) {
    const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}?include=base_token`;
    const data = await httpsRequest(url);
    return parseFloat(data?.data?.attributes?.base_token_price_usd) || null;
}

function calculateBB(prices, period = 20, stdDev = 2) {
    if (prices.length < period) return null;
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

function formatPrice(p) {
    if (p < 0.000001) return `$${p.toFixed(10)}`;
    if (p < 0.01) return `$${p.toFixed(8)}`;
    if (p < 1) return `$${p.toFixed(6)}`;
    return `$${p.toFixed(2)}`;
}

async function testToken(token) {
    try {
        console.log(`\n📊 Test ${token.name}...`);

        const candles = await getOHLCV(token.pool, token.candle_interval);
        if (!candles || candles.length < BOLLINGER_PERIOD) {
            console.log(`  ❌ Données insuffisantes (${candles?.length || 0}/${BOLLINGER_PERIOD})`);
            return;
        }

        const price = await getPrice(token.pool);
        const closePrices = candles.map(c => c.close);
        const bands = calculateBB(closePrices, BOLLINGER_PERIOD, BOLLINGER_STD);

        if (!bands) {
            console.log(`  ❌ Impossible de calculer les bandes`);
            return;
        }

        const distance = ((bands.upper - price) / price * 100);
        const volume = candles[candles.length - 1].volume;
        const isBreakout = price >= bands.upper;

        console.log(`  ✅ Prix: ${formatPrice(price)}`);
        console.log(`  📈 Bande haute: ${formatPrice(bands.upper)}`);
        console.log(`  📊 Distance: ${distance.toFixed(2)}%`);
        console.log(`  💰 Volume: $${volume.toLocaleString()}`);
        console.log(`  🚨 Breakout: ${isBreakout ? 'OUI ⚠️' : 'Non'}`);

    } catch (error) {
        console.log(`  ❌ Erreur: ${error.message}`);
    }
}

async function main() {
    console.log('========================================');
    console.log('🧪 TEST MONITORING SOLANA BOLLINGER BANDS');
    console.log('========================================');
    console.log(`📊 Tokens: ${TOKENS.length}`);
    console.log(`📏 Bougies: ${TOKENS[0].candle_interval}min`);
    console.log(`📈 Bollinger: ${BOLLINGER_PERIOD} périodes, ${BOLLINGER_STD} écarts-types\n`);

    for (const token of TOKENS) {
        await testToken(token);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Pause 1s entre tokens
    }

    console.log('\n========================================');
    console.log('✅ Test terminé!');
    console.log('========================================\n');
}

main().catch(error => {
    console.error(`❌ Erreur fatale: ${error.message}`);
    process.exit(1);
});
