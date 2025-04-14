# Real-Time Stock Market Tracker

A sophisticated web application that provides comprehensive, real-time stock market insights through an intuitive and responsive interface. The application leverages multiple financial data APIs to deliver accurate and up-to-date stock information, demonstrating advanced front-end development techniques and robust error handling strategies.

## Features

- **Real-time Stock Data**: Retrieves and displays current stock prices, changes, and percentage movements
- **Multi-API Integration**: Implements a fallback system using Alpha Vantage and Finnhub APIs
- **Interactive Stock Charts**: Visualizes historical price data with interactive hover elements using D3.js
- **Responsive Design**: Adapts seamlessly to different screen sizes with a modern UI
- **Local Storage**: Remembers your favorite stocks between sessions
- **Automatic Refresh**: Updates stock data at regular intervals
- **Error Handling**: Robust error management with exponential backoff retry mechanism
- **Loading States**: Clear visual indicators during data fetching operations

## Technologies Used

- **HTML5/CSS3**: Modern layout with CSS Grid and Flexbox
- **JavaScript (ES6+)**: Object-oriented approach with classes
- **D3.js**: Advanced data visualization for stock charts
- **REST APIs**: Integration with financial data providers
- **Local Storage API**: For persisting user preferences

## API Integration

The application integrates with the following financial APIs:

- **Alpha Vantage**: Primary source for stock quotes and historical data
- **Finnhub**: Secondary source when Alpha Vantage is unavailable

The system implements an intelligent failover mechanism that:
1. Attempts to fetch data from the primary API
2. Falls back to the secondary API if the primary fails
3. Implements exponential backoff for retries
4. Provides mock data as a last resort if all APIs fail

## Architecture

The application follows a modular architecture with clear separation of concerns:

- **api.js**: Handles all external API communications
- **chart.js**: Manages chart creation and interactions using D3.js
- **app.js**: Core application logic and UI management
- **config.js**: Configuration parameters and settings

## Code Highlights

### API Failover System

```javascript
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
```

### Interactive D3.js Chart

```javascript
addInteractiveElements(svg, x, y) {
    const self = this;

    // Interactive elements code
    svg.append('rect')
        .attr('width', this.width)
        .attr('height', this.height)
        .attr('fill', 'none')
        .attr('pointer-events', 'all')
        .on('mouseover', function () {
            mouseG.style('opacity', 1);
        })
        .on('mouseout', function () {
            mouseG.style('opacity', 0);
            self.tooltip.style('visibility', 'hidden');
        })
        .on('mousemove', function (event) {
            const mouse = d3.pointer(event);
            
            // Tooltip positioning and data display logic
            mouseG.select('.mouse-line')
                .attr('x1', mouse[0])
                .attr('x2', mouse[0]);
                
            // Find closest data point for the tooltip
            const xPos = mouse[0];
            const sortedData = [...self.stockData].sort((a, b) =>
                Math.abs(x(a.date) - xPos) - Math.abs(x(b.date) - xPos)
            );
            const closest = sortedData[0];
            
            // Display tooltip with detailed information
            if (closest) {
                self.tooltip
                    .style('visibility', 'visible')
                    .html(`
                      <strong>Date:</strong> ${closest.date}<br>
                      <strong>Price:</strong> $${closest.price.toFixed(2)}
                      // Additional data fields
                    `)
                    .style('top', (event.pageY - 10) + 'px')
                    .style('left', (event.pageX + 10) + 'px');
                    
                // Highlight the data point
                svg.selectAll('.dot')
                    .style('opacity', 0);
                svg.selectAll('.dot')
                    .filter(d => d.date === closest.date)
                    .style('opacity', 1);
            }
        });
}
```

## Installation and Setup

1. Clone the repository:
```
git clone https://github.com/username/real-time-stock-market-tracker.git
```

2. Navigate to the project directory:
```
cd real-time-stock-market-tracker
```

3. Create a `config.local.js` file with your API keys:
```javascript
const LOCAL_CONFIG = {
    API_KEYS: {
        ALPHA_VANTAGE: 'YOUR_ALPHA_VANTAGE_API_KEY',
        FINNHUB: 'YOUR_FINNHUB_API_KEY',
    }
};
```

4. Open `index.html` in your browser or set up a local server.

## API Key Management

The application requires API keys from the following services:
- [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
- [Finnhub](https://finnhub.io/register)

For security reasons, API keys should be stored in the `config.local.js` file which is excluded from version control.

## Future Enhancements

- Add additional data providers for more robustness
- Implement WebSocket connections for real-time updates
- Add portfolio tracking with performance metrics
- Include financial news related to followed stocks
- Develop more advanced technical analysis tools
- Create user accounts for cross-device synchronization

## Author

Benjamin C. Ward