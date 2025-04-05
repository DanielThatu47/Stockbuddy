import { API_URL } from '../config/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function to make API requests
const apiRequest = async (endpoint, method = 'GET', body = null) => {
  try {
    // Get auth token
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      throw new Error('Authentication required');
    }

    // Configure request headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // Configure the request
    const config = {
      method,
      headers
    };

    // Add request body if provided
    if (body) {
      config.body = JSON.stringify(body);
    }

    // Make the API call
    const response = await fetch(`${API_URL}/api/demotrading${endpoint}`, config);
    
    // Check for non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(text || 'Server error: Non-JSON response received');
    }
    
    const data = await response.json();

    // Handle API errors
    if (!response.ok) {
      throw new Error(data.message || data.error || 'An error occurred');
    }

    return data;
  } catch (error) {
    console.error('Demo Trading API request failed:', error.message);
    throw error;
  }
};

// Demo Trading Service
const demoTradingService = {
  // Get user's demo trading account
  getAccount: async () => {
    return apiRequest('/account');
  },

  // Execute a trade (buy or sell)
  executeTrade: async (tradeData) => {
    return apiRequest('/trade', 'POST', tradeData);
  },

  // Get transaction history
  getTransactions: async () => {
    return apiRequest('/transactions');
  },

  // Update current prices of holdings
  updateHoldings: async (holdingsData) => {
    return apiRequest('/holdings/update', 'PUT', { holdings: holdingsData });
  },

  // Reset trading account
  resetAccount: async () => {
    return apiRequest('/reset', 'POST');
  },

  // Add getPortfolioHistory function
  getPortfolioHistory: async () => {
    try {
      // Get portfolio history from backend
      const response = await apiRequest('/portfolio-history');
      
      // Return the history array with performance metrics
      if (response && response.history) {
        return {
          history: response.history,
          performance: response.performance
        };
      }
      
      // Fallback to empty history if endpoint fails or returns unexpected data
      return {
        history: [{
          date: new Date(),
          equity: 0,
          balance: 0,
          holdingsValue: 0
        }],
        performance: {
          day: { change: 0, percentage: 0 },
          week: { change: 0, percentage: 0 },
          month: { change: 0, percentage: 0 },
          year: { change: 0, percentage: 0 },
          total: { change: 0, percentage: 0 }
        }
      };
    } catch (error) {
      console.error('Error retrieving portfolio history:', error);
      // Return fallback history
      return {
        history: [{
          date: new Date(),
          equity: 0,
          balance: 0,
          holdingsValue: 0
        }],
        performance: {
          day: { change: 0, percentage: 0 },
          week: { change: 0, percentage: 0 },
          month: { change: 0, percentage: 0 },
          year: { change: 0, percentage: 0 },
          total: { change: 0, percentage: 0 }
        }
      };
    }
  }
};

export default demoTradingService; 