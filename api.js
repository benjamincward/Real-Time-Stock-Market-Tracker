class StockAPI {
    constructor() {
        this.alphaVantageKey = CONFIG.API_KEYS.ALPHA_VANTAGE;
        this.finnhubKey = CONFIG.API_KEYS.FINNHUB;
        this.yahooFinanceKey = CONFIG.API_KEYS.YAHOO_FINANCE;
        this.retryCount = 0;
    }

    async getStockQuote(symbol) {
        try {
            const quoteData = await this.getAlphaVantageQuote(symbol);
            this.retryCount = 0;
            return quoteData;
        } catch (error) {
            console.warn(`Alpha Vantage API failed for ${symbol}:`, error);

            try {
                const finnhubData = await this.getFinnhubQuote(symbol);
                this.retryCount = 0;
                return finnhubData;
            } catch (finnError) {
                console.warn(`Finnhub API failed for ${symbol}:`, finnError);

                if (this.retryCount < CONFIG.MAX_RETRIES) {
                    this.retryCount++;
                    const backoffTime = Math.min(
                        CONFIG.RETRY_DELAY * Math.pow(2, this.retryCount - 1),
                        CONFIG.MAX_BACKOFF
                    );
                    await new Promise(resolve => setTimeout(resolve, backoffTime));
                    return this.getStockQuote(symbol);
                }

                console.warn(`All APIs failed for ${symbol}, using mock data`);
                return this.generateMockQuote(symbol);
            }
        }
    }

    async getHistoricalData(symbol) {
        try {
            const histData = await this.getAlphaVantageHistorical(symbol);
            this.retryCount = 0;
            return histData;
        } catch (error) {
            console.warn(`Alpha Vantage historical data failed for ${symbol}:`, error);

            try {
                const finnhubData = await this.getFinnhubHistorical(symbol);
                this.retryCount = 0;
                return finnhubData;
            } catch (finnError) {
                console.warn(`Finnhub historical data failed for ${symbol}:`, finnError);

                if (this.retryCount < CONFIG.MAX_RETRIES) {
                    this.retryCount++;
                    const backoffTime = Math.min(
                        CONFIG.RETRY_DELAY * Math.pow(2, this.retryCount - 1),
                        CONFIG.MAX_BACKOFF
                    );
                    await new Promise(resolve => setTimeout(resolve, backoffTime));
                    return this.getHistoricalData(symbol);
                }

                console.warn(`All APIs failed for historical data of ${symbol}, using mock data`);
                return this.generateMockHistorical(symbol);
            }
        }
    }

    async getCompanyInfo(symbol) {
        try {
            const url = `${CONFIG.ENDPOINTS.ALPHA_VANTAGE_BASE}?function=OVERVIEW&symbol=${symbol}&apikey=${this.alphaVantageKey}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.Symbol && data.Name) {
                return {
                    name: data.Name,
                    sector: data.Sector || '',
                    industry: data.Industry || '',
                    description: data.Description || ''
                };
            }

            throw new Error('Invalid company data');
        } catch (error) {
            console.warn(`Could not fetch company info for ${symbol}:`, error);

            try {
                const url = `${CONFIG.ENDPOINTS.FINNHUB_BASE}/stock/profile2?symbol=${symbol}&token=${this.finnhubKey}`;
                const response = await fetch(url);
                const data = await response.json();

                if (data.name) {
                    return {
                        name: data.name,
                        sector: data.finnhubIndustry || '',
                        industry: data.finnhubIndustry || '',
                        description: ''
                    };
                }

                throw new Error('Invalid Finnhub company data');
            } catch (finnError) {
                console.warn(`Finnhub company info failed for ${symbol}:`, finnError);

                return {
                    name: symbol,
                    sector: '',
                    industry: '',
                    description: ''
                };
            }
        }
    }

    async getAlphaVantageQuote(symbol) {
        if (!this.alphaVantageKey) {
            throw new Error('Alpha Vantage API key not configured');
        }

        const url = `${CONFIG.ENDPOINTS.ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.alphaVantageKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data['Error Message']) {
            throw new Error(data['Error Message']);
        }

        if (data['Note']) {
            console.warn('Alpha Vantage API limit reached:', data['Note']);
            throw new Error('API call frequency limit reached');
        }

        if (!data['Global Quote'] || Object.keys(data['Global Quote']).length === 0) {
            throw new Error(`No data found for symbol: ${symbol}`);
        }

        const quote = data['Global Quote'];

        return {
            symbol: symbol,
            price: parseFloat(quote['05. price']),
            change: parseFloat(quote['09. change']),
            changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
            volume: parseInt(quote['06. volume'], 10) || 0,
            previousClose: parseFloat(quote['08. previous close']) || 0,
            open: parseFloat(quote['02. open']) || 0,
            high: parseFloat(quote['03. high']) || 0,
            low: parseFloat(quote['04. low']) || 0
        };
    }

    async getFinnhubQuote(symbol) {
        if (!this.finnhubKey) {
            throw new Error('Finnhub API key not configured');
        }

        const quoteUrl = `${CONFIG.ENDPOINTS.FINNHUB_BASE}/quote?symbol=${symbol}&token=${this.finnhubKey}`;
        const quoteResponse = await fetch(quoteUrl);
        const quoteData = await quoteResponse.json();

        if (quoteData.error) {
            throw new Error(quoteData.error);
        }

        if (!quoteData.c || quoteData.c === 0) {
            throw new Error(`No valid price data for ${symbol}`);
        }

        return {
            symbol: symbol,
            price: quoteData.c,
            change: quoteData.d,
            changePercent: quoteData.dp,
            volume: quoteData.v || 0,
            previousClose: quoteData.pc || 0,
            open: quoteData.o || 0,
            high: quoteData.h || 0,
            low: quoteData.l || 0
        };
    }

    async getAlphaVantageHistorical(symbol) {
        if (!this.alphaVantageKey) {
            throw new Error('Alpha Vantage API key not configured');
        }

        const url = `${CONFIG.ENDPOINTS.ALPHA_VANTAGE_BASE}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${this.alphaVantageKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data['Error Message']) {
            throw new Error(data['Error Message']);
        }

        if (data['Note']) {
            console.warn('Alpha Vantage API limit reached:', data['Note']);
            throw new Error('API call frequency limit reached');
        }

        if (!data['Time Series (Daily)']) {
            throw new Error(`No historical data found for ${symbol}`);
        }

        const timeSeriesData = data['Time Series (Daily)'];
        const chartData = [];

        const dates = Object.keys(timeSeriesData).sort();

        const recentDates = dates.slice(-CONFIG.CHART_DAYS);

        recentDates.forEach(date => {
            const values = timeSeriesData[date];
            chartData.push({
                date: this.formatDate(date),
                price: parseFloat(values['4. close']),
                open: parseFloat(values['1. open']),
                high: parseFloat(values['2. high']),
                low: parseFloat(values['3. low']),
                volume: parseInt(values['5. volume'], 10)
            });
        });

        return chartData;
    }

    async getFinnhubHistorical(symbol) {
        if (!this.finnhubKey) {
            throw new Error('Finnhub API key not configured');
        }

        const endDate = Math.floor(Date.now() / 1000);
        const startDate = Math.floor(new Date(Date.now() - (CONFIG.CHART_DAYS * 24 * 60 * 60 * 1000)).getTime() / 1000);

        const url = `${CONFIG.ENDPOINTS.FINNHUB_BASE}/stock/candle?symbol=${symbol}&resolution=D&from=${startDate}&to=${endDate}&token=${this.finnhubKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error || data.s === 'no_data') {
            throw new Error(`No historical data available for ${symbol}`);
        }

        const chartData = [];

        for (let i = 0; i < data.t.length; i++) {
            const timestamp = data.t[i] * 1000;
            const date = new Date(timestamp);

            chartData.push({
                date: this.formatDate(date.toISOString().split('T')[0]),
                price: data.c[i],
                open: data.o[i],
                high: data.h[i],
                low: data.l[i],
                volume: data.v[i]
            });
        }

        return chartData;
    }

    generateMockQuote(symbol) {
        const symbolSeed = this.getSymbolSeed(symbol);
        const basePrice = 50 + (symbolSeed % 450);
        const changePercent = (Math.sin(symbolSeed) * 5).toFixed(2);
        const change = (basePrice * (changePercent / 100)).toFixed(2);

        return {
            symbol: symbol,
            price: basePrice,
            change: parseFloat(change),
            changePercent: parseFloat(changePercent),
            volume: 1000000 + (symbolSeed * 100000),
            previousClose: basePrice - parseFloat(change),
            open: basePrice - (parseFloat(change) / 2),
            high: basePrice + (Math.abs(parseFloat(change)) * 0.5),
            low: basePrice - (Math.abs(parseFloat(change)) * 0.5)
        };
    }

    generateMockHistorical(symbol) {
        const chartData = [];
        const symbolSeed = this.getSymbolSeed(symbol);
        let basePrice = 50 + (symbolSeed % 450);

        for (let i = CONFIG.CHART_DAYS; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);

            const dayVariation = Math.sin(i * 0.5 + symbolSeed * 0.1) * 5;
            basePrice = basePrice + (basePrice * (dayVariation / 100));

            chartData.push({
                date: this.formatDate(date.toISOString().split('T')[0]),
                price: parseFloat(basePrice.toFixed(2)),
                open: parseFloat((basePrice - (basePrice * 0.01)).toFixed(2)),
                high: parseFloat((basePrice + (basePrice * 0.02)).toFixed(2)),
                low: parseFloat((basePrice - (basePrice * 0.02)).toFixed(2)),
                volume: 1000000 + Math.floor(Math.random() * 5000000)
            });
        }

        return chartData;
    }

    getSymbolSeed(symbol) {
        return symbol.split('').reduce((acc, char, i) => acc + (char.charCodeAt(0) * (i + 1)), 0);
    }

    formatDate(dateString) {
        const [year, month, day] = dateString.split('-');
        return `${month}/${day}`;
    }
}

const stockAPI = new StockAPI();