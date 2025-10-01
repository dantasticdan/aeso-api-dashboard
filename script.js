class PoolPriceDashboard {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.sortField = '';
        this.sortDirection = 'asc';
        this.apiBaseUrl = 'https://apimgw.aeso.ca/public/poolprice-api/v1.1';
        this.smpApiBaseUrl = 'https://apimgw.aeso.ca/public/systemmarginalprice-api/v1.1';
        this.chart = null;
        this.smpData = [];
        this.refreshInterval = null;
        
        // Kasa integration
        this.kasaApiUrl = 'http://localhost:3001/api';
        this.kasaStatus = null;
        
        this.initializeElements();
        this.bindEvents();
        this.setDefaultDate();
        this.initializeChart();
        this.fetchCurrentSMP();
        this.fetchHistoricalSMP();
        this.startAutoRefresh();
        this.initializeKasaIntegration();
        this.updateStatus('Ready to fetch pool price data');
    }

    initializeElements() {
        this.elements = {
            startDate: document.getElementById('startDate'),
            endDate: document.getElementById('endDate'),
            fetchBtn: document.getElementById('fetchBtn'),
            sortSelect: document.getElementById('sortSelect'),
            statusText: document.getElementById('statusText'),
            itemCount: document.getElementById('itemCount'),
            loading: document.getElementById('loading'),
            errorMessage: document.getElementById('errorMessage'),
            dataGrid: document.getElementById('dataGrid'),
            pagination: document.getElementById('pagination'),
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn'),
            pageInfo: document.getElementById('pageInfo'),
            priceChart: document.getElementById('priceChart'),
            refreshSmpBtn: document.getElementById('refreshSmpBtn'),
            currentSmpPrice: document.getElementById('currentSmpPrice'),
            currentSmpDateTime: document.getElementById('currentSmpDateTime'),
            currentSmpVolume: document.getElementById('currentSmpVolume'),
            currentSmpPriceMWh: document.getElementById('currentSmpPriceMWh'),
            smpLastUpdated: document.getElementById('smpLastUpdated'),
            autoRefreshStatus: document.getElementById('autoRefreshStatus'),
            previousSmpData: document.getElementById('previousSmpData'),
            // Kasa elements
            toggleSwitchBtn: document.getElementById('toggleSwitchBtn'),
            runAutomationBtn: document.getElementById('runAutomationBtn'),
            automationEnabled: document.getElementById('automationEnabled'),
            priceThreshold: document.getElementById('priceThreshold'),
            updateThresholdBtn: document.getElementById('updateThresholdBtn'),
            switchStatusText: document.getElementById('switchStatusText'),
            statusIndicator: document.getElementById('statusIndicator'),
            logContent: document.getElementById('logContent')
        };
    }

    bindEvents() {
        this.elements.fetchBtn.addEventListener('click', () => this.fetchData());
        this.elements.refreshSmpBtn.addEventListener('click', () => this.fetchCurrentSMP());
        this.elements.sortSelect.addEventListener('change', () => this.sortData());
        this.elements.prevBtn.addEventListener('click', () => this.previousPage());
        this.elements.nextBtn.addEventListener('click', () => this.nextPage());
        
        // Kasa events
        this.elements.toggleSwitchBtn.addEventListener('click', () => this.toggleKasaSwitch());
        this.elements.runAutomationBtn.addEventListener('click', () => this.runKasaAutomation());
        this.elements.updateThresholdBtn.addEventListener('click', () => this.updateKasaThreshold());
        this.elements.automationEnabled.addEventListener('change', () => this.toggleKasaAutomation());
        
        // Allow Enter key to fetch data from date inputs
        this.elements.startDate.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.fetchData();
            }
        });
        this.elements.endDate.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.fetchData();
            }
        });
    }

    setDefaultDate() {
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        this.elements.startDate.value = today;
    }

    initializeChart() {
        const ctx = this.elements.priceChart.getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Pool Price',
                        data: [],
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Forecast Price',
                        data: [],
                        borderColor: '#f093fb',
                        backgroundColor: 'rgba(240, 147, 251, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Pool Price Trends Over Time',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Date/Time'
                        },
                        ticks: {
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Price (CAD)'
                        },
                        beginAtZero: false
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    validateDates() {
        const startDate = this.elements.startDate.value;
        const endDate = this.elements.endDate.value;
        
        if (!startDate) {
            this.showError('Please select a start date');
            return false;
        }
        
        if (endDate && endDate < startDate) {
            this.showError('End date must be after start date');
            return false;
        }
        
        // Check if start date is not in the future
        const today = new Date().toISOString().split('T')[0];
        if (startDate > today) {
            this.showError('Start date cannot be in the future');
            return false;
        }
        
        if (endDate && endDate > today) {
            this.showError('End date cannot be in the future');
            return false;
        }
        
        return true;
    }

    async fetchData() {
        if (!this.validateDates()) {
            return;
        }

        const startDate = this.elements.startDate.value;
        const endDate = this.elements.endDate.value;
        
        // Build API URL using our backend
        let url = `${this.kasaApiUrl}/pool-price?startDate=${startDate}`;
        if (endDate) {
            url += `&endDate=${endDate}`;
        }

        this.showLoading(true);
        this.hideError();
        this.updateStatus('Fetching pool price data...');

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Unauthorized - API key required. Please check your API key configuration.');
                } else if (response.status === 403) {
                    throw new Error('Forbidden - Access denied. Please check your API permissions.');
                } else if (response.status === 404) {
                    throw new Error('Not Found - The requested data may not be available for the selected date range.');
                } else if (response.status === 500) {
                    throw new Error('Server Error - AESO API is experiencing issues. Please try again later.');
                } else if (response.status === 503) {
                    throw new Error('Service Unavailable - AESO API is temporarily unavailable.');
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }

            const data = await response.json();
            
            // Handle our backend API response structure
            if (data && data.success && data.data && Array.isArray(data.data)) {
                this.data = data.data;
            } else {
                console.error('Unexpected data format:', data);
                throw new Error('Invalid data format received from backend API');
            }

            this.filteredData = [...this.data];
            this.currentPage = 1;
            this.displayData();
            this.updateChart();
            this.updateStatus(`Successfully loaded ${this.data.length} pool price records`);
            this.updateItemCount();

        } catch (error) {
            console.error('Error fetching pool price data:', error);
            this.showError(`Failed to fetch pool price data: ${error.message}`);
            this.updateStatus('Error occurred while fetching data');
        } finally {
            this.showLoading(false);
        }
    }

    filterData() {
        // No search functionality - show all data
        this.filteredData = [...this.data];
        this.currentPage = 1;
        this.displayData();
        this.updateItemCount();
    }

    sortData() {
        const sortField = this.elements.sortSelect.value;
        
        if (!sortField) {
            this.filteredData = [...this.data];
        } else {
            this.filteredData.sort((a, b) => {
                let aVal = a[sortField];
                let bVal = b[sortField];
                
                // Handle different data types
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return aVal.localeCompare(bVal);
                } else if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return aVal - bVal;
                } else {
                    // Convert to string for comparison
                    return String(aVal).localeCompare(String(bVal));
                }
            });
        }
        
        this.currentPage = 1;
        this.displayData();
    }

    displayData() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.filteredData.slice(startIndex, endIndex);

        this.elements.dataGrid.innerHTML = '';

        if (pageData.length === 0) {
            this.elements.dataGrid.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-inbox"></i>
                    <h3>No data found</h3>
                    <p>Try adjusting your search or check the API endpoint.</p>
                </div>
            `;
            this.elements.pagination.style.display = 'none';
            return;
        }

        pageData.forEach(item => {
            const dataItem = this.createDataItem(item);
            this.elements.dataGrid.appendChild(dataItem);
        });

        this.updatePagination();
    }

    createDataItem(item) {
        const div = document.createElement('div');
        div.className = 'data-item';

        // Format the datetime for display
        const utcTime = this.formatDateTime(item.begin_datetime_utc);
        const mptTime = this.formatDateTime(item.begin_datetime_mpt);
        
        // Format prices with proper currency formatting
        const poolPrice = this.formatPrice(item.pool_price);
        const forecastPrice = this.formatPrice(item.forecast_pool_price);
        const avgPrice = this.formatPrice(item.rolling_30day_avg);

        div.innerHTML = `
            <div class="price-header">
                <h3><i class="fas fa-clock"></i> ${utcTime}</h3>
                <span class="price-badge">$${poolPrice}</span>
            </div>
            <div class="price-details">
                <div class="price-row">
                    <span class="price-label">Pool Price:</span>
                    <span class="price-value primary">$${poolPrice}</span>
                </div>
                <div class="price-row">
                    <span class="price-label">Forecast Price:</span>
                    <span class="price-value">$${forecastPrice}</span>
                </div>
                <div class="price-row">
                    <span class="price-label">30-Day Average:</span>
                    <span class="price-value">$${avgPrice}</span>
                </div>
                <div class="time-info">
                    <p><strong>UTC Time:</strong> ${utcTime}</p>
                    <p><strong>MPT Time:</strong> ${mptTime}</p>
                </div>
            </div>
        `;

        return div;
    }

    formatDateTime(dateTimeString) {
        if (!dateTimeString) return 'N/A';
        
        try {
            const date = new Date(dateTimeString);
            return date.toLocaleString('en-CA', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } catch (error) {
            return dateTimeString;
        }
    }

    formatPrice(priceString) {
        if (!priceString || priceString === 'null' || priceString === 'undefined') {
            return 'N/A';
        }
        
        const price = parseFloat(priceString);
        if (isNaN(price)) {
            return priceString;
        }
        
        return price.toFixed(2);
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
        
        if (totalPages <= 1) {
            this.elements.pagination.style.display = 'none';
            return;
        }

        this.elements.pagination.style.display = 'flex';
        this.elements.prevBtn.disabled = this.currentPage === 1;
        this.elements.nextBtn.disabled = this.currentPage === totalPages;
        
        this.elements.pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.displayData();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.displayData();
        }
    }

    updateStatus(message) {
        this.elements.statusText.textContent = message;
    }

    updateItemCount() {
        const count = this.filteredData.length;
        this.elements.itemCount.textContent = `${count} item${count !== 1 ? 's' : ''}`;
    }

    showLoading(show) {
        this.elements.loading.style.display = show ? 'block' : 'none';
        this.elements.fetchBtn.disabled = show;
    }

    showError(message) {
        this.elements.errorMessage.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
        `;
        this.elements.errorMessage.style.display = 'flex';
    }

    hideError() {
        this.elements.errorMessage.style.display = 'none';
    }

    updateChart() {
        if (!this.chart || !this.data || this.data.length === 0) {
            return;
        }

        // Sort data by datetime for proper chart display
        const sortedData = [...this.data].sort((a, b) => 
            new Date(a.begin_datetime_utc) - new Date(b.begin_datetime_utc)
        );

        // Prepare chart data using MPT time
        const labels = sortedData.map(item => {
            const date = new Date(item.begin_datetime_mpt);
            return date.toLocaleString('en-CA', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        });

        const poolPrices = sortedData.map(item => parseFloat(item.pool_price) || 0);
        const forecastPrices = sortedData.map(item => parseFloat(item.forecast_pool_price) || 0);

        // Update chart data
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = poolPrices;
        this.chart.data.datasets[1].data = forecastPrices;

        // Update chart
        this.chart.update('active');
    }


    async fetchCurrentSMP() {
        const url = `${this.kasaApiUrl}/price`;
        
        try {
            this.elements.refreshSmpBtn.disabled = true;
            this.elements.refreshSmpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Handle our backend API response structure
            if (data && data.success && data.data) {
                // Convert our backend format to the expected format
                this.smpData = [{
                    begin_datetime_utc: data.data.raw.begin_datetime_utc,
                    begin_datetime_mpt: data.data.raw.begin_datetime_mpt,
                    system_marginal_price: data.data.raw.system_marginal_price,
                    volume: data.data.raw.volume
                }];
            } else {
                throw new Error('Invalid data format received from backend API');
            }

            this.updateSMPDisplay();

        } catch (error) {
            console.error('Error fetching current SMP:', error);
            this.elements.currentSmpPrice.textContent = 'Error';
            this.elements.currentSmpDateTime.textContent = 'Failed to load';
            this.elements.currentSmpVolume.textContent = '--';
            this.elements.smpLastUpdated.textContent = new Date().toLocaleTimeString();
        } finally {
            this.elements.refreshSmpBtn.disabled = false;
            this.elements.refreshSmpBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        }
    }

    updateSMPDisplay() {
        if (!this.smpData || this.smpData.length === 0) {
        this.elements.currentSmpPrice.textContent = 'No Data';
        this.elements.currentSmpDateTime.textContent = '--';
        this.elements.currentSmpVolume.textContent = '--';
        this.elements.currentSmpPriceMWh.textContent = '--';
        this.elements.smpLastUpdated.textContent = new Date().toLocaleTimeString();
        this.elements.autoRefreshStatus.textContent = 'Every 15 min';
            return;
        }

        // Get the most recent SMP data
        const latestSMP = this.smpData[0];
        
        // Safely convert and format the price from $/MWh to ¢/kWh
        const pricePerMWh = parseFloat(latestSMP.system_marginal_price);
        const pricePerKWh = isNaN(pricePerMWh) ? null : pricePerMWh / 10; // Convert $/MWh to ¢/kWh
        const formattedPrice = pricePerKWh === null ? 'N/A' : `${pricePerKWh.toFixed(2)}¢/kWh`;
        this.elements.currentSmpPrice.textContent = formattedPrice;
        
        // Format MPT datetime
        const mptDate = new Date(latestSMP.begin_datetime_mpt);
        this.elements.currentSmpDateTime.textContent = mptDate.toLocaleString('en-CA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        
        this.elements.currentSmpVolume.textContent = `${latestSMP.volume} MW`;
        
        // Display original price in $/MWh
        const originalPrice = isNaN(pricePerMWh) ? 'N/A' : `$${pricePerMWh.toFixed(2)}/MWh`;
        this.elements.currentSmpPriceMWh.textContent = originalPrice;
        
        this.elements.smpLastUpdated.textContent = new Date().toLocaleTimeString();
        this.elements.autoRefreshStatus.textContent = 'Every 15 min';

        // Don't update previous values here - they're handled by fetchHistoricalSMP()
    }

    // This method is no longer used - historical data is handled by updateHistoricalSMPDisplay()

    async fetchHistoricalSMP() {
        // Fetch historical SMP data for the previous values section
        const today = new Date().toISOString().split('T')[0];
        const url = `${this.kasaApiUrl}/price?startDate=${today}`;
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.log('Historical SMP fetch failed:', response.status);
                return;
            }

            const data = await response.json();
            
            // Handle our backend API response structure
            let historicalData = [];
            if (data && data.success && data.data) {
                // For now, just use the current data as historical
                historicalData = [data.data.raw];
            }

            if (historicalData.length > 1) {
                // Sort by datetime and get the most recent entries (excluding current)
                const sortedData = historicalData.sort((a, b) => 
                    new Date(b.begin_datetime_utc) - new Date(a.begin_datetime_utc)
                );
                
                // Update the previous values display
                this.updateHistoricalSMPDisplay(sortedData.slice(1, 4)); // Skip first (current) and take next 3
            } else {
                this.elements.previousSmpData.innerHTML = '<p class="no-data">No previous data available for today</p>';
            }

        } catch (error) {
            console.log('Error fetching historical SMP:', error);
        }
    }

    updateHistoricalSMPDisplay(historicalData) {
        if (!historicalData || historicalData.length === 0) {
            this.elements.previousSmpData.innerHTML = '<p class="no-data">No previous data available</p>';
            return;
        }

        const previousHTML = historicalData.map((smp) => {
            const mptDate = new Date(smp.begin_datetime_mpt);
            const formattedDate = mptDate.toLocaleString('en-CA', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

            // Safely format the price in $/MWh
            const pricePerMWh = parseFloat(smp.system_marginal_price);
            const formattedPrice = isNaN(pricePerMWh) ? 'N/A' : `$${pricePerMWh.toFixed(2)}/MWh`;

            return `
                <div class="previous-item">
                    <div class="previous-price">${formattedPrice}</div>
                    <div class="previous-details">
                        <span class="previous-time">${formattedDate}</span>
                        <span class="previous-volume">${smp.volume} MW</span>
                    </div>
                </div>
            `;
        }).join('');

        console.log('Generated HTML for previous values:', previousHTML);
        this.elements.previousSmpData.innerHTML = previousHTML;
    }

    startAutoRefresh() {
        // Clear any existing interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Set up auto-refresh every 15 minutes (900,000 milliseconds)
        this.refreshInterval = setInterval(() => {
            console.log('Auto-refreshing data...');
            this.fetchCurrentSMP();
            this.fetchHistoricalSMP();
            
            // Auto-refresh pool price data if we have valid dates selected
            if (this.elements.startDate.value) {
                console.log('Auto-refreshing pool price data...');
                this.fetchData();
            }
        }, 15 * 60 * 1000); // 15 minutes

        console.log('Auto-refresh started: data will update every 15 minutes');
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('Auto-refresh stopped');
        }
    }

    async getApiKey() {
        // First try local config (for development)
        if (window.AESO_API_KEY && window.AESO_API_KEY !== 'YOUR_API_KEY_HERE') {
            return window.AESO_API_KEY;
        }
        
        // For production, fetch from Netlify function
        try {
            const response = await fetch('/.netlify/functions/get-config');
            const config = await response.json();
            return config.apiKey;
        } catch (error) {
            console.warn('Could not fetch API key from Netlify function:', error);
            return 'YOUR_API_KEY_HERE';
        }
    }

    // Kasa Integration Methods
    async initializeKasaIntegration() {
        try {
            await this.updateKasaStatus();
            this.logKasaMessage('Kasa integration initialized', 'info');
        } catch (error) {
            this.logKasaMessage(`Failed to initialize Kasa integration: ${error.message}`, 'error');
        }
    }

    async updateKasaStatus() {
        try {
            const response = await fetch(`${this.kasaApiUrl}/status`);
            const data = await response.json();
            
            if (data.success) {
                this.kasaStatus = data.device;
                this.updateKasaUI();
            } else {
                throw new Error(data.error || 'Failed to get status');
            }
        } catch (error) {
            console.error('Error updating Kasa status:', error);
            this.elements.switchStatusText.textContent = 'Offline';
            this.elements.statusIndicator.className = 'status-indicator offline';
            this.elements.toggleSwitchBtn.disabled = true;
        }
    }

    updateKasaUI() {
        if (this.kasaStatus) {
            const isOn = this.kasaStatus.isOn;
            this.elements.switchStatusText.textContent = isOn ? 'Switch ON' : 'Switch OFF';
            this.elements.statusIndicator.className = `status-indicator ${isOn ? 'online' : 'offline'}`;
            this.elements.toggleSwitchBtn.disabled = false;
            this.elements.toggleSwitchBtn.innerHTML = `<i class="fas fa-power-off"></i> Turn ${isOn ? 'OFF' : 'ON'}`;
        }
    }

    async toggleKasaSwitch() {
        try {
            this.elements.toggleSwitchBtn.disabled = true;
            this.elements.toggleSwitchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Switching...';
            
            const endpoint = this.kasaStatus?.isOn ? 'off' : 'on';
            const response = await fetch(`${this.kasaApiUrl}/switch/${endpoint}`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                await this.updateKasaStatus();
                this.logKasaMessage(`Switch turned ${endpoint.toUpperCase()}`, 'success');
            } else {
                throw new Error(result.message || 'Failed to toggle switch');
            }
        } catch (error) {
            this.logKasaMessage(`Failed to toggle switch: ${error.message}`, 'error');
        } finally {
            this.elements.toggleSwitchBtn.disabled = false;
            this.updateKasaUI();
        }
    }

    async runKasaAutomation() {
        try {
            this.elements.runAutomationBtn.disabled = true;
            this.elements.runAutomationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
            
            const response = await fetch(`${this.kasaApiUrl}/automation/run`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                const automationResult = result.result;
                if (automationResult.action && automationResult.action !== 'none') {
                    this.logKasaMessage(`${automationResult.action.toUpperCase()}: ${automationResult.reason}`, 'success');
                    await this.updateKasaStatus();
                } else {
                    this.logKasaMessage(automationResult.reason, 'info');
                }
            } else {
                throw new Error(result.error || 'Automation failed');
            }
        } catch (error) {
            this.logKasaMessage(`Automation failed: ${error.message}`, 'error');
        } finally {
            this.elements.runAutomationBtn.disabled = false;
            this.elements.runAutomationBtn.innerHTML = '<i class="fas fa-robot"></i> Run Automation';
        }
    }

    async updateKasaThreshold() {
        try {
            const threshold = parseFloat(this.elements.priceThreshold.value);
            
            if (isNaN(threshold)) {
                throw new Error('Please enter a valid number for threshold');
            }
            
            if (threshold <= 0) {
                throw new Error('Threshold must be greater than 0');
            }
            
            const response = await fetch(`${this.kasaApiUrl}/automation/config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    threshold: threshold
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.logKasaMessage(`Threshold updated: ${threshold}¢/kWh (Turn ON when price < ${threshold}¢/kWh)`, 'success');
            } else {
                throw new Error(result.error || 'Failed to update threshold');
            }
        } catch (error) {
            this.logKasaMessage(`Failed to update threshold: ${error.message}`, 'error');
        }
    }

    async toggleKasaAutomation() {
        try {
            const enabled = this.elements.automationEnabled.checked;
            
            const response = await fetch(`${this.kasaApiUrl}/automation/config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    enabled: enabled
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.logKasaMessage(`Automation ${enabled ? 'enabled' : 'disabled'}`, 'info');
            } else {
                throw new Error(result.error || 'Failed to toggle automation');
            }
        } catch (error) {
            this.logKasaMessage(`Failed to toggle automation: ${error.message}`, 'error');
            // Revert checkbox state
            this.elements.automationEnabled.checked = !this.elements.automationEnabled.checked;
        }
    }

    logKasaMessage(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('p');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        this.elements.logContent.appendChild(logEntry);
        this.elements.logContent.scrollTop = this.elements.logContent.scrollHeight;
        
        // Keep only last 50 entries
        const entries = this.elements.logContent.querySelectorAll('.log-entry');
        if (entries.length > 50) {
            entries[0].remove();
        }
    }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.poolPriceDashboard = new PoolPriceDashboard();
});

// Note: This dashboard is specifically designed for AESO Pool Price API
// The API requires authentication via API key in headers or query parameters
// For production use, you'll need to configure your API key

// Make test function available globally for console testing
