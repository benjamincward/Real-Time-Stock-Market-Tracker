class StockChart {
    constructor() {
        this.chartContainer = null;
        this.tooltip = null;
        this.stockData = null;
        this.width = 0;
        this.height = 0;
        this.margin = { top: 20, right: 30, bottom: 30, left: 60 };
        this.resizeTimer = null;
    }

    initialize(containerId) {
        this.chartContainer = document.getElementById(containerId);
        if (!this.chartContainer) {
            console.error(`Chart container with ID ${containerId} not found`);
            return;
        }

        this.chartContainer.innerHTML = '';

        if (d3.select('body').select('.chart-tooltip').size() > 0) {
            d3.select('.chart-tooltip').remove();
        }

        this.tooltip = d3.select('body')
            .append('div')
            .attr('class', 'chart-tooltip')
            .style('position', 'absolute')
            .style('visibility', 'hidden');
    }

    render(data, stockInfo) {
        if (!this.chartContainer || !data || data.length === 0) {
            return;
        }

        this.stockData = data;
        this.stockInfo = stockInfo;

        this.chartContainer.innerHTML = '';

        this.width = this.chartContainer.clientWidth - this.margin.left - this.margin.right;
        this.height = this.chartContainer.clientHeight - this.margin.top - this.margin.bottom;

        const svg = d3.select(this.chartContainer)
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        const x = this.createXScale();
        const y = this.createYScale();

        this.addAxes(svg, x, y);

        this.addPriceLine(svg, x, y, stockInfo);

        this.addInteractiveElements(svg, x, y);

        this.setupResizeHandler();
    }

    createXScale() {
        return d3.scalePoint()
            .domain(this.stockData.map(d => d.date))
            .range([0, this.width]);
    }

    createYScale() {
        const minPrice = d3.min(this.stockData, d => d.low || d.price) * 0.95;
        const maxPrice = d3.max(this.stockData, d => d.high || d.price) * 1.05;

        return d3.scaleLinear()
            .domain([minPrice, maxPrice])
            .range([this.height, 0]);
    }

    addAxes(svg, x, y) {
        svg.append('g')
            .attr('class', 'chart-axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x).tickValues(x.domain().filter((d, i) => i % 5 === 0)));

        svg.append('g')
            .attr('class', 'chart-axis')
            .call(d3.axisLeft(y).ticks(5).tickFormat(d => `$${d.toFixed(2)}`));

        svg.append('g')
            .attr('class', 'chart-grid')
            .call(d3.axisLeft(y).ticks(5).tickSize(-this.width).tickFormat(''));
    }

    addPriceLine(svg, x, y, stockInfo) {
        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.price))
            .curve(d3.curveMonotoneX);

        const isPositive = stockInfo && stockInfo.change >= 0;
        const lineColor = isPositive ? 'var(--green-color)' : 'var(--red-color)';

        svg.append('path')
            .datum(this.stockData)
            .attr('fill', 'none')
            .attr('stroke', lineColor)
            .attr('stroke-width', 2)
            .attr('d', line);

        const areaGenerator = d3.area()
            .x(d => x(d.date))
            .y0(this.height)
            .y1(d => y(d.price))
            .curve(d3.curveMonotoneX);

        const gradientId = `area-gradient-${stockInfo.symbol}`;

        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', gradientId)
            .attr('x1', '0%').attr('y1', '0%')
            .attr('x2', '0%').attr('y2', '100%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', lineColor)
            .attr('stop-opacity', 0.3);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', lineColor)
            .attr('stop-opacity', 0);

        svg.append('path')
            .datum(this.stockData)
            .attr('fill', `url(#${gradientId})`)
            .attr('d', areaGenerator);
    }

    addInteractiveElements(svg, x, y) {
        const self = this;

        svg.selectAll('.dot')
            .data(this.stockData)
            .enter()
            .append('circle')
            .attr('class', 'dot')
            .attr('cx', d => x(d.date))
            .attr('cy', d => y(d.price))
            .attr('r', 4)
            .attr('fill', 'white')
            .attr('stroke', this.stockInfo && this.stockInfo.change >= 0 ? 'var(--green-color)' : 'var(--red-color)')
            .attr('stroke-width', 2)
            .style('opacity', 0)
            .on('mouseover', function (event, d) {
                d3.select(this).style('opacity', 1);

                self.tooltip
                    .style('visibility', 'visible')
                    .html(`
            <strong>Date:</strong> ${d.date}<br>
            <strong>Price:</strong> $${d.price.toFixed(2)}
            ${d.open ? `<br><strong>Open:</strong> $${d.open.toFixed(2)}` : ''}
            ${d.high ? `<br><strong>High:</strong> $${d.high.toFixed(2)}` : ''}
            ${d.low ? `<br><strong>Low:</strong> $${d.low.toFixed(2)}` : ''}
            ${d.volume ? `<br><strong>Volume:</strong> ${d.volume.toLocaleString()}` : ''}
          `);
            })
            .on('mousemove', function (event) {
                self.tooltip
                    .style('top', (event.pageY - 10) + 'px')
                    .style('left', (event.pageX + 10) + 'px');
            })
            .on('mouseout', function () {
                d3.select(this).style('opacity', 0);
                self.tooltip.style('visibility', 'hidden');
            });

        const mouseG = svg.append('g')
            .attr('class', 'mouse-over-effects')
            .style('opacity', 0);

        mouseG.append('line')
            .attr('class', 'mouse-line')
            .attr('y1', 0)
            .attr('y2', this.height)
            .style('stroke', 'var(--gray-500)')
            .style('stroke-width', '1px')
            .style('opacity', '0.5');

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

                mouseG.select('.mouse-line')
                    .attr('x1', mouse[0])
                    .attr('x2', mouse[0]);

                const xPos = mouse[0];
                const sortedData = [...self.stockData].sort((a, b) =>
                    Math.abs(x(a.date) - xPos) - Math.abs(x(b.date) - xPos)
                );
                const closest = sortedData[0];

                if (closest) {
                    self.tooltip
                        .style('visibility', 'visible')
                        .html(`
              <strong>Date:</strong> ${closest.date}<br>
              <strong>Price:</strong> $${closest.price.toFixed(2)}
              ${closest.open ? `<br><strong>Open:</strong> $${closest.open.toFixed(2)}` : ''}
              ${closest.high ? `<br><strong>High:</strong> $${closest.high.toFixed(2)}` : ''}
              ${closest.low ? `<br><strong>Low:</strong> $${closest.low.toFixed(2)}` : ''}
              ${closest.volume ? `<br><strong>Volume:</strong> ${closest.volume.toLocaleString()}` : ''}
            `)
                        .style('top', (event.pageY - 10) + 'px')
                        .style('left', (event.pageX + 10) + 'px');

                    svg.selectAll('.dot')
                        .style('opacity', 0);

                    svg.selectAll('.dot')
                        .filter(d => d.date === closest.date)
                        .style('opacity', 1);
                }
            });
    }

    setupResizeHandler() {
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => {
                if (this.stockData && this.stockData.length > 0) {
                    this.render(this.stockData, this.stockInfo);
                }
            }, 250);
        });
    }
}