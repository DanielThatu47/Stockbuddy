import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import Header from '../components/Header';
import SectionHeader from '../components/SectionHeader';
import StockCard from '../components/StockCard';
import StatusCard from '../components/StatusCard';
import FeatureCard from '../components/FeatureCard';
import NewsCard from '../components/NewsCard';
import Colors from '../constants/colors';
import FinnhubService from '../services/FinnhubService';

const HomeScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [trendingStocks, setTrendingStocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marketStatus, setMarketStatus] = useState({
    status: "Checking...",
    message: "Fetching market status..."
  });
  // Add state for real-time volume updates
  const [recentVolumeActivity, setRecentVolumeActivity] = useState({});

  // Stock symbols to fetch data for (US stocks)
  const stockSymbols = ['MSFT', 'AMZN', 'TSLA', 'AAPL', 'GOOGL'];
  
  // Indian stock symbols with Yahoo Finance suffix format
  const indianStockSymbols = ['RELIANCE.BO', 'TCS.BO', 'HDFCBANK.BO', 'INFY.BO', 'ICICIBANK.BO'];

  // Fetch market status
  const fetchMarketStatus = async () => {
    try {
      // Get market status for BSE (Indian market) instead of NSE
      const data = await FinnhubService.getMarketStatus('BSE');
      console.log("Market status data:", data);
      
      if (data && data.hasOwnProperty('isOpen')) {
        const status = data.isOpen ? "Market is currently open" : "Market is currently closed";
        let message = "";
        
        // Calculate next opening or closing time
        const currentTime = new Date();
        const currentHour = currentTime.getHours();
        const currentMinute = currentTime.getMinutes();
        
        if (data.isOpen) {
          // Indian market typically closes at 3:30 PM IST
          const closingHour = 15;
          const closingMinute = 30;
          
          let hoursLeft = closingHour - currentHour;
          let minutesLeft = closingMinute - currentMinute;
          
          if (minutesLeft < 0) {
            hoursLeft -= 1;
            minutesLeft += 60;
          }
          
          message = `Closes in ${hoursLeft} hours ${minutesLeft} minutes`;
        } else {
          // Indian market typically opens at 9:15 AM IST
          const openingHour = 9;
          const openingMinute = 15;
          
          // Calculate time until opening
          let nextOpeningDate = new Date();
          
          // If it's past opening time, set to next day
          if (currentHour > openingHour || (currentHour === openingHour && currentMinute >= openingMinute)) {
            nextOpeningDate.setDate(nextOpeningDate.getDate() + 1);
          }
          
          nextOpeningDate.setHours(openingHour, openingMinute, 0);
          
          // Calculate difference in hours and minutes
          const diffMs = nextOpeningDate - currentTime;
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          
          message = `Opens in ${diffHrs} hours ${diffMins} minutes`;
        }
        
        setMarketStatus({
          status: status,
          message: message
        });
      } else {
        setMarketStatus({
          status: "Market status unavailable",
          message: "Could not retrieve market status"
        });
      }
    } catch (error) {
      console.error("Error fetching market status:", error);
      setMarketStatus({
        status: "Market status unavailable",
        message: "Error retrieving market status"
      });
    }
  };

  // Set up WebSocket for real-time volume updates
  const startRealTimeUpdates = () => {
    // Create a combined list of all symbols
    const allSymbols = [...stockSymbols, ...indianStockSymbols];
    
    // Subscribe to each symbol
    allSymbols.forEach(symbol => {
      FinnhubService.addPriceUpdateListener(symbol, (tradeData) => {
        if (tradeData.volume) {
          // Update trading volume and trigger animation
          setTrendingStocks(prevStocks => {
            const updatedStocks = [...prevStocks];
            
            // For Indian stocks, we need to match both formats (.BO and BSE:)
            let stockIndex = updatedStocks.findIndex(stock => stock.symbol === symbol);
            
            // If not found and it's an Indian stock, try the alternative format
            if (stockIndex === -1) {
              if (symbol.endsWith('.BO')) {
                const bseSymbol = `BSE:${symbol.replace('.BO', '')}`;
                stockIndex = updatedStocks.findIndex(stock => stock.symbol === bseSymbol);
              } else if (symbol.endsWith('.NS')) {
                const nseSymbol = `NSE:${symbol.replace('.NS', '')}`;
                stockIndex = updatedStocks.findIndex(stock => stock.symbol === nseSymbol);
              } else if (symbol.includes(':')) {
                // Try Yahoo Finance format
                const parts = symbol.split(':');
                const exchange = parts[0];
                const ticker = parts[1];
                if (exchange === 'BSE') {
                  stockIndex = updatedStocks.findIndex(stock => stock.symbol === `${ticker}.BO`);
                } else if (exchange === 'NSE') {
                  stockIndex = updatedStocks.findIndex(stock => stock.symbol === `${ticker}.NS`);
                }
              }
            }
            
            if (stockIndex !== -1) {
              // Format volume with appropriate suffix
              const formatVolume = (volume) => {
                if (!volume) return 'N/A';
                if (volume >= 1000000000) {
                  return (volume / 1000000000).toFixed(1) + 'B';
                } else if (volume >= 1000000) {
                  return (volume / 1000000).toFixed(1) + 'M';
                } else if (volume >= 1000) {
                  return (volume / 1000).toFixed(1) + 'K';
                }
                return volume.toString();
              };
              
              // Accumulate volume for the stock
              let currentVolume = updatedStocks[stockIndex].volume;
              if (typeof currentVolume === 'string') {
                // Convert formatted volume back to number if needed
                if (currentVolume.endsWith('B')) {
                  currentVolume = parseFloat(currentVolume) * 1000000000;
                } else if (currentVolume.endsWith('M')) {
                  currentVolume = parseFloat(currentVolume) * 1000000;
                } else if (currentVolume.endsWith('K')) {
                  currentVolume = parseFloat(currentVolume) * 1000;
                } else {
                  currentVolume = parseFloat(currentVolume);
                }
              }
              
              const newVolume = currentVolume + tradeData.volume;
              updatedStocks[stockIndex] = {
                ...updatedStocks[stockIndex],
                volume: formatVolume(newVolume),
                price: tradeData.price,
                priceChange: ((tradeData.price / updatedStocks[stockIndex].prevClose) - 1) * 100
              };
            }
            
            return updatedStocks;
          });
          
          // Set recent volume activity to trigger animations
          setRecentVolumeActivity(prev => ({
            ...prev,
            [symbol]: tradeData.volume
          }));
          
          // Clear recent volume activity after animation
          setTimeout(() => {
            setRecentVolumeActivity(prev => {
              const updated = {...prev};
              delete updated[symbol];
              return updated;
            });
          }, 2000);
        }
      }, 'homeScreen');
      
      // Subscribe to the symbol for real-time updates
      FinnhubService.subscribeToSymbol(symbol);
    });
  };
  
  // Stop real-time updates and unsubscribe
  const stopRealTimeUpdates = () => {
    // Create a combined list of all symbols
    const allSymbols = [...stockSymbols, ...indianStockSymbols];
    
    // Unsubscribe from each symbol
    allSymbols.forEach(symbol => {
      FinnhubService.removePriceUpdateListener(symbol, 'homeScreen');
    });
  };

  // Fetch stock data from Finnhub API
  const fetchStockData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stockDataPromises = stockSymbols.map(async (symbol) => {
        try {
          const quoteData = await FinnhubService.getQuote(symbol);
          const profileData = await FinnhubService.getCompanyProfile(symbol);
          
          // Format volume with appropriate suffix
          const formatVolume = (volume) => {
            if (!volume) return 'N/A';
            if (volume >= 1000000000) {
              return (volume / 1000000000).toFixed(1) + 'B';
            } else if (volume >= 1000000) {
              return (volume / 1000000).toFixed(1) + 'M';
            } else if (volume >= 1000) {
              return (volume / 1000).toFixed(1) + 'K';
            }
            return volume.toString();
          };
          
          console.log(`Stock data for ${symbol}:`, { quoteData, profileData });
          
          return {
            symbol: symbol,
            name: profileData && profileData.name ? profileData.name : symbol,
            price: quoteData && typeof quoteData.c === 'number' ? quoteData.c : 0,
            priceChange: quoteData && typeof quoteData.dp === 'number' ? quoteData.dp : 0,
            volume: formatVolume(quoteData && quoteData.v ? quoteData.v : 0),
            logo: profileData && profileData.logo ? profileData.logo : null,
            currency: profileData && profileData.currency ? profileData.currency : 'USD',
            prevClose: quoteData && typeof quoteData.pc === 'number' ? quoteData.pc : 0,
          };
        } catch (e) {
          console.error(`Error fetching data for ${symbol}:`, e);
          // Return fallback data if API call fails
          return {
            symbol: symbol,
            name: symbol,
            price: 0,
            priceChange: 0,
            volume: 'N/A',
            logo: null,
            currency: 'USD',
            prevClose: 0,
          };
        }
      });
      
      // Add some Indian stocks with Yahoo Finance suffix format
      const indianStockDataPromises = indianStockSymbols.map(async (symbol) => {
        try {
          // Extract core symbol without suffix
          const coreSymbol = symbol.replace('.BO', '').replace('.NS', '');
          const exchange = symbol.endsWith('.BO') ? 'BSE' : 'NSE';
          
          const quoteData = await FinnhubService.getIndianStockQuote(coreSymbol, exchange);
          const profileData = await FinnhubService.getIndianCompanyProfile(coreSymbol, exchange);
          
          // Format volume with appropriate suffix
          const formatVolume = (volume) => {
            if (!volume) return 'N/A';
            if (volume >= 1000000000) {
              return (volume / 1000000000).toFixed(1) + 'B';
            } else if (volume >= 1000000) {
              return (volume / 1000000).toFixed(1) + 'M';
            } else if (volume >= 1000) {
              return (volume / 1000).toFixed(1) + 'K';
            }
            return volume.toString();
          };
          
          return {
            symbol: symbol, // Use original symbol with suffix
            name: profileData && profileData.name ? profileData.name : coreSymbol,
            price: quoteData && typeof quoteData.c === 'number' ? quoteData.c : 0,
            priceChange: quoteData && typeof quoteData.dp === 'number' ? quoteData.dp : 0,
            volume: formatVolume(quoteData && quoteData.v ? quoteData.v : 0),
            logo: profileData && profileData.logo ? profileData.logo : null,
            currency: 'INR', // Indian stocks use INR
            prevClose: quoteData && typeof quoteData.pc === 'number' ? quoteData.pc : 0,
            exchange: exchange
          };
        } catch (e) {
          console.error(`Error fetching data for ${symbol}:`, e);
          return {
            symbol: symbol,
            name: symbol.replace('.BO', '').replace('.NS', ''),
            price: 0,
            priceChange: 0,
            volume: 'N/A',
            logo: null,
            currency: 'INR',
            prevClose: 0,
            exchange: symbol.endsWith('.BO') ? 'BSE' : 'NSE'
          };
        }
      });
      
      const stockData = await Promise.all([...stockDataPromises, ...indianStockDataPromises]);
      console.log('All stock data:', stockData);
      
      setTrendingStocks(stockData.filter(stock => stock.price > 0));
    } catch (error) {
      console.error('Error fetching stock data:', error);
      setError('Failed to load stock data. Please try again later.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchStockData();
    fetchMarketStatus();
    
    // Start real-time updates for volume data
    startRealTimeUpdates();
    
    // Cleanup function to handle WebSocket disconnection
    return () => {
      stopRealTimeUpdates();
    };
  }, []);

  // Refresh data
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchStockData();
    fetchMarketStatus();
  }, []);

  // Mock data for features
  const features = [
    { id: 1, title: 'AIPredict', icon: 'brain', type: 'MaterialCommunityIcons', color: '#8e44ad' },
    { id: 2, title: 'Portfolio Analysis', icon: 'chart-line-variant', type: 'MaterialCommunityIcons', color: '#3498db' },
    { id: 3, title: 'Risk Assessment', icon: 'shield-check', type: 'MaterialCommunityIcons', color: '#2ecc71' },
    { id: 4, title: 'Market Scanner', icon: 'radar', type: 'MaterialCommunityIcons', color: '#e74c3c' },
    { id: 5, title: 'Demo Trading', icon: 'finance', type: 'MaterialCommunityIcons', color: '#f39c12' },
    { id: 6, title: 'Trading Bots', icon: 'robot', type: 'MaterialCommunityIcons', color: '#9b59b6' },
    { id: 7, title: 'Alerts', icon: 'bell-ring', type: 'MaterialCommunityIcons', color: '#1abc9c' },
  ];

  // Mock data for news
  const news = [
    {
      id: 1,
      title: 'Latest Market Updates and Trends',
      summary: 'Get the latest insights on market movements and expert analysis.',
      time: '2 hours ago',
      sentiment: 'Positive',
    },
    {
      id: 2,
      title: 'Latest Market Updates and Trends',
      summary: 'Get the latest insights on market movements and expert analysis.',
      time: '3 hours ago',
      sentiment: 'Neutral',
    },
  ];

  // Mock function to get unread notifications count
  useEffect(() => {
    // In a real app, this would come from your backend
    setUnreadNotifications(2); // Mock value
  }, []);

  // Function to handle feature card navigation
  const handleFeaturePress = (featureId) => {
    switch (featureId) {
      case 1: // AIPredict
        navigation.navigate('AIPrediction');
        break;
      case 2: // Portfolio Analysis
        navigation.navigate('PortfolioAnalysis');
        break;
      case 3: // Risk Assessment
        navigation.navigate('RiskAssessment');
        break;
      case 4: // Market Scanner
        navigation.navigate('MarketScanner');
        break;
      case 5: // Demo Trading
        navigation.navigate('DemoTrading');
        break;
      case 6: // Trading Bots
        navigation.navigate('TradingBots');
        break;
      case 7: // Alerts
        navigation.navigate('Alerts');
        break;
      default:
        break;
    }
  };

  // Navigate to search screen with all stocks
  const handleSeeAllStocks = () => {
    navigation.navigate('Search', { source: 'trendingStocks' });
  };

  // Render stock section
  const renderStockSection = () => {
    if (isLoading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading stock data...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchStockData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (trendingStocks.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No stock data available</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchStockData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Display stocks in a grid view (max 4 stocks on home screen)
    const displayStocks = trendingStocks.slice(0, 4);

    return (
      <View style={styles.stockGrid}>
        {displayStocks.map((stock, index) => (
          <StockCard
            key={index}
            symbol={stock.symbol}
            companyName={stock.name}
            price={stock.price}
            priceChange={stock.priceChange}
            volume={stock.volume}
            logo={stock.logo}
            currency={stock.currency}
            recentVolume={recentVolumeActivity[stock.symbol] || 0}
            onPress={() => navigation.navigate('StockDetail', { symbol: stock.symbol })}
            containerStyle={styles.stockCardStyle}
          />
        ))}
        <TouchableOpacity 
          style={styles.seeMoreCard}
          onPress={handleSeeAllStocks}
        >
          <Text style={styles.seeMoreText}>See All</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="StockBuddy"
        subtitle="Smart Stock Predictions"
        onSearchPress={() => navigation.navigate('Search')}
      >
        <TouchableOpacity 
          style={styles.headerIcon}
          onPress={() => navigation.navigate('NotifyView')}
        >
          <View style={styles.notificationContainer}>
            <Ionicons name="notifications-outline" size={24} color={Colors.white} />
            {unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Header>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <SectionHeader title="Market Overview" />
        
        <StatusCard 
          status={marketStatus.status} 
          message={marketStatus.message} 
        />

        <SectionHeader title="Quick Access" />
        
        <View style={styles.featuresGrid}>
          {features.map((feature) => (
            <FeatureCard
              key={feature.id}
              title={feature.title}
              icon={feature.icon}
              backgroundColor={feature.color}
              onPress={() => handleFeaturePress(feature.id)}
            />
          ))}
        </View>

        <SectionHeader 
          title="Trending Stocks" 
          actionText="See All"
          onActionPress={handleSeeAllStocks}
        />
        
        {renderStockSection()}

        <SectionHeader 
          title="Market News"
          actionText="More News"
          onActionPress={() => {}}
        />
        
        {news.map((item) => (
          <NewsCard
            key={item.id}
            title={item.title}
            summary={item.summary}
            time={item.time}
            sentiment={item.sentiment}
            onPress={() => {}}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerIcon: {
    padding: 4,
  },
  notificationContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  stockGrid: {
    marginVertical: 10,
  },
  stockCardStyle: {
    width: '100%',
    marginBottom: 8,
    marginRight: 0,
    paddingVertical: 10,
  },
  seeMoreCard: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  seeMoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginRight: 8,
  },
  loadingContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: Colors.darkGray,
  },
  errorContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: Colors.error,
    marginBottom: 10,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
});

export default HomeScreen;