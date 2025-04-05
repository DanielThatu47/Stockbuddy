export const API_URL = 'http://192.168.214.238:5000';
export const MODEL_BACKEND_URL = 'http://192.168.214.238:5001';

export const STOCK_EXCHANGES = [
    { id: 'NASDAQ', name: 'NASDAQ' },
    { id: 'NYSE', name: 'New York Stock Exchange' },
    { id: 'BSE', name: 'Bombay Stock Exchange' },
    { id: 'NSE', name: 'National Stock Exchange' }
  ];
  
  export const TIMEFRAMES = [
    { id: '1D', label: '1D', days: 1, interval: '5' },
    { id: '1W', label: '1W', days: 7, interval: '30' },
    { id: '1M', label: '1M', days: 30, interval: 'D' },
    { id: '3M', label: '3M', days: 90, interval: 'D' },
    { id: '1Y', label: '1Y', days: 365, interval: 'W' }
  ]; 