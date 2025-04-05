# Demo Trading Feature

This feature provides a risk-free environment for users to practice stock trading with virtual money. It simulates real market conditions using actual stock prices but with virtual currency.

## Features

- **Demo Trading Account**: Each user gets a demo trading account with $100,000 virtual money
- **Buy & Sell Stocks**: Users can execute buy and sell orders with real-time stock prices
- **Portfolio Management**: View holdings, track performance, and analyze profits/losses
- **Transaction History**: Complete history of all trading activities
- **Real-Time Updates**: Stock prices are updated in real-time using Finnhub API
- **Account Reset**: Option to reset the account back to initial state

## Screens

1. **DemoTradingScreen.js** - Main screen that displays:
   - Account summary (balance, equity, profit/loss)
   - Portfolio holdings
   - Transaction history
   - Actions (Trade, Reset)

2. **TradeScreen.js** - Allows users to:
   - Search for stocks
   - Execute buy/sell orders
   - View real-time stock prices
   - Calculate order cost/proceeds

## Integration

This feature integrates with:

- **Backend API**: Stores account data, holdings, and transactions
- **Stock Data APIs**: Gets real-time stock prices and company information
- **Portfolio Analysis**: Complements the portfolio analysis feature with actual trading data
- **Risk Assessment**: Provides real trading scenarios for risk analysis

## Technical Implementation

- Demo trading data is stored in MongoDB through the backend API
- Frontend communicates with backend via RESTful endpoints
- Real-time stock data is fetched from Finnhub API
- Animations are used to enhance the user experience

## Backend Routes

- `GET /api/demotrading/account` - Get user's demo trading account
- `POST /api/demotrading/trade` - Execute a buy or sell trade
- `GET /api/demotrading/transactions` - Get transaction history
- `PUT /api/demotrading/holdings/update` - Update holdings with current prices
- `POST /api/demotrading/reset` - Reset the demo trading account

## Future Enhancements

- Advanced order types (limit, stop-loss)
- Watchlists integration
- Performance charts and analytics
- Trading competitions between users
- AI-powered trading recommendations based on the app's prediction model 