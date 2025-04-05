// Endpoint for Alpha Vantage API
const API_KEY = 'IELF382B4X42YRTX'; // API key that works in Postman
const BASE_URL = 'https://www.alphavantage.co/query';
/**
 * Service for interacting with the Alpha Vantage API
 */
const AlphaVantageService = {
  /**
   * Search for stocks by keywords (company name, symbol, etc.)
   * @param {string} query - Search keywords
   * @returns {Promise<Array>} - List of matching stocks
   */
  searchStocks: async (query) => {
    try {
      const url = `${BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${API_KEY}`;
      console.log('Alpha Vantage Search API URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      // Log warnings but continue processing if data exists
      if (data["Error Message"]) {
        console.error("Alpha Vantage API error:", data["Error Message"]);
        return [];
      }
      
      if (data["Information"]) {
        console.warn("Alpha Vantage API message:", data["Information"]);
        // Continue processing if bestMatches exists despite the warning
      }
      
      // More robust checking for bestMatches existence
      if (!data.bestMatches || !Array.isArray(data.bestMatches) || data.bestMatches.length === 0) {
        console.log("No matching stocks found or rate limit reached");
        return [];
      }
      
      // Return all stocks, not just BSE
      return data.bestMatches.map(match => ({
        symbol: match['1. symbol'],
        displaySymbol: match['1. symbol'],
        description: match['2. name'],
        exchange: match['4. region'].includes('BSE') ? 'BSE' : 
                  match['4. region'].includes('NSE') ? 'NSE' : 
                  match['4. region'].includes('US') ? 'US' : 
                  match['4. region'].split('/')[0], // Use first part of region as exchange
        type: match['3. type'],
        region: match['4. region']
      }));
    } catch (error) {
      console.error('Error searching stocks with Alpha Vantage:', error);
      return []; // Return empty array instead of throwing
    }
  },
  
  /**
   * Format search results to match the app's expected format
   * @param {Array} results - Raw search results
   * @returns {Array} - Formatted search results
   */
  formatSearchResults: (results) => {
    return results.map(item => ({
      ...item,
      // Ensure all required fields are present
      displaySymbol: item.displaySymbol || item.symbol,
      description: item.description || 'No description available'
    }));
  },

  /**
   * Get company profile by symbol
   * @param {string} symbol - Stock symbol
   * @returns {Promise<Object>} - Company profile data
   */
  getCompanyProfile: async (symbol) => {
    try {
      const url = `${BASE_URL}?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
      console.log('Alpha Vantage Company Profile API URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data["Error Message"] || data["Information"]) {
        console.warn("Alpha Vantage API message:", data["Error Message"] || data["Information"]);
      }
      
      // Format to match the Finnhub structure
      return {
        ticker: symbol,
        name: data.Name || symbol,
        exchange: data.Exchange || 'BSE',
        currency: data.Currency || 'INR',
        country: data.Country || 'India',
        finnhubIndustry: data.Industry || 'Unknown',
        marketCapitalization: parseFloat(data.MarketCapitalization) || 0,
        weburl: data.Address || '',
        logo: '',  // Alpha Vantage doesn't provide logos
        ipo: data.IPODate || 'Unknown'
      };
    } catch (error) {
      console.error('Error fetching company profile with Alpha Vantage:', error);
      throw error;
    }
  },

  /**
   * Get current stock quote
   * @param {string} symbol - Stock symbol
   * @returns {Promise<Object>} - Current stock quote
   */
  getQuote: async (symbol) => {
    try {
      const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
      console.log('Alpha Vantage Quote API URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      // Better error handling
      if (data["Error Message"]) {
        console.error("Alpha Vantage API error:", data["Error Message"]);
        return {
          c: 0, h: 0, l: 0, o: 0, pc: 0,
          error: data["Error Message"]
        };
      }
      
      if (data["Information"]) {
        console.warn("Alpha Vantage API message:", data["Information"]);
        // Continue processing if we have data despite the warning
      }
      
      const quote = data['Global Quote'] || {};
      
      // Check if we have a valid quote
      if (Object.keys(quote).length === 0) {
        console.warn(`No quote data available for ${symbol} or rate limit reached`);
        return {
          c: 0, h: 0, l: 0, o: 0, pc: 0,
          error: 'No data available or rate limit reached'
        };
      }
      
      // Format to match the Finnhub structure
      return {
        c: parseFloat(quote['05. price']) || 0,          // Current price
        h: parseFloat(quote['03. high']) || 0,           // High price of the day
        l: parseFloat(quote['04. low']) || 0,            // Low price of the day
        o: parseFloat(quote['02. open']) || 0,           // Open price of the day
        pc: parseFloat(quote['08. previous close']) || 0 // Previous close price
      };
    } catch (error) {
      console.error('Error fetching quote with Alpha Vantage:', error);
      return {
        c: 0, h: 0, l: 0, o: 0, pc: 0,
        error: error.message
      };
    }
  },

  /**
   * Get historical stock data
   * @param {string} symbol - Stock symbol
   * @param {string} resolution - Data resolution (not used directly, mapped to Alpha Vantage intervals)
   * @param {number} from - UNIX timestamp (seconds)
   * @param {number} to - UNIX timestamp (seconds)
   * @returns {Promise<Object>} - Historical stock data
   */
  getHistoricalData: async (symbol, resolution, from, to) => {
    try {
      // Map Finnhub resolution to Alpha Vantage interval
      let interval = '5min'; // Default
      let alphaFunction = 'TIME_SERIES_INTRADAY';
      
      // Map resolutions to Alpha Vantage intervals
      if (resolution === '1') interval = '1min';
      else if (resolution === '5') interval = '5min';
      else if (resolution === '15') interval = '15min';
      else if (resolution === '30') interval = '30min';
      else if (resolution === '60') interval = '60min';
      else if (resolution === 'D') {
        alphaFunction = 'TIME_SERIES_DAILY';
        interval = null;
      }
      else if (resolution === 'W') {
        alphaFunction = 'TIME_SERIES_WEEKLY';
        interval = null;
      }
      else if (resolution === 'M') {
        alphaFunction = 'TIME_SERIES_MONTHLY';
        interval = null;
      }
      
      // Build the URL based on the function type exactly as shown in the example
      let url;
      if (alphaFunction === 'TIME_SERIES_INTRADAY') {
        url = `${BASE_URL}?function=${alphaFunction}&symbol=${symbol}&interval=${interval}&outputsize=compact&apikey=${API_KEY}`;
      } else {
        // For daily, weekly, monthly data
        url = `${BASE_URL}?function=${alphaFunction}&symbol=${symbol}&outputsize=compact&apikey=${API_KEY}`;
      }
      
      console.log('Alpha Vantage API URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      // Better error handling
      if (data["Error Message"]) {
        console.error("Alpha Vantage API error:", data["Error Message"]);
        return { s: 'error', errorMessage: data["Error Message"] };
      }
      
      if (data["Information"]) {
        console.warn("Alpha Vantage API message:", data["Information"]);
        // Continue processing if we have data despite the warning
      }
      
      // Format data based on the function called
      let timeSeriesKey;
      if (alphaFunction === 'TIME_SERIES_INTRADAY') {
        timeSeriesKey = `Time Series (${interval})`;
      } else if (alphaFunction === 'TIME_SERIES_DAILY') {
        timeSeriesKey = 'Time Series (Daily)';
      } else if (alphaFunction === 'TIME_SERIES_WEEKLY') {
        timeSeriesKey = 'Weekly Time Series';
      } else {
        timeSeriesKey = 'Monthly Time Series';
      }
      
      const timeSeries = data[timeSeriesKey] || {};
      
      // Check if we have data
      if (Object.keys(timeSeries).length === 0) {
        console.warn(`No historical data available for ${symbol} or rate limit reached`);
        return { s: 'no_data', errorMessage: 'No data available or rate limit reached' };
      }
      
      // Format data to match Finnhub format
      const timestamps = [];
      const opens = [];
      const highs = [];
      const lows = [];
      const closes = [];
      const volumes = [];
      
      Object.entries(timeSeries).forEach(([date, values]) => {
        const timestamp = new Date(date).getTime() / 1000; // Convert to UNIX timestamp in seconds
        
        // Only include data points in the requested time range
        if (timestamp >= from && timestamp <= to) {
          timestamps.push(timestamp);
          opens.push(parseFloat(values['1. open']));
          highs.push(parseFloat(values['2. high']));
          lows.push(parseFloat(values['3. low']));
          closes.push(parseFloat(values['4. close']));
          volumes.push(parseInt(values['5. volume']));
        }
      });
      
      // If no data points in the requested range
      if (timestamps.length === 0) {
        return { 
          s: 'no_data',
          errorMessage: 'No data available in the specified time range'
        };
      }
      
      // Ensure timestamps are sorted in ascending order
      const indices = timestamps.map((_, i) => i);
      indices.sort((a, b) => timestamps[a] - timestamps[b]);
      
      return {
        s: 'ok',
        t: indices.map(i => timestamps[i]),
        o: indices.map(i => opens[i]),
        h: indices.map(i => highs[i]),
        l: indices.map(i => lows[i]),
        c: indices.map(i => closes[i]),
        v: indices.map(i => volumes[i])
      };
    } catch (error) {
      console.error('Error fetching historical data with Alpha Vantage:', error);
      return { 
        s: 'error',
        errorMessage: error.message 
      };
    }
  },
  
  /**
   * Format candle data (OHLC) for chart display
   * @param {Object} data - Raw historical data
   * @returns {Array} - Formatted candle data
   */
  formatCandleData: (data) => {
    if (!data || data.s !== 'ok' || !data.t || data.t.length === 0) {
      return [];
    }
    
    return data.t.map((timestamp, i) => ({
      timestamp,
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i]
    }));
  },
  
  /**
   * Format data for line chart
   * @param {Array} candleData - Formatted candle data
   * @returns {Array} - Formatted line chart data
   */
  formatForLineChart: (candleData) => {
    return candleData.map(candle => ({
      x: candle.timestamp,
      y: candle.close
    }));
  },
  
  /**
   * Get time periods with the corresponding UNIX timestamps
   * @returns {Object} - Time periods with from and to dates
   */
  getTimePeriods: () => {
    const now = Math.floor(Date.now() / 1000);
    const day = 24 * 60 * 60;
    
    return {
      oneDay: {
        from: now - day,
        to: now,
        resolution: '5',
        label: '1D'
      },
      oneWeek: {
        from: now - (7 * day),
        to: now,
        resolution: '15',
        label: '1W'
      },
      oneMonth: {
        from: now - (30 * day),
        to: now,
        resolution: '60',
        label: '1M'
      },
      threeMonths: {
        from: now - (90 * day),
        to: now,
        resolution: 'D',
        label: '3M'
      },
      sixMonths: {
        from: now - (180 * day),
        to: now,
        resolution: 'D',
        label: '6M'
      },
      oneYear: {
        from: now - (365 * day),
        to: now,
        resolution: 'D',
        label: '1Y'
      }
    };
  },
  
  /**
   * Simulate price updates for demonstration purposes
   * @param {string} symbol - Stock symbol
   * @param {number} basePrice - Starting price
   * @param {number} volatility - Price volatility factor (0.001 = 0.1%)
   * @param {number} interval - Update interval in milliseconds
   * @returns {Function} - Function to stop the simulation
   */
  simulatePriceUpdates: (symbol, basePrice, volatility = 0.001, interval = 2000) => {
    console.log(`Starting price simulation for ${symbol} with base price ${basePrice}`);
    
    // Cache the price update listeners
    let listeners = [];
    
    // Create a simulation timer
    let lastPrice = basePrice;
    let timerId = null;
    
    // Add price update listener
    const addPriceUpdateListener = (sym, callback, id) => {
      if (sym === symbol) {
        listeners.push({ callback, id });
        return true;
      }
      return false;
    };
    
    // Remove price update listener
    const removePriceUpdateListener = (sym, id) => {
      if (sym === symbol) {
        listeners = listeners.filter(listener => listener.id !== id);
        return true;
      }
      return false;
    };
    
    // Start the simulation
    const startSimulation = () => {
      timerId = setInterval(() => {
        // Generate a random price movement
        const movement = (Math.random() - 0.5) * 2 * volatility;
        const newPrice = lastPrice * (1 + movement);
        
        // Notify all listeners
        listeners.forEach(listener => {
          try {
            listener.callback({
              symbol: symbol,
              price: newPrice,
              timestamp: Date.now()
            });
          } catch (error) {
            console.error(`Error notifying price update listener for ${symbol}:`, error);
          }
        });
        
        lastPrice = newPrice;
      }, interval);
    };
    
    // Stop function to clean up the simulation
    const stopSimulation = () => {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
        listeners = [];
        console.log(`Stopped price simulation for ${symbol}`);
      }
    };
    
    // Register with the AlphaVantageService
    AlphaVantageService.addPriceUpdateListener = addPriceUpdateListener;
    AlphaVantageService.removePriceUpdateListener = removePriceUpdateListener;
    
    // Start the simulation
    startSimulation();
    
    // Return the stop function
    return stopSimulation;
  },
  
  /**
   * Add a connection status listener (stub for API compatibility with FinnhubService)
   * @param {Function} listener - Callback function for connection status updates
   * @param {string} id - Unique ID for the listener
   */
  addConnectionListener: (listener, id) => {
    // Alpha Vantage doesn't have WebSocket, so we simulate a connected state
    setTimeout(() => {
      listener({ connected: true });
    }, 500);
  },
  
  /**
   * Remove a connection listener (stub for API compatibility with FinnhubService)
   * @param {string} id - ID of the listener to remove
   */
  removeConnectionListener: (id) => {
    // No-op since we don't have real connection listeners
  },
  
  /**
   * Get connection details (stub for API compatibility with FinnhubService)
   * @returns {Object} - Simulated connection details
   */
  getConnectionDetails: () => {
    return {
      connected: true,
      service: 'AlphaVantage',
      supportsRealtime: false
    };
  }
};

export default AlphaVantageService;