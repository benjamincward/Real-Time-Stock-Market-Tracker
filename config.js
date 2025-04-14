const CONFIG = {
    API_KEYS: {
        ALPHA_VANTAGE: '',
        FINNHUB: '',
        YAHOO_FINANCE: ''
    },

    DEFAULT_SYMBOLS: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA'],

    REFRESH_INTERVAL: 120000,
    ERROR_DISPLAY_TIME: 5000,

    CHART_DAYS: 30,

    ENDPOINTS: {
        ALPHA_VANTAGE_BASE: 'https://www.alphavantage.co/query',
        FINNHUB_BASE: 'https://finnhub.io/api/v1',
        YAHOO_FINANCE_BASE: 'https://apidojo-yahoo-finance-v1.p.rapidapi.com'
    },

    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    MAX_BACKOFF: 30000,

    STORAGE_KEYS: {
        SAVED_STOCKS: 'stock_tracker_saved_stocks'
    }
};

function loadConfiguration() {
    try {
        if (typeof LOCAL_CONFIG !== 'undefined') {
            if (LOCAL_CONFIG.API_KEYS) {
                Object.keys(LOCAL_CONFIG.API_KEYS).forEach(key => {
                    if (LOCAL_CONFIG.API_KEYS[key]) {
                        CONFIG.API_KEYS[key] = LOCAL_CONFIG.API_KEYS[key];
                    }
                });
                console.log('Loaded API keys from local config');
            }
        }
    } catch (e) {
        console.log('No local config found, using default settings');
    }
}

loadConfiguration();