import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Animated,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import Colors from '../../constants/colors';
import FinnhubService from '../../services/FinnhubService';
import AlphaVantageService from '../../services/AlphaVantageService';
import StockChart from '../../components/StockChart';

const StockDetailScreen = ({ route, navigation }) => {
  const { symbol, apiProvider = 'finnhub' } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companyProfile, setCompanyProfile] = useState(null);
  const [quoteData, setQuoteData] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('oneDay');
  const [chartData, setChartData] = useState([]);
  const [isRealTimeActive, setIsRealTimeActive] = useState(false);
  const [livePrice, setLivePrice] = useState(null);
  const [livePriceChange, setLivePriceChange] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [simulationStopFunc, setSimulationStopFunc] = useState(null);
  
  // Animation values
  const priceScale = useRef(new Animated.Value(1)).current;
  const priceOpacity = useRef(new Animated.Value(1)).current;
  
  // Store the previous price for animation and color determination
  const prevPriceRef = useRef(null);
  const priceDirectionRef = useRef(null);
  
  // Get the service based on the API provider
  const getService = () => {
    return apiProvider === 'alphavantage' ? AlphaVantageService : FinnhubService;
  };
  
  // Format currency based on stock's country
  const getCurrencySymbol = (currency) => {
    switch (currency) {
      case 'INR':
        return '₹';
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      case 'JPY':
        return '¥';
      case 'USD':
      default:
        return '$';
    }
  };
  
  // Get timeframes from the appropriate service
  const timeframes = getService().getTimePeriods();
  
  // Fetch stock data on component mount
  useEffect(() => {
    const fetchStockData = async () => {
      setLoading(true);
      setError('');
      
      try {
        const service = getService();
        
        // Fetch company profile and quote data in parallel
        const [profileResponse, quoteResponse] = await Promise.all([
          service.getCompanyProfile(symbol),
          service.getQuote(symbol)
        ]);
        
        setCompanyProfile(profileResponse);
        setQuoteData(quoteResponse);
        
        // Set initial price for live updates
        setLivePrice(quoteResponse.c);
        prevPriceRef.current = quoteResponse.c;
        
        // Load chart data for the selected timeframe
        await loadChartData(selectedTimeframe);
        
        // Start real-time updates only if using Finnhub and market is open
        if (apiProvider === 'finnhub') {
          const marketStatus = await FinnhubService.getMarketStatus(
            symbol.includes(':') ? symbol.split(':')[0] : 'US'
          );
          
          if (marketStatus.isOpen) {
            startRealTimeUpdates();
          } else {
            // If market is closed, we'll use simulation for demo purposes
            startSimulation();
          }
        } else {
          // Alpha Vantage doesn't provide real-time updates, so we'll use simulation
          startSimulation();
        }
      } catch (err) {
        setError('Failed to load stock data. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStockData();
    
    // Cleanup function to unsubscribe when component unmounts
    return () => {
      stopRealTimeUpdates();
    };
  }, [symbol, apiProvider]);
  
  // Start real-time updates via WebSocket (Finnhub only)
  const startRealTimeUpdates = () => {
    if (apiProvider !== 'finnhub') {
      startSimulation();
      return;
    }
    
    // Add connection status listener
    FinnhubService.addConnectionListener((status) => {
      console.log(`WebSocket connection status changed: ${status.connected ? 'Connected' : 'Disconnected'}`);
      setConnectionStatus(status.connected);
    }, 'stockDetail');
    
    // Add price update listener
    FinnhubService.addPriceUpdateListener(symbol, (tradeData) => {
      const newPrice = tradeData.price;
      const oldPrice = prevPriceRef.current || newPrice;
      
      // Determine price direction
      const direction = newPrice > oldPrice ? 'up' : newPrice < oldPrice ? 'down' : 'same';
      priceDirectionRef.current = direction;
      
      // Calculate price change from the base price
      if (quoteData) {
        const priceChange = newPrice - quoteData.pc;
        const percentChange = (priceChange / quoteData.pc) * 100;
        
        setLivePriceChange({
          change: priceChange,
          percent: percentChange
        });
      }
      
      // Animate price change
      if (newPrice !== oldPrice) {
        // Pulse animation for price change
        Animated.sequence([
          Animated.parallel([
            Animated.timing(priceScale, {
              toValue: 1.2,
              duration: 200,
              useNativeDriver: true
            }),
            Animated.timing(priceOpacity, {
              toValue: 0.7,
              duration: 200,
              useNativeDriver: true
            })
          ]),
          Animated.parallel([
            Animated.timing(priceScale, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true
            }),
            Animated.timing(priceOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true
            })
          ])
        ]).start();
      }
      
      setLivePrice(newPrice);
      prevPriceRef.current = newPrice;
      setLastUpdate(new Date());
      setIsRealTimeActive(true);
    }, 'stockDetail');
    
    // Debug WebSocket connection status
    const connectionDetails = FinnhubService.getConnectionDetails();
    console.log('WebSocket connection details:', connectionDetails);
    
    // Subscribe to the symbol
    FinnhubService.subscribeToSymbol(symbol);
  };
  
  // Stop real-time updates
  const stopRealTimeUpdates = () => {
    console.log(`Stopping real-time updates for ${symbol}`);
    
    // If simulation is running, stop it
    if (simulationStopFunc) {
      simulationStopFunc();
      setSimulationStopFunc(null);
    }
    
    // Remove connection listener
    FinnhubService.removeConnectionListener('stockDetail');
    
    // Remove price update listener and unsubscribe
    FinnhubService.removePriceUpdateListener(symbol, 'stockDetail');
    
    setIsRealTimeActive(false);
  };
  
  // Start price simulation for demo purposes
  const startSimulation = () => {
    if (quoteData) {
      // Stop any existing simulation
      if (simulationStopFunc) {
        simulationStopFunc();
      }
      
      // Start a new simulation
      const service = getService();
      const stopFunc = service.simulatePriceUpdates
        ? service.simulatePriceUpdates(
            symbol, 
            quoteData.c, 
            0.002,  // 0.2% volatility
            3000    // Update every 3 seconds
          )
        : FinnhubService.simulatePriceUpdates(
            symbol, 
            quoteData.c, 
            0.002,
            3000
          );
      
      setSimulationStopFunc(stopFunc);
      setIsRealTimeActive(true);
    }
  };
  
  // Toggle real-time updates
  const toggleRealTimeUpdates = () => {
    if (isRealTimeActive) {
      stopRealTimeUpdates();
    } else {
      // If we have quote data, try simulation
      if (quoteData) {
        startSimulation();
      }
      // In a real app, we'd check if market is open and start real WebSocket updates
    }
  };
  
  // Load chart data for a specific timeframe
  const loadChartData = async (timeframeKey) => {
    try {
      const service = getService();
      const timeframe = timeframes[timeframeKey];
      const historicalData = await service.getHistoricalData(
        symbol,
        timeframe.resolution,
        timeframe.from,
        timeframe.to
      );
      
      const formattedData = service.formatCandleData(historicalData);
      const lineChartData = service.formatForLineChart(formattedData);
      
      setChartData(lineChartData);
      setSelectedTimeframe(timeframeKey);
    } catch (err) {
      console.error('Error loading chart data:', err);
      setError('Failed to load chart data');
    }
  };
  
  // Format chart data for StockChart component
  const formatChartDataForComponent = () => {
    if (!chartData || chartData.length === 0) {
      return { labels: [], values: [] };
    }

    // Sort data by timestamp in ascending order
    const sortedData = [...chartData].sort((a, b) => a.x - b.x);
    
    // Format timestamps as labels (showing only a few points)
    const numPoints = sortedData.length;
    const labelIndices = [0, Math.floor(numPoints/4), Math.floor(numPoints/2), Math.floor(3*numPoints/4), numPoints-1].filter(i => i < numPoints);
    
    const labels = labelIndices.map(i => {
      const date = new Date(sortedData[i].x * 1000);
      return timeframes[selectedTimeframe].resolution === 'D' || 
             timeframes[selectedTimeframe].resolution === 'W' || 
             timeframes[selectedTimeframe].resolution === 'M' 
        ? date.toLocaleDateString() 
        : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
    
    // Use all data points for values
    const values = sortedData.map(point => point.y);
    
    return { labels, values };
  };

  // Map timeframe to StockChart period
  const mapTimeframeToPeriod = () => {
    switch(selectedTimeframe) {
      case 'oneDay': return '1D';
      case 'oneWeek': return '1W';
      case 'oneMonth': return '1M';
      case 'threeMonths': return '3M';
      case 'oneYear': return '1Y';
      case 'sixMonths': return 'All';
      default: return '1D';
    }
  };
  
  // Calculate price change and percent change from static data
  const getStaticPriceChange = () => {
    if (!quoteData) return { change: 0, percent: 0 };
    
    const change = quoteData.c - quoteData.pc;
    const percentChange = (change / quoteData.pc) * 100;
    
    return {
      change: change.toFixed(2),
      percent: percentChange.toFixed(2)
    };
  };
  
  // Get the active price change data (either live or static)
  const getPriceChange = () => {
    if (livePriceChange && isRealTimeActive) {
      return {
        change: livePriceChange.change.toFixed(2),
        percent: livePriceChange.percent.toFixed(2)
      };
    }
    return getStaticPriceChange();
  };
  
  const priceChange = getPriceChange();
  const isPositive = parseFloat(priceChange.change) >= 0;
  const currencySymbol = getCurrencySymbol(companyProfile?.currency || 'USD');
  
  // Get price color based on direction
  const getPriceColor = () => {
    if (!isRealTimeActive) {
      return isPositive ? Colors.success : Colors.error;
    }
    
    if (priceDirectionRef.current === 'up') {
      return Colors.success;
    } else if (priceDirectionRef.current === 'down') {
      return Colors.error;
    }
    return Colors.secondary;
  };
  
  // Format timestamp to readable time
  const formatLastUpdate = (timestamp) => {
    if (!timestamp) return '';
    
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  // Render timeframe selector buttons
  const renderTimeframeButtons = () => {
    return Object.keys(timeframes).map((key) => (
      <TouchableOpacity
        key={key}
        style={[
          styles.timeframeButton,
          selectedTimeframe === key && styles.selectedTimeframeButton
        ]}
        onPress={() => loadChartData(key)}
      >
        <Text
          style={[
            styles.timeframeButtonText,
            selectedTimeframe === key && styles.selectedTimeframeButtonText
          ]}
        >
          {timeframes[key].label}
        </Text>
      </TouchableOpacity>
    ));
  };
  
  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title={symbol}
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading stock data...</Text>
        </View>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.container}>
        <Header
          title={symbol}
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadChartData(selectedTimeframe)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Header
        title={companyProfile?.name || symbol}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />
      
      <ScrollView style={styles.scrollContainer}>
        {/* API Provider Indicator */}
        <View style={styles.apiProviderContainer}>
          <Text style={styles.apiProviderText}>
            Data provided by {apiProvider === 'alphavantage' ? 'Alpha Vantage' : 'Finnhub'}
          </Text>
        </View>
        
        {/* Stock price section */}
        <View style={styles.priceSection}>
          <View style={styles.realTimeContainer}>
            <TouchableOpacity 
              style={[styles.realTimeButton, isRealTimeActive && styles.realTimeActiveButton]} 
              onPress={toggleRealTimeUpdates}
            >
              <Ionicons
                name={isRealTimeActive ? "flash" : "flash-outline"}
                size={16}
                color={isRealTimeActive ? Colors.white : Colors.primary}
              />
              <Text style={[
                styles.realTimeText,
                isRealTimeActive && styles.realTimeActiveText
              ]}>
                {isRealTimeActive ? "LIVE" : "STATIC"}
              </Text>
            </TouchableOpacity>
            
            {isRealTimeActive && lastUpdate && (
              <Text style={styles.lastUpdateText}>
                Updated: {formatLastUpdate(lastUpdate)}
              </Text>
            )}
          </View>
          
          <View style={styles.priceDisplayContainer}>
            <Animated.Text 
              style={[
                styles.currentPrice,
                { transform: [{ scale: priceScale }], opacity: priceOpacity, color: getPriceColor() }
              ]}
            >
              {currencySymbol}
              {(livePrice && isRealTimeActive ? 
                Number(livePrice || 0).toFixed(2) : 
                Number(quoteData?.c || 0).toFixed(2))}
            </Animated.Text>
            
            <View style={styles.directionIndicator}>
              <Ionicons
                name={isPositive ? 'trending-up' : 'trending-down'}
                size={24}
                color={isPositive ? Colors.success : Colors.error}
              />
            </View>
          </View>
          
          <View style={styles.priceChangeContainer}>
            <View style={[styles.priceChangePill, {backgroundColor: isPositive ? '#e6f7ed' : '#ffecec'}]}>
              <Ionicons
                name={isPositive ? 'caret-up' : 'caret-down'}
                size={16}
                color={isPositive ? Colors.success : Colors.error}
              />
              <Text
                style={[
                  styles.priceChangeText,
                  { color: isPositive ? Colors.success : Colors.error }
                ]}
              >
                {currencySymbol}{Math.abs(priceChange.change)} ({Math.abs(priceChange.percent)}%)
              </Text>
            </View>
            
            <Text style={styles.todayText}>Today</Text>
          </View>
        </View>
        
        {/* Chart section */}
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Price Chart</Text>
            {connectionStatus && (
              <View style={styles.connectionStatus}>
                <View style={[
                  styles.connectionIndicator, 
                  { backgroundColor: connectionStatus ? Colors.success : Colors.error }
                ]} />
                <Text style={styles.connectionText}>
                  {connectionStatus ? 'Connected' : 'Disconnected'}
                </Text>
              </View>
            )}
          </View>
          
          {chartData.length > 0 ? (
            <StockChart 
              data={formatChartDataForComponent()}
              period={mapTimeframeToPeriod()}
              onPeriodChange={(period) => {
                const periodMap = {
                  '1D': 'oneDay',
                  '1W': 'oneWeek',
                  '1M': 'oneMonth',
                  '3M': 'threeMonths',
                  '1Y': 'oneYear',
                  'All': 'sixMonths'
                };
                loadChartData(periodMap[period]);
              }}
            />
          ) : (
            <View style={styles.chartPlaceholder}>
              <Text style={styles.chartPlaceholderText}>
                No chart data available
              </Text>
              <Text style={styles.chartPlaceholderSubtext}>
                Try another timeframe
              </Text>
            </View>
          )}
          
          <View style={styles.timeframeButtonsContainer}>
            {renderTimeframeButtons()}
          </View>
        </View>
        
        {/* Company info section */}
        {companyProfile && (
          <View style={styles.companyInfoSection}>
            <Text style={styles.sectionTitle}>Company Information</Text>
            
            {/* Add company logo */}
            {companyProfile.logo && (
              <View style={styles.logoContainer}>
                <Image 
                  source={{ uri: companyProfile.logo }} 
                  style={styles.companyLogo}
                  resizeMode="contain"
                />
              </View>
            )}
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Symbol</Text>
              <Text style={styles.infoValue}>{companyProfile.ticker}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Industry</Text>
              <Text style={styles.infoValue}>{companyProfile.finnhubIndustry}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Market Cap</Text>
              <Text style={styles.infoValue}>
                {companyProfile.marketCapitalization ? 
                  `${currencySymbol}${(companyProfile.marketCapitalization / 1000).toFixed(2)}B` : 
                  'N/A'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Country</Text>
              <Text style={styles.infoValue}>{companyProfile.country}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Exchange</Text>
              <Text style={styles.infoValue}>{companyProfile.exchange}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Currency</Text>
              <Text style={styles.infoValue}>{companyProfile.currency}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>IPO Date</Text>
              <Text style={styles.infoValue}>{companyProfile.ipo}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Website</Text>
              <Text style={[styles.infoValue, styles.linkText]}>{companyProfile.weburl}</Text>
            </View>
          </View>
        )}
        
        {/* Trading stats section */}
        {quoteData && (
          <View style={styles.tradingStatsSection}>
            <Text style={styles.sectionTitle}>Trading Stats</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Open</Text>
                <Text style={styles.statValue}>{currencySymbol}{quoteData.o.toFixed(2)}</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>High</Text>
                <Text style={styles.statValue}>{currencySymbol}{quoteData.h.toFixed(2)}</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Low</Text>
                <Text style={styles.statValue}>{currencySymbol}{quoteData.l.toFixed(2)}</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Prev Close</Text>
                <Text style={styles.statValue}>{currencySymbol}{quoteData.pc.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.secondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
  priceSection: {
    padding: 20,
  },
  currentPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  priceDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  directionIndicator: {
    marginLeft: 10,
  },
  priceChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    justifyContent: 'space-between',
  },
  priceChangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  priceChangeText: {
    fontSize: 16,
    marginLeft: 5,
    fontWeight: '600',
  },
  todayText: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  realTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  realTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  realTimeActiveButton: {
    backgroundColor: Colors.primary,
  },
  realTimeText: {
    marginLeft: 5,
    fontWeight: '600',
    color: Colors.primary,
    fontSize: 12,
  },
  realTimeActiveText: {
    color: Colors.white,
  },
  lastUpdateText: {
    fontSize: 12,
    color: Colors.darkGray,
  },
  chartContainer: {
    backgroundColor: Colors.white,
    marginHorizontal: 15,
    borderRadius: 15,
    padding: 15,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  connectionText: {
    fontSize: 12,
    color: Colors.darkGray,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPlaceholderText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.darkGray,
  },
  chartPlaceholderSubtext: {
    fontSize: 14,
    color: Colors.darkGray,
    marginTop: 5,
  },
  timeframeButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  timeframeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
  },
  selectedTimeframeButton: {
    backgroundColor: Colors.primary,
  },
  timeframeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.darkGray,
  },
  selectedTimeframeButtonText: {
    color: Colors.white,
  },
  companyInfoSection: {
    backgroundColor: Colors.white,
    marginHorizontal: 15,
    borderRadius: 15,
    padding: 15,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.secondary,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '500',
  },
  linkText: {
    color: Colors.primary,
  },
  tradingStatsSection: {
    backgroundColor: Colors.white,
    marginHorizontal: 15,
    borderRadius: 15,
    padding: 15,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    paddingVertical: 10,
    paddingRight: 10,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  statValue: {
    fontSize: 16,
    color: Colors.secondary,
    fontWeight: '500',
    marginTop: 5,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  companyLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  apiProviderContainer: {
    backgroundColor: Colors.lightGray,
    paddingVertical: 5,
    paddingHorizontal: 15,
    alignItems: 'center',
    marginBottom: 5,
    marginTop: 5,
  },
  apiProviderText: {
    fontSize: 12,
    color: Colors.darkGray,
    fontStyle: 'italic',
  },
});

export default StockDetailScreen; 