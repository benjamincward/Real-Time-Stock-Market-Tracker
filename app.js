class StockTracker {
    constructor() {
        this.stockListElement = document.getElementById('stock-list');
        this.stockDetailsContainer = document.getElementById('stock-details-container');
        this.lastUpdatedElement = document.getElementById('last-updated');
        this.searchInput = document.getElementById('search-input');
        this.searchButton = document.getElementById('search-button');
        this.errorContainer = document.getElementById('error-container');

        this.stocks = [];
        this.selectedStock = null;
        this.chart = null;
        this.refreshTimer = null;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.searchButton.addEventListener('click', () => this.handleSearchClick());

        this.searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                this.handleSearchClick();
            }
        });
    }

    async handleSearchClick() {
        const symbol = this.searchInput.value.trim().toUpperCase();

        if (!symbol) {
            this.showError("Please enter a stock symbol");
            return;
        }

        this.searchInput.value = '';

        await this.addStockBySymbol(symbol);
    }

    async addStockBySymbol(symbol) {
        if (!symbol) return;

        if (this.stocks.some(stock => stock.symbol === symbol)) {
            const existingStock = this.stocks.find(stock => stock.symbol === symbol);
            this.selectStock(existingStock);
            return;
        }

        this.showLoading(`Adding ${symbol}...`);

        try {
            const stockData = await stockAPI.getStockQuote(symbol);

            if (!stockData) {
                throw new Error(`No data found for ${symbol}`);
            }

            const companyInfo = await stockAPI.getCompanyInfo(symbol);

            const stock = {
                ...stockData,
                name: companyInfo.name || symbol
            };

            this.stocks.push(stock);

            this.saveStocksToLocalStorage();

            this.clearError();

            this.renderStockList();

            this.selectStock(stock);

            this.updateTimestamp();

            return stock;
        } catch (error) {
            this.showError(`Failed to add ${symbol}: ${error.message}`);
            return null;
        }
    }

    async selectStock(stock) {
        this.selectedStock = stock;

        this.renderStockList();

        this.stockDetailsContainer.innerHTML = `<div class="loading">Loading ${stock.symbol} data</div>`;

        try {
            const historicalData = await stockAPI.getHistoricalData(stock.symbol);

            this.renderStockDetails(historicalData);
        } catch (error) {
            this.showError(`Failed to load historical data for ${stock.symbol}: ${error.message}`);

            this.renderStockDetails([]);
        }
    }

    renderStockList() {
        if (this.stocks.length === 0) {
            this.stockListElement.innerHTML = '<div class="no-results">No stocks added. Use the search box to add stocks.</div>';
            return;
        }

        this.stockListElement.innerHTML = '';

        this.stocks.forEach(stock => {
            const stockItem = document.createElement('div');
            stockItem.className = `stock-item ${this.selectedStock?.symbol === stock.symbol ? 'selected' : ''}`;
            stockItem.innerHTML = `
        <div class="stock-item-content">
          <div class="stock-info">
            <div class="stock-symbol">${stock.symbol}</div>
            <div class="stock-name">${stock.name}</div>
          </div>
          <div class="stock-price-info">
            <div class="stock-price">$${stock.price.toFixed(2)}</div>
            <div class="stock-change ${stock.change >= 0 ? 'positive' : 'negative'}">
              ${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)} (${stock.change >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%)
            </div>
          </div>
        </div>
      `;

            stockItem.addEventListener('click', () => this.selectStock(stock));
            this.stockListElement.appendChild(stockItem);
        });
    }

    renderStockDetails(historicalData) {
        if (!this.selectedStock) {
            this.stockDetailsContainer.innerHTML = `
        <div class="empty-state">
          Select a stock to view details
        </div>
      `;
            return;
        }

        const stock = this.selectedStock;

        const prevClose = stock.previousClose || (stock.price - stock.change);
        const open = stock.open || prevClose;
        const high = stock.high || Math.max(stock.price, prevClose);
        const low = stock.low || Math.min(stock.price, prevClose);

        this.stockDetailsContainer.innerHTML = `
      <div class="stock-details">
        <h2 class="card-title">${stock.name} (${stock.symbol})</h2>
        <div class="stock-current-price">$${stock.price.toFixed(2)}</div>
        <div class="stock-change ${stock.change >= 0 ? 'positive' : 'negative'}">
          ${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)} (${stock.change >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%)
        </div>
      </div>

      <div class="chart-container" id="stock-chart"></div>
      
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Open</div>
          <div class="metric-value">$${open.toFixed(2)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Previous Close</div>
          <div class="metric-value">$${prevClose.toFixed(2)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Day High</div>
          <div class="metric-value">$${high.toFixed(2)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Day Low</div>
          <div class="metric-value">$${low.toFixed(2)}</div>
        </div>
      </div>
    `;

        if (historicalData && historicalData.length > 0) {
            this.chart = new StockChart();
            this.chart.initialize('stock-chart');
            this.chart.render(historicalData, stock);
        }
    }

    loadStocksFromLocalStorage() {
        try {
            const savedStocks = localStorage.getItem(CONFIG.STORAGE_KEYS.SAVED_STOCKS);
            if (savedStocks) {
                const symbols = JSON.parse(savedStocks);
                return symbols;
            }
        } catch (error) {
            console.warn('Could not load stocks from local storage:', error);
        }

        return [];
    }

    saveStocksToLocalStorage() {
        try {
            const symbols = this.stocks.map(stock => stock.symbol);
            localStorage.setItem(CONFIG.STORAGE_KEYS.SAVED_STOCKS, JSON.stringify(symbols));
        } catch (error) {
            console.warn('Could not save stocks to local storage:', error);
        }
    }

    showError(message) {
        this.errorContainer.innerHTML = `<div class="error-message">${message}</div>`;

        setTimeout(() => {
            this.clearError();
        }, CONFIG.ERROR_DISPLAY_TIME);
    }

    clearError() {
        this.errorContainer.innerHTML = '';
    }

    showLoading(message) {
        this.errorContainer.innerHTML = `<div class="loading">${message}</div>`;
    }

    updateTimestamp() {
        this.lastUpdatedElement.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }

    async refreshStockData() {
        try {
            const selectedSymbol = this.selectedStock?.symbol;

            const updatedStocks = [];

            for (const stock of this.stocks) {
                try {
                    const refreshedStock = await stockAPI.getStockQuote(stock.symbol);

                    updatedStocks.push({
                        ...refreshedStock,
                        name: stock.name
                    });
                } catch (error) {
                    console.warn(`Could not refresh ${stock.symbol}:`, error);
                    updatedStocks.push(stock);
                }
            }

            this.stocks = updatedStocks;

            if (selectedSymbol) {
                this.selectedStock = this.stocks.find(stock => stock.symbol === selectedSymbol);
            }

            this.renderStockList();

            if (this.selectedStock) {
                try {
                    const historicalData = await stockAPI.getHistoricalData(this.selectedStock.symbol);
                    this.renderStockDetails(historicalData);
                } catch (error) {
                    console.warn(`Could not refresh historical data for ${this.selectedStock.symbol}:`, error);
                    this.renderStockDetails([]);
                }
            }

            this.updateTimestamp();

            this.saveStocksToLocalStorage();
        } catch (error) {
            console.error("Error refreshing stock data:", error);
            this.showError("Failed to refresh stock data. Please try again later.");
        }
    }

    async loadDefaultStocks() {
        this.showLoading('Loading stocks...');

        try {
            const savedSymbols = this.loadStocksFromLocalStorage();

            const symbolsToLoad = savedSymbols.length > 0 ? savedSymbols : CONFIG.DEFAULT_SYMBOLS;

            for (const symbol of symbolsToLoad) {
                await this.addStockBySymbol(symbol);
            }

            if (this.stocks.length > 0) {
                this.selectStock(this.stocks[0]);
            }

            this.startAutoRefresh();
        } catch (error) {
            console.error('Error loading default stocks:', error);
            this.showError('Failed to load default stocks. Please try adding stocks manually.');
        }
    }

    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(() => {
            this.refreshStockData();
        }, CONFIG.REFRESH_INTERVAL);
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    removeStock(symbol) {
        const index = this.stocks.findIndex(stock => stock.symbol === symbol);

        if (index !== -1) {
            this.stocks.splice(index, 1);

            this.saveStocksToLocalStorage();

            if (this.selectedStock && this.selectedStock.symbol === symbol) {
                this.selectedStock = this.stocks.length > 0 ? this.stocks[0] : null;

                if (this.selectedStock) {
                    this.selectStock(this.selectedStock);
                } else {
                    this.stockDetailsContainer.innerHTML = `
            <div class="empty-state">
              Select a stock to view details
            </div>
          `;
                }
            }

            this.renderStockList();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new StockTracker();
    app.loadDefaultStocks();

    window.stockTracker = app;
});