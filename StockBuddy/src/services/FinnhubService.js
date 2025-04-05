// Use the API key directly rather than relying on process.env in React Native
const API_KEY = 'cveohrpr01qjugsdu7k0cveohrpr01qjugsdu7kg'; 
const BASE_URL = 'https://finnhub.io/api/v1';
const WS_URL = 'wss://ws.finnhub.io';

// WebSocket connection state
let socket = null;
let activeSubscriptions = new Set();
let messageListeners = new Map();
let connectionListeners = new Map();
let reconnectTimeout = null;
let reconnectAttempts = 0;
let pendingSubscriptions = new Set();
let isSubscribing = false;
let rateLimitBackoff = false;
let connectionInProgress = false;
let isConnectionInitialized = false;

// Helper function to handle subscriptions with rate limiting
const processSubscriptionQueue = () => {
  if (pendingSubscriptions.size === 0 || isSubscribing || rateLimitBackoff) {
    return;
  }

  isSubscribing = true;
  const symbol = Array.from(pendingSubscriptions)[0];
  pendingSubscriptions.delete(symbol);

  try {
    if (socket && socket.readyState === WebSocket.OPEN) {
      // Only subscribe if we're not already subscribed
      if (!activeSubscriptions.has(symbol)) {
        socket.send(JSON.stringify({ 
          'type': 'subscribe', 
          'symbol': symbol 
        }));
        activeSubscriptions.add(symbol);
        console.log(`Subscribed to ${symbol}`);
      } else {
        console.log(`Already subscribed to ${symbol}, skipping`);
      }
      
      // Process next subscription after delay to prevent rate limiting
      setTimeout(() => {
        isSubscribing = false;
        processSubscriptionQueue();
      }, 500); // 500ms delay between subscriptions
    } else {
      // Return to queue if socket not ready
      pendingSubscriptions.add(symbol);
      isSubscribing = false;
      
      // Try to initialize connection if not already in progress
      if (!connectionInProgress && (!socket || socket.readyState !== WebSocket.CONNECTING)) {
        FinnhubService.initWebSocket();
      }
    }
  } catch (error) {
    console.error(`Error subscribing to ${symbol}:`, error);
    // Return to queue for retry
    pendingSubscriptions.add(symbol);
    isSubscribing = false;
  }
};

/**
 * Service for interacting with the Finnhub API
 */
const FinnhubService = {
  /**
   * Search for stocks by symbol or name
   * @param {string} query - Search term (company name or symbol)
   * @returns {Promise<Array>} - List of matching stocks
   */
  searchStocks: async (query) => {
    try {
      const response = await fetch(`${BASE_URL}/search?q=${query}&token=${API_KEY}`);
      const data = await response.json();
      return data.result || [];
    } catch (error) {
      console.error('Error searching stocks:', error);
      throw error;
    }
  },

  /**
   * Search for symbols (alias for searchStocks)
   * @param {string} query - Search term (company name or symbol)
   * @returns {Promise<Array>} - List of matching stocks
   */
  searchSymbols: async (query) => {
    try {
      return await FinnhubService.searchStocks(query);
    } catch (error) {
      console.error('Error searching symbols:', error);
      throw error;
    }
  },

  /**
   * Get company details by symbol
   * @param {string} symbol - Stock symbol
   * @returns {Promise<Object>} - Company details
   */
  getCompanyProfile: async (symbol) => {
    try {
      // Check if it's an Indian stock
      if (symbol.endsWith('.BO') || symbol.endsWith('.NS')) {
        const exchange = symbol.endsWith('.BO') ? 'BSE' : 'NSE';
        const baseSymbol = symbol.replace(/\.(BO|NS)$/, '');
        return FinnhubService.getIndianCompanyProfile(baseSymbol, exchange);
      }
      
      const response = await fetch(`${BASE_URL}/stock/profile2?symbol=${symbol}&token=${API_KEY}`);
      const data = await response.json();
      console.log('Company Profile data for', symbol, ':', data);
      
      // If error in response, check if it's an Indian stock in a different format
      if (data.error) {
        if (symbol.includes(':')) {
          const parts = symbol.split(':');
          const exchange = parts[0];
          const baseSymbol = parts[1];
          
          if (exchange === 'BSE' || exchange === 'NSE') {
            return FinnhubService.getIndianCompanyProfile(baseSymbol, exchange);
          }
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching company profile:', error);
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
      // Check if it's an Indian stock
      if (symbol.endsWith('.BO') || symbol.endsWith('.NS')) {
        const exchange = symbol.endsWith('.BO') ? 'BSE' : 'NSE';
        const baseSymbol = symbol.replace(/\.(BO|NS)$/, '');
        return FinnhubService.getIndianStockQuote(baseSymbol, exchange);
      }
      
      const response = await fetch(`${BASE_URL}/quote?symbol=${symbol}&token=${API_KEY}`);
      const data = await response.json();
      console.log('Quote data for', symbol, ':', data);
      
      // If error in response, check if it's an Indian stock in a different format
      if (data.error) {
        if (symbol.includes(':')) {
          const parts = symbol.split(':');
          const exchange = parts[0];
          const baseSymbol = parts[1];
          
          if (exchange === 'BSE' || exchange === 'NSE') {
            return FinnhubService.getIndianStockQuote(baseSymbol, exchange);
          }
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching quote:', error);
      throw error;
    }
  },

  /**
   * Get market status for a specific exchange
   * @param {string} exchange - Exchange code (e.g., 'US', 'NSE', 'BSE')
   * @returns {Promise<Object>} - Current market status
   */
  getMarketStatus: async (exchange) => {
    try {
      // For Indian exchanges, create simulated data based on current time in India
      if (exchange === 'NSE' || exchange === 'BSE') {
        // Indian Standard Time is UTC+5:30
        const now = new Date();
        const indiaTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        const indiaHours = indiaTime.getUTCHours();
        const indiaMinutes = indiaTime.getUTCMinutes();
        const indiaDay = indiaTime.getUTCDay();
        
        // Indian market is open 9:15 AM to 3:30 PM IST, Monday to Friday
        const isWeekend = indiaDay === 0 || indiaDay === 6; // Sunday or Saturday
        const marketOpenTime = 9 * 60 + 15; // 9:15 AM in minutes
        const marketCloseTime = 15 * 60 + 30; // 3:30 PM in minutes
        const currentTimeInMinutes = indiaHours * 60 + indiaMinutes;
        
        const isOpen = !isWeekend && 
                       currentTimeInMinutes >= marketOpenTime && 
                       currentTimeInMinutes < marketCloseTime;
        
        return { isOpen };
      }
      
      // For US market, make a real API call
      const response = await fetch(`${BASE_URL}/stock/market-status?exchange=US&token=${API_KEY}`);
      const data = await response.json();
      
      return data;
    } catch (error) {
      console.error(`Error checking market status for ${exchange}:`, error);
      // Default to market closed on error
      return { isOpen: false };
    }
  },

  /**
   * Get historical stock data
   * @param {string} symbol - Stock symbol
   * @param {string} resolution - Data resolution (1, 5, 15, 30, 60, D, W, M)
   * @param {number} from - UNIX timestamp (seconds)
   * @param {number} to - UNIX timestamp (seconds)
   * @returns {Promise<Object>} - Historical stock data
   */
  getHistoricalData: async (symbol, resolution, from, to) => {
    try {
      // For Indian stocks, generate mock data
      if (symbol.endsWith('.BO') || symbol.endsWith('.NS') || 
          (symbol.includes(':') && (symbol.startsWith('BSE:') || symbol.startsWith('NSE:')))) {
        console.log(`Using mock data for Indian stock ${symbol}`);
        
        // Generate mock data for Indian stocks
        const timestamps = [];
        const closes = [];
        const opens = [];
        const highs = [];
        const lows = [];
        const volumes = [];
        
        // Generate data points based on resolution
        const basePrice = 1000 + Math.random() * 1000;
        let currentPrice = basePrice;
        
        // Determine interval between points based on resolution
        let interval;
        switch(resolution) {
          case '1': interval = 60; break;
          case '5': interval = 5 * 60; break;
          case '15': interval = 15 * 60; break;
          case '30': interval = 30 * 60; break;
          case '60': interval = 60 * 60; break;
          case 'D': interval = 24 * 60 * 60; break;
          case 'W': interval = 7 * 24 * 60 * 60; break;
          case 'M': interval = 30 * 24 * 60 * 60; break;
          default: interval = 24 * 60 * 60;
        }
        
        // Generate points
        for (let timestamp = from; timestamp <= to; timestamp += interval) {
          // Add some randomness to price (with a slight upward bias)
          const change = (Math.random() - 0.48) * 0.02; // -0.96% to +1.04%
          currentPrice = currentPrice * (1 + change);
          
          // Generate OHLC data
          const open = currentPrice * (1 + (Math.random() * 0.01 - 0.005));
          const close = currentPrice;
          const high = Math.max(open, close) * (1 + Math.random() * 0.01);
          const low = Math.min(open, close) * (1 - Math.random() * 0.01);
          const volume = Math.floor(Math.random() * 1000000) + 100000;
          
          timestamps.push(timestamp);
          opens.push(open);
          highs.push(high);
          lows.push(low);
          closes.push(close);
          volumes.push(volume);
        }
        
        return {
          s: 'ok',
          t: timestamps,
          o: opens,
          h: highs,
          l: lows,
          c: closes,
          v: volumes
        };
      }
      
      const response = await fetch(
        `${BASE_URL}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${API_KEY}`
      );
      const data = await response.json();
      
      if (data.s === 'no_data') {
        throw new Error('No data available for the selected time range');
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw error;
    }
  },

  /**
   * Transform Finnhub candle data into a format suitable for charts
   * @param {Object} candleData - Raw candle data from Finnhub API
   * @returns {Array} - Formatted data for charts
   */
  formatCandleData: (candleData) => {
    if (!candleData || !candleData.t || candleData.s === 'no_data') {
      return [];
    }

    return candleData.t.map((timestamp, index) => {
      return {
        timestamp: new Date(timestamp * 1000),
        date: new Date(timestamp * 1000).toLocaleDateString(),
        open: candleData.o[index],
        high: candleData.h[index],
        low: candleData.l[index],
        close: candleData.c[index],
        volume: candleData.v[index],
      };
    });
  },

  /**
   * Format data specifically for line charts
   * @param {Array} formattedData - Data formatted by formatCandleData
   * @returns {Array} - Data formatted for line charts
   */
  formatForLineChart: (formattedData) => {
    return formattedData.map(item => ({
      x: item.date,
      y: item.close,
    }));
  },

  /**
   * Format stock search results to a simplified structure
   * @param {Array} searchResults - Raw search results from Finnhub API
   * @returns {Array} - Simplified search results
   */
  formatSearchResults: (searchResults) => {
    return searchResults.map(item => {
      // Parse exchange and ticker from symbol
      let exchange = 'US';
      let displaySymbol = item.symbol;
      let country = 'USA';
      let currency = 'USD';
      
      // Handle Yahoo Finance style suffixes for Indian stocks
      if (item.symbol.endsWith('.BO')) {
        exchange = 'BSE';
        displaySymbol = item.symbol.replace('.BO', '');
        country = 'India';
        currency = 'INR';
      } else if (item.symbol.endsWith('.NS')) {
        exchange = 'NSE';
        displaySymbol = item.symbol.replace('.NS', '');
        country = 'India';
        currency = 'INR';
      } else if (item.symbol.includes(':')) {
        // Handle regular exchange:symbol format
        const parts = item.symbol.split(':');
        exchange = parts[0];
        displaySymbol = parts[1];
        
        // Set country and currency based on exchange
        if (exchange === 'BSE' || exchange === 'NSE') {
          country = 'India';
          currency = 'INR';
        } else if (exchange === 'LSE') {
          country = 'UK';
          currency = 'GBP';
        } else if (['XETRA', 'BER', 'FRA', 'STU', 'MUN', 'HAM', 'DUS'].includes(exchange)) {
          country = 'Germany';
          currency = 'EUR';
        } else if (['TSE', 'TSXV'].includes(exchange)) {
          country = 'Canada';
          currency = 'CAD';
        }
      }

      return {
        symbol: item.symbol,
        displaySymbol: displaySymbol,
        description: item.description,
        type: item.type,
        exchange: exchange,
        country: country,
        currency: currency
      };
    });
  },

  /**
   * Calculate time periods for historical data queries
   * @returns {Object} - Common time periods in Unix timestamps
   */
  getTimePeriods: () => {
    const now = Math.floor(Date.now() / 1000);
    const oneDay = 24 * 60 * 60;
    
    return {
      oneDay: {
        from: now - oneDay,
        to: now,
        resolution: '5',
        label: '1D'
      },
      oneWeek: {
        from: now - (7 * oneDay),
        to: now,
        resolution: '15',
        label: '1W'
      },
      oneMonth: {
        from: now - (30 * oneDay),
        to: now,
        resolution: '60',
        label: '1M'
      },
      threeMonths: {
        from: now - (90 * oneDay),
        to: now,
        resolution: 'D',
        label: '3M'
      },
      oneYear: {
        from: now - (365 * oneDay),
        to: now,
        resolution: 'D',
        label: '1Y'
      },
      fiveYears: {
        from: now - (5 * 365 * oneDay),
        to: now,
        resolution: 'W',
        label: '5Y'
      }
    };
  },
  
  /**
   * Get quote for Indian stocks
   * @param {string} symbol - Stock symbol
   * @param {string} exchange - Exchange (BSE or NSE)
   * @returns {Promise<Object>} - Quote data
   */
  getIndianStockQuote: async (symbol, exchange = 'BSE') => {
    try {
      // For Indian stocks, we'll use our mock data to avoid API limitations
      const mockData = {
        c: exchange === 'BSE' 
          ? Math.floor(Math.random() * 1000) + 1000 
          : Math.floor(Math.random() * 1500) + 1500, // Current price
        h: exchange === 'BSE'
          ? Math.floor(Math.random() * 1000) + 1050
          : Math.floor(Math.random() * 1500) + 1550, // High price
        l: exchange === 'BSE'
          ? Math.floor(Math.random() * 1000) + 950
          : Math.floor(Math.random() * 1500) + 1450, // Low price
        o: exchange === 'BSE'
          ? Math.floor(Math.random() * 1000) + 1000
          : Math.floor(Math.random() * 1500) + 1500, // Open price
        pc: exchange === 'BSE'
          ? Math.floor(Math.random() * 1000) + 1000
          : Math.floor(Math.random() * 1500) + 1500, // Previous close
        dp: Math.random() > 0.5 
          ? Math.random() * 2
          : -Math.random() * 2, // Percent change
        v: Math.floor(Math.random() * 1000000) + 100000, // Volume
      };
      
      // Calculate price change
      mockData.d = mockData.c - mockData.pc;
      
      console.log(`Generated mock quote data for ${symbol} on ${exchange}:`, mockData);
      
      return mockData;
    } catch (error) {
      console.error(`Error getting quote for ${symbol} on ${exchange}:`, error);
      
      // In case of error, return a safe fallback object with all required fields
      return {
        c: 1000, // Current price
        h: 1050, // High price
        l: 950,  // Low price
        o: 1000, // Open price
        pc: 1000, // Previous close
        dp: 0,   // Percent change
        d: 0,    // Price change
        v: 100000 // Volume
      };
    }
  },
  
  /**
   * Get company profile for Indian stocks
   * @param {string} symbol - Stock symbol
   * @param {string} exchange - Exchange (BSE or NSE)
   * @returns {Promise<Object>} - Company profile data
   */
  getIndianCompanyProfile: async (symbol, exchange = 'BSE') => {
    try {
      // Mock data for Indian company profiles
      const fullSymbol = `${exchange}:${symbol}`;
      const mockIndianCompanies = {
        'BSE:RELIANCE': {
          name: 'Reliance Industries Ltd',
          logo: 'https://static.finnhub.io/logo/871cb9ba-a721-11ea-a6c3-00000000092a.png',
          currency: 'INR',
          country: 'India',
          exchange: 'BSE',
          finnhubIndustry: 'Energy',
          marketCapitalization: 14000,
          ipo: '1977-01-01',
          weburl: 'https://www.ril.com/'
        },
        'BSE:TCS': {
          name: 'Tata Consultancy Services Ltd',
          logo: 'https://static.finnhub.io/logo/38683251-d4a3-11ea-8d60-00000000092a.png',
          currency: 'INR',
          country: 'India',
          exchange: 'BSE',
          finnhubIndustry: 'Technology',
          marketCapitalization: 11000,
          ipo: '2004-08-25',
          weburl: 'https://www.tcs.com/'
        },
        'BSE:HDFCBANK': {
          name: 'HDFC Bank Ltd',
          logo: 'https://static.finnhub.io/logo/27afbc61-c71c-11ea-bd3c-00000000092a.png',
          currency: 'INR',
          country: 'India',
          exchange: 'BSE',
          finnhubIndustry: 'Financial Services',
          marketCapitalization: 8000,
          ipo: '1995-05-19',
          weburl: 'https://www.hdfcbank.com/'
        },
        'BSE:INFY': {
          name: 'Infosys Ltd',
          logo: 'https://static.finnhub.io/logo/871ccc42-a721-11ea-85a9-00000000092a.png',
          currency: 'INR',
          country: 'India',
          exchange: 'BSE',
          finnhubIndustry: 'Technology',
          marketCapitalization: 6000,
          ipo: '1993-02-01',
          weburl: 'https://www.infosys.com/'
        },
        'BSE:ICICIBANK': {
          name: 'ICICI Bank Ltd',
          logo: 'https://static.finnhub.io/logo/08dbdb3f-2ef2-11eb-9ea4-00000000092a.png',
          currency: 'INR',
          country: 'India',
          exchange: 'BSE',
          finnhubIndustry: 'Financial Services',
          marketCapitalization: 5000,
          ipo: '1998-09-17',
          weburl: 'https://www.icicibank.com/'
        },
        // Add support for NSE profiles too
        'NSE:RELIANCE': {
          name: 'Reliance Industries Ltd',
          logo: 'https://static.finnhub.io/logo/871cb9ba-a721-11ea-a6c3-00000000092a.png',
          currency: 'INR',
          country: 'India',
          exchange: 'NSE',
          finnhubIndustry: 'Energy',
          marketCapitalization: 14000,
          ipo: '1977-01-01',
          weburl: 'https://www.ril.com/'
        },
        'NSE:TCS': {
          name: 'Tata Consultancy Services Ltd',
          logo: 'https://static.finnhub.io/logo/38683251-d4a3-11ea-8d60-00000000092a.png',
          currency: 'INR',
          country: 'India',
          exchange: 'NSE',
          finnhubIndustry: 'Technology',
          marketCapitalization: 11000,
          ipo: '2004-08-25',
          weburl: 'https://www.tcs.com/'
        },
        'NSE:HDFCBANK': {
          name: 'HDFC Bank Ltd',
          logo: 'https://static.finnhub.io/logo/27afbc61-c71c-11ea-bd3c-00000000092a.png',
          currency: 'INR',
          country: 'India',
          exchange: 'NSE',
          finnhubIndustry: 'Financial Services',
          marketCapitalization: 8000,
          ipo: '1995-05-19',
          weburl: 'https://www.hdfcbank.com/'
        },
        'NSE:INFY': {
          name: 'Infosys Ltd',
          logo: 'https://static.finnhub.io/logo/871ccc42-a721-11ea-85a9-00000000092a.png',
          currency: 'INR',
          country: 'India',
          exchange: 'NSE',
          finnhubIndustry: 'Technology',
          marketCapitalization: 6000,
          ipo: '1993-02-01',
          weburl: 'https://www.infosys.com/'
        },
        'NSE:ICICIBANK': {
          name: 'ICICI Bank Ltd',
          logo: 'https://static.finnhub.io/logo/08dbdb3f-2ef2-11eb-9ea4-00000000092a.png',
          currency: 'INR',
          country: 'India',
          exchange: 'NSE',
          finnhubIndustry: 'Financial Services',
          marketCapitalization: 5000,
          ipo: '1998-09-17',
          weburl: 'https://www.icicibank.com/'
        }
      };
      
      // Return mock data if available, or generate a default one
      if (mockIndianCompanies[fullSymbol]) {
        return mockIndianCompanies[fullSymbol];
      } else {
        const defaultProfile = {
          name: symbol,
          logo: null,
          currency: 'INR',
          country: 'India',
          exchange: exchange,
          finnhubIndustry: 'Unknown',
          marketCapitalization: Math.floor(Math.random() * 5000) + 1000,
          ipo: '2000-01-01',
          weburl: `https://www.${symbol.toLowerCase()}.com/`,
          ticker: symbol
        };
        
        console.log(`Generated default profile for ${symbol} on ${exchange}:`, defaultProfile);
        return defaultProfile;
      }
    } catch (error) {
      console.error(`Error getting company profile for ${symbol} on ${exchange}:`, error);
      
      // In case of error, return a safe fallback profile
      return {
        name: symbol,
        logo: null,
        currency: 'INR',
        country: 'India',
        exchange: exchange,
        finnhubIndustry: 'Unknown',
        marketCapitalization: 1000,
        ipo: '2000-01-01',
        weburl: `https://www.${symbol.toLowerCase()}.com/`,
        ticker: symbol
      };
    }
  },

  /**
   * Initialize WebSocket connection to Finnhub
   * @returns {boolean} - Success status
   */
  initWebSocket: () => {
    // If already connected or connecting, return true
    if (socket) {
      if (socket.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        return true;
      }
      
      if (socket.readyState === WebSocket.CONNECTING) {
        console.log('WebSocket connection already in progress');
        connectionInProgress = true;
        return true;
      }
    }

    // Don't attempt to reconnect if rate limited
    if (rateLimitBackoff) {
      console.log('Rate limit backoff active, delaying reconnection');
      return false;
    }
    
    // Mark connection as in progress
    connectionInProgress = true;
    
    try {
      console.log('Initializing WebSocket connection...');
      socket = new WebSocket(`${WS_URL}?token=${API_KEY}`);
      
      // Setup connection handlers
      socket.onopen = () => {
        console.log('WebSocket connection established');
        isConnectionInitialized = true;
        connectionInProgress = false;
        reconnectAttempts = 0; // Reset reconnect attempts counter
        
        // Re-add all active subscriptions to pending queue
        activeSubscriptions.forEach(symbol => {
          pendingSubscriptions.add(symbol);
        });
        
        // Clear the active subscriptions, will re-add as they are processed
        activeSubscriptions.clear();
        
        // Start processing subscription queue
        processSubscriptionQueue();
        
        // Notify all connection listeners
        connectionListeners.forEach(listener => {
          listener({ connected: true });
        });

        // Clear any reconnect timeout
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
      };
      
      socket.onclose = (event) => {
        console.log('WebSocket connection closed', event.code, event.reason);
        connectionInProgress = false;
        
        // Notify all connection listeners
        connectionListeners.forEach(listener => {
          listener({ connected: false });
        });
        
        // Schedule reconnection with exponential backoff, but only if we had a successful connection before
        if (!reconnectTimeout && !rateLimitBackoff && isConnectionInitialized) {
          // Calculate backoff time: 1s, 2s, 4s, 8s, etc. up to 30s max
          const backoffTime = Math.min(Math.pow(2, reconnectAttempts) * 1000, 30000);
          reconnectAttempts++;
          
          console.log(`Scheduling reconnection in ${backoffTime}ms (attempt ${reconnectAttempts})`);
          reconnectTimeout = setTimeout(() => {
            reconnectTimeout = null;
            
            // Only try to reconnect if we have active subscriptions or listeners
            if (pendingSubscriptions.size > 0 || 
                activeSubscriptions.size > 0 || 
                messageListeners.size > 0) {
              FinnhubService.initWebSocket();
            } else {
              console.log('No active subscriptions, not reconnecting');
            }
          }, backoffTime);
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        connectionInProgress = false;
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle trade data
          if (data.type === 'trade') {
            // Group trades by symbol for volume aggregation
            const tradesBySymbol = {};
            
            data.data.forEach(trade => {
              const symbol = trade.s;
              
              // Initialize or update trades for this symbol
              if (!tradesBySymbol[symbol]) {
                tradesBySymbol[symbol] = {
                  price: trade.p,
                  volume: trade.v,
                  timestamp: trade.t,
                  symbol: symbol
                };
              } else {
                // For multiple trades of the same symbol, use the latest price
                // but accumulate the volume
                tradesBySymbol[symbol].price = trade.p;
                tradesBySymbol[symbol].volume += trade.v;
                tradesBySymbol[symbol].timestamp = Math.max(tradesBySymbol[symbol].timestamp, trade.t);
              }
            });
            
            // Now notify listeners for each symbol
            Object.values(tradesBySymbol).forEach(tradeData => {
              const symbol = tradeData.symbol;
              
              // Notify all listeners for this symbol
              if (messageListeners.has(symbol)) {
                messageListeners.get(symbol).forEach(listener => {
                  listener(tradeData);
                });
              }
            });
          }
          
          // Handle ping messages
          if (data.type === 'ping') {
            // Send pong to keep connection alive
            socket.send(JSON.stringify({ "type": "pong" }));
          }
          
          // Handle rate limit error (429)
          if (data.type === 'error' && data.msg && data.msg.includes('429')) {
            console.log('Rate limit exceeded, backing off');
            rateLimitBackoff = true;
            
            // Close current connection
            socket.close();
            
            // Wait 60 seconds before trying again
            setTimeout(() => {
              rateLimitBackoff = false;
              
              // Only reconnect if we have pending subscriptions
              if (pendingSubscriptions.size > 0 || activeSubscriptions.size > 0) {
                FinnhubService.initWebSocket();
              }
            }, 60000);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error, event.data);
        }
      };
      
      return true;
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      connectionInProgress = false;
      return false;
    }
  },
  
  /**
   * Close WebSocket connection
   */
  closeWebSocket: () => {
    if (socket) {
      try {
        // Unsubscribe from all symbols first
        activeSubscriptions.forEach(symbol => {
          try {
            socket.send(JSON.stringify({ 
              'type': 'unsubscribe', 
              'symbol': symbol 
            }));
          } catch (err) {
            console.error(`Error unsubscribing from ${symbol}:`, err);
          }
        });
        
        // Clear all subscriptions and listeners
        activeSubscriptions.clear();
        pendingSubscriptions.clear();
        
        // Only close if we have no listeners
        if (messageListeners.size === 0) {
          messageListeners.clear();
          connectionListeners.clear();
          
          // Close connection
          socket.close();
          socket = null;
          isConnectionInitialized = false;
          
          // Clear any reconnect timeout
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }
          
          console.log('WebSocket connection fully closed');
        } else {
          console.log('WebSocket connection kept alive for remaining listeners');
        }
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
    }
  },
  
  /**
   * Subscribe to real-time updates for a symbol
   * @param {string} symbol - Stock symbol to subscribe to
   * @returns {boolean} - Success status
   */
  subscribeToSymbol: (symbol) => {
    // Convert Yahoo Finance style symbols to Finnhub format for WebSocket
    let wsSymbol = symbol;
    
    // Handle Indian stock formats
    if (symbol.endsWith('.BO')) {
      // Convert BSE symbol format (e.g., RELIANCE.BO -> BSE:RELIANCE)
      wsSymbol = `BSE:${symbol.replace('.BO', '')}`;
    } else if (symbol.endsWith('.NS')) {
      // Convert NSE symbol format (e.g., RELIANCE.NS -> NSE:RELIANCE)
      wsSymbol = `NSE:${symbol.replace('.NS', '')}`;
    }
    
    // Skip if already subscribed or pending
    if (activeSubscriptions.has(wsSymbol)) {
      console.log(`Already subscribed to ${wsSymbol}`);
      return true;
    }
    
    if (pendingSubscriptions.has(wsSymbol)) {
      console.log(`Subscription to ${wsSymbol} already pending`);
      return true;
    }
    
    // Add to pending queue
    pendingSubscriptions.add(wsSymbol);
    console.log(`Added ${wsSymbol} to subscription queue`);
    
    // Initialize WebSocket if not connected
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      if (!connectionInProgress) {
        FinnhubService.initWebSocket();
      }
    } else {
      // If already connected, start processing queue
      processSubscriptionQueue();
    }
    
    return true;
  },
  
  /**
   * Unsubscribe from real-time updates for a symbol
   * @param {string} symbol - Stock symbol to unsubscribe from
   * @returns {boolean} - Success status
   */
  unsubscribeFromSymbol: (symbol) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    try {
      // Remove from active subscriptions
      activeSubscriptions.delete(symbol);
      
      // Send unsubscription message
      socket.send(JSON.stringify({ 
        'type': 'unsubscribe', 
        'symbol': symbol 
      }));
      
      // Clear all listeners for this symbol
      messageListeners.delete(symbol);
      
      console.log(`Unsubscribed from ${symbol}`);
      return true;
    } catch (error) {
      console.error(`Error unsubscribing from ${symbol}:`, error);
      return false;
    }
  },
  
  /**
   * Add a listener for price updates for a specific symbol
   * @param {string} symbol - Stock symbol to listen for
   * @param {Function} listener - Callback function for price updates
   * @param {string} listenerId - Unique ID for the listener
   * @returns {boolean} - Success status
   */
  addPriceUpdateListener: (symbol, listener, listenerId) => {
    // Convert Yahoo Finance style symbols to Finnhub format for WebSocket
    let wsSymbol = symbol;
    
    // Handle Indian stock formats
    if (symbol.endsWith('.BO')) {
      // Convert BSE symbol format (e.g., RELIANCE.BO -> BSE:RELIANCE)
      wsSymbol = `BSE:${symbol.replace('.BO', '')}`;
    } else if (symbol.endsWith('.NS')) {
      // Convert NSE symbol format (e.g., RELIANCE.NS -> NSE:RELIANCE)
      wsSymbol = `NSE:${symbol.replace('.NS', '')}`;
    }
    
    // Create a map for this symbol if it doesn't exist
    if (!messageListeners.has(wsSymbol)) {
      messageListeners.set(wsSymbol, new Map());
    }
    
    // Add the listener with its ID
    messageListeners.get(wsSymbol).set(listenerId, listener);
    
    // Subscribe to the symbol
    FinnhubService.subscribeToSymbol(wsSymbol);
    
    return true;
  },
  
  /**
   * Remove a price update listener for a specific symbol
   * @param {string} symbol - Stock symbol to stop listening for
   * @param {string} listenerId - ID of the listener to remove
   * @returns {boolean} - Success status
   */
  removePriceUpdateListener: (symbol, listenerId) => {
    // Convert Yahoo Finance style symbols to Finnhub format for WebSocket
    let wsSymbol = symbol;
    
    // Handle Indian stock formats
    if (symbol.endsWith('.BO')) {
      // Convert BSE symbol format (e.g., RELIANCE.BO -> BSE:RELIANCE)
      wsSymbol = `BSE:${symbol.replace('.BO', '')}`;
    } else if (symbol.endsWith('.NS')) {
      // Convert NSE symbol format (e.g., RELIANCE.NS -> NSE:RELIANCE)
      wsSymbol = `NSE:${symbol.replace('.NS', '')}`;
    }
    
    // Check if we have listeners for this symbol
    if (!messageListeners.has(wsSymbol)) {
      return false;
    }
    
    // Remove the specific listener
    messageListeners.get(wsSymbol).delete(listenerId);
    
    // If no more listeners for this symbol, unsubscribe
    if (messageListeners.get(wsSymbol).size === 0) {
      messageListeners.delete(wsSymbol);
      
      // If socket is open, send unsubscribe message
      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify({ 
            'type': 'unsubscribe', 
            'symbol': wsSymbol 
          }));
          console.log(`Unsubscribed from ${wsSymbol}`);
        } catch (err) {
          console.error(`Error unsubscribing from ${wsSymbol}:`, err);
        }
      }
      
      // Remove from active subscriptions
      activeSubscriptions.delete(wsSymbol);
      pendingSubscriptions.delete(wsSymbol);
    }
    
    return true;
  },
  
  /**
   * Register a listener for connection status
   * @param {Function} callback - Callback function to call on connection changes
   * @param {string} listenerId - Unique identifier for the listener
   * @returns {boolean} - Success status
   */
  addConnectionListener: (callback, listenerId) => {
    try {
      connectionListeners.set(listenerId, callback);
      return true;
    } catch (error) {
      console.error('Error adding connection listener:', error);
      return false;
    }
  },
  
  /**
   * Unregister a listener for connection status
   * @param {string} listenerId - Unique identifier for the listener
   * @returns {boolean} - Success status
   */
  removeConnectionListener: (listenerId) => {
    try {
      connectionListeners.delete(listenerId);
      return true;
    } catch (error) {
      console.error('Error removing connection listener:', error);
      return false;
    }
  },

  /**
   * Simulate price and volume updates for testing
   * @param {string} symbol - Stock symbol
   * @param {number} basePrice - Starting price for simulation
   * @param {number} volatility - Price volatility factor (0-1)
   * @param {number} interval - Update interval in ms
   * @returns {Function} - Function to stop simulation
   */
  simulatePriceUpdates: (symbol, basePrice, volatility = 0.005, interval = 2000) => {
    let currentPrice = basePrice;
    let lastDirection = Math.random() > 0.5 ? 1 : -1;
    let directionChangeCounter = 0;
    
    // Set initial base volume (random between 100-1000)
    const baseVolume = Math.floor(Math.random() * 900) + 100;
    
    const timer = setInterval(() => {
      // Price change logic
      directionChangeCounter++;
      
      // 30% chance to change direction, or force change every 5 updates
      if (Math.random() < 0.3 || directionChangeCounter > 5) {
        lastDirection = -lastDirection;
        directionChangeCounter = 0;
      }
      
      // Calculate random price movement
      const changePercent = volatility * (Math.random() * 0.8 + 0.2) * lastDirection;
      const newPrice = currentPrice * (1 + changePercent);
      
      // Ensure price doesn't go negative or change too drastically
      currentPrice = Math.max(newPrice, basePrice * 0.7);
      
      // Generate simulated volume - more volume on bigger price changes
      const volumeMultiplier = 1 + Math.abs(changePercent) * 20;
      const tradeVolume = Math.floor(baseVolume * volumeMultiplier * (Math.random() * 0.5 + 0.75));
      
      // Notify all listeners for this symbol
      if (messageListeners.has(symbol)) {
        messageListeners.get(symbol).forEach(listener => {
          listener({
            price: currentPrice,
            volume: tradeVolume,
            timestamp: Date.now(),
            symbol: symbol
          });
        });
      }
    }, interval);
    
    return () => {
      clearInterval(timer);
    };
  },

  /**
   * Check WebSocket connection status
   * @returns {boolean} - True if connected, false otherwise
   */
  isWebSocketConnected: () => {
    return socket !== null && socket.readyState === WebSocket.OPEN;
  },
  
  /**
   * Get WebSocket connection details for debugging
   * @returns {Object} - Connection details
   */
  getConnectionDetails: () => {
    return {
      isConnected: socket !== null && socket.readyState === WebSocket.OPEN,
      connectionState: socket ? socket.readyState : -1,
      activeSubscriptions: Array.from(activeSubscriptions),
      pendingSubscriptions: Array.from(pendingSubscriptions),
      activeListeners: Array.from(messageListeners.keys()),
      reconnectAttempts,
      rateLimitBackoff
    };
  }
};

export default FinnhubService; 