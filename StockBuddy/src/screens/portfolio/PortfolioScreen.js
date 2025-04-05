import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import SectionHeader from '../../components/SectionHeader';
import StockCard from '../../components/StockCard';
import StockChart from '../../components/StockChart';
import Colors from '../../constants/colors';
import demoTradingService from '../../services/demoTradingService';
import FinnhubService from '../../services/FinnhubService';

const PortfolioScreen = ({ navigation }) => {
  const [chartPeriod, setChartPeriod] = useState('1D');
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState({
    labels: ['9AM', '11AM', '1PM', '3PM', '5PM'],
    values: [142.5, 143.1, 144.7, 143.8, 145.2],
  });
  
  // Fetch account data
  const fetchAccountData = useCallback(async () => {
    try {
      setError(null);
      const data = await demoTradingService.getAccount();
      console.log('Portfolio data fetched successfully');
      setAccount(data);
      
      // Update holdings with current prices if we have holdings
      if (data?.holdings?.length > 0) {
        updateHoldingPrices(data.holdings);
      }
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      setError('Failed to load portfolio. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  // Update current prices for holdings
  const updateHoldingPrices = async (holdings) => {
    try {
      const holdingUpdates = await Promise.all(
        holdings.map(async (holding) => {
          try {
            const quoteData = await FinnhubService.getQuote(holding.symbol);
            return {
              symbol: holding.symbol,
              currentPrice: quoteData.c || holding.currentPrice
            };
          } catch (error) {
            console.error(`Error fetching price for ${holding.symbol}:`, error);
            return {
              symbol: holding.symbol,
              currentPrice: holding.currentPrice
            };
          }
        })
      );
      
      await demoTradingService.updateHoldings(holdingUpdates);
    } catch (error) {
      console.error('Error updating holding prices:', error);
    }
  };

  // Function to update chart data based on portfolio history
  const updateChartData = async () => {
    try {
      const portfolioData = await demoTradingService.getPortfolioHistory();
      
      if (!portfolioData || !portfolioData.history || portfolioData.history.length === 0) {
        // If no history, use default chart data
        return;
      }
      
      // Set performance data on the account if available
      if (portfolioData.performance && account) {
        const updatedAccount = {
          ...account,
          dayChange: portfolioData.performance.day.change,
          dayChangePercentage: portfolioData.performance.day.percentage,
          weekChange: portfolioData.performance.week.change,
          weekChangePercentage: portfolioData.performance.week.percentage,
          monthChange: portfolioData.performance.month.change,
          monthChangePercentage: portfolioData.performance.month.percentage,
          yearChange: portfolioData.performance.year.change,
          yearChangePercentage: portfolioData.performance.year.percentage,
          totalProfitLoss: portfolioData.performance.total.change,
          totalProfitLossPercentage: portfolioData.performance.total.percentage
        };
        setAccount(updatedAccount);
      }
      
      // Process history into chart data
      const chartPoints = processHistoryIntoChartData(portfolioData.history, chartPeriod);
      if (chartPoints) {
        setChartData(chartPoints);
      }
    } catch (error) {
      console.error('Error updating chart data:', error);
    }
  };
  
  // Load all data
  const loadData = async () => {
    try {
      const data = await demoTradingService.getAccount();
      console.log('Portfolio data fetched successfully');
      setAccount(data);
      
      // Generate chart data based on portfolio history
      await updateChartData();
      
      // Update holdings with current prices if we have holdings
      if (data?.holdings?.length > 0) {
        await updateHoldingPrices(data.holdings);
        // Get the updated account data after price updates
        const updatedData = await demoTradingService.getAccount();
        setAccount(updatedData);
      }
      
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error in loadData:', error);
      setError('Failed to load portfolio. Please try again.');
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Refresh data
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);
  
  // Initial data load
  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      if (isMounted) {
        await loadData();
      }
    };
    
    initialize();
    
    // Set up price refresh interval - update prices every 60 seconds
    const refreshInterval = setInterval(() => {
      if (account?.holdings?.length > 0) {
        loadData();
      }
    }, 60000);
    
    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
    };
  }, [chartPeriod]);
  
  // Process portfolio history into chart data based on selected period
  const processHistoryIntoChartData = (history, period) => {
    if (!history || history.length === 0) return null;
    
    // Sort history by date (oldest first)
    const sortedHistory = [...history].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    
    // Generate labels and values based on period
    let filteredHistory = sortedHistory;
    const now = new Date();
    
    // Filter history based on selected period
    switch (period) {
      case '1D':
        // Last 24 hours
        const oneDayAgo = new Date(now);
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        filteredHistory = sortedHistory.filter(
          h => new Date(h.date) >= oneDayAgo
        );
        break;
        
      case '1W':
        // Last 7 days
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        filteredHistory = sortedHistory.filter(
          h => new Date(h.date) >= oneWeekAgo
        );
        break;
        
      case '1M':
        // Last month
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        filteredHistory = sortedHistory.filter(
          h => new Date(h.date) >= oneMonthAgo
        );
        break;
        
      case '3M':
        // Last 3 months
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        filteredHistory = sortedHistory.filter(
          h => new Date(h.date) >= threeMonthsAgo
        );
        break;
        
      case '1Y':
        // Last year
        const oneYearAgo = new Date(now);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        filteredHistory = sortedHistory.filter(
          h => new Date(h.date) >= oneYearAgo
        );
        break;
        
      case 'ALL':
        // All history
        filteredHistory = sortedHistory;
        break;
    }
    
    // Ensure we have data
    if (filteredHistory.length === 0) {
      filteredHistory = [sortedHistory[sortedHistory.length - 1]];
    }
    
    // If we only have one point, add another point as a copy to show a line
    if (filteredHistory.length === 1) {
      const point = filteredHistory[0];
      const newPoint = { ...point };
      
      // Set the new point's date to slightly different time
      const newDate = new Date(point.date);
      newDate.setHours(newDate.getHours() - 1);
      newPoint.date = newDate;
      
      filteredHistory = [newPoint, point];
    }
    
    // Format labels based on period
    const formatLabel = (date) => {
      const d = new Date(date);
      
      switch (period) {
        case '1D':
          return d.getHours() + ':00';
        case '1W':
          return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
        case '1M':
        case '3M':
          return (d.getMonth() + 1) + '/' + d.getDate();
        case '1Y':
        case 'ALL':
          return (d.getMonth() + 1) + '/' + d.getFullYear().toString().substr(-2);
      }
    };
    
    // Generate chart data
    const labels = filteredHistory.map(h => formatLabel(h.date));
    const values = filteredHistory.map(h => h.equity || 0);
    
    return { labels, values };
  };
  
  // Navigate to Trade screen
  const handleTrade = () => {
    navigation.navigate('Trade', { accountBalance: account?.balance || 0 });
  };
  
  // Format a number as currency
  const formatCurrency = (value) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '$0.00';
    }
    return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <Header title="Portfolio" subtitle="Track your investments" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading portfolio data...</Text>
        </View>
      </View>
    );
  }
  
  // Calculate portfolio statistics
  const portfolioValue = account?.equity || 0;
  const totalInvested = account?.initialBalance || 0;
  const cashBalance = account?.balance || 0;
  const holdingsValue = portfolioValue - cashBalance;
  const totalGain = portfolioValue - totalInvested;
  const totalGainPercentage = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  const portfolioChange = account?.totalProfitLossPercentage || 0;
  const dayChange = account?.dayChange || 0;
  const dayChangePercentage = account?.dayChangePercentage || 0;

  return (
    <View style={styles.container}>
      <Header title="Portfolio" subtitle="Track your investments" />
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.portfolioSummary}>
          <Text style={styles.portfolioValue}>{formatCurrency(portfolioValue)}</Text>
          <View style={styles.changeContainer}>
            <Ionicons 
              name={portfolioChange >= 0 ? "arrow-up" : "arrow-down"} 
              size={16} 
              color={portfolioChange >= 0 ? Colors.positive : Colors.negative} 
            />
            <Text style={[
              styles.changeText, 
              { color: portfolioChange >= 0 ? Colors.positive : Colors.negative }
            ]}>
              {portfolioChange >= 0 ? '+' : ''}{portfolioChange.toFixed(2)}%
            </Text>
          </View>
          <View style={styles.dayChangeContainer}>
            <Text style={[
              styles.dayChangeText,
              { color: dayChange >= 0 ? Colors.positive : Colors.negative }
            ]}>
              Today: {dayChange >= 0 ? '+' : ''}{formatCurrency(Math.abs(dayChange))} ({dayChangePercentage >= 0 ? '+' : ''}{dayChangePercentage.toFixed(2)}%)
            </Text>
          </View>
        </View>
        
        <StockChart 
          data={chartData} 
          period={chartPeriod}
          onPeriodChange={setChartPeriod}
        />
        
        <View style={styles.balanceCards}>
          <View style={[styles.balanceCard, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.balanceTitle}>Cash Balance</Text>
            <Text style={styles.balanceValue}>{formatCurrency(cashBalance)}</Text>
            <Text style={styles.balanceSubtitle}>
              {portfolioValue > 0 ? ((cashBalance / portfolioValue) * 100).toFixed(1) : '0.0'}% of Portfolio
            </Text>
          </View>
          
          <View style={[styles.balanceCard, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.balanceTitle}>Holdings Value</Text>
            <Text style={styles.balanceValue}>{formatCurrency(holdingsValue)}</Text>
            <Text style={styles.balanceSubtitle}>
              {portfolioValue > 0 ? ((holdingsValue / portfolioValue) * 100).toFixed(1) : '0.0'}% of Portfolio
            </Text>
          </View>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Initial Balance</Text>
            <Text style={styles.statValue}>{formatCurrency(totalInvested)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Gain/Loss</Text>
            <View style={styles.gainContainer}>
            <Text style={[
              styles.statValue, 
              { color: totalGain >= 0 ? Colors.positive : Colors.negative }
            ]}>
                {totalGain >= 0 ? '+' : ''}{formatCurrency(Math.abs(totalGain))}
            </Text>
              <View style={[
                styles.percentContainer,
                { backgroundColor: totalGainPercentage >= 0 ? Colors.positive : Colors.negative }
              ]}>
                <Text style={styles.percentText}>
              {totalGainPercentage >= 0 ? '+' : ''}{totalGainPercentage.toFixed(2)}%
            </Text>
              </View>
            </View>
          </View>
        </View>
        
        <SectionHeader 
          title="Your Holdings" 
          actionText="See All"
          onActionPress={() => navigation.navigate('DemoTrading')}
        />
        
        {account?.holdings?.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>No holdings yet</Text>
            <Text style={styles.emptyStateSubtext}>Start trading to build your portfolio</Text>
            <TouchableOpacity style={styles.startTradingButton} onPress={handleTrade}>
              <Text style={styles.startTradingButtonText}>Start Trading</Text>
            </TouchableOpacity>
          </View>
        ) : (
          account?.holdings?.map((holding, index) => {
            const profitLoss = holding.currentValue - (holding.averageCost * holding.quantity);
            const profitLossPercentage = holding.profitPercentage || 
              ((holding.currentPrice - holding.averageCost) / holding.averageCost * 100);
            
            return (
          <View key={index} style={styles.portfolioStockContainer}>
            <StockCard
                  symbol={holding.symbol}
                  companyName={holding.companyName}
                  price={holding.currentPrice}
                  priceChange={profitLossPercentage}
                  onPress={() => navigation.navigate('StockDetail', { symbol: holding.symbol })}
            />
            <View style={styles.sharesContainer}>
                  <View style={styles.shareColumn}>
              <Text style={styles.sharesLabel}>Shares</Text>
                    <Text style={styles.sharesValue}>{holding.quantity}</Text>
                  </View>
                  <View style={styles.shareColumn}>
                    <Text style={styles.sharesLabel}>Avg. Cost</Text>
                    <Text style={styles.sharesValue}>{formatCurrency(holding.averageCost)}</Text>
                  </View>
                  <View style={styles.shareColumn}>
                    <Text style={styles.sharesLabel}>Value</Text>
                    <Text style={styles.sharesValue}>{formatCurrency(holding.currentValue)}</Text>
                  </View>
                  <View style={styles.shareColumn}>
                    <Text style={styles.sharesLabel}>P/L</Text>
                    <Text style={[
                      styles.sharesValue,
                      { color: profitLoss >= 0 ? Colors.positive : Colors.negative }
                    ]}>
                      {profitLoss >= 0 ? '+' : ''}{formatCurrency(profitLoss)}
                    </Text>
                  </View>
            </View>
          </View>
            );
          })
        )}
      </ScrollView>
      
      <TouchableOpacity style={styles.addButton} onPress={handleTrade}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: Colors.darkGray,
  },
  portfolioSummary: {
    marginTop: 20,
    alignItems: 'center',
  },
  portfolioValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  dayChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  dayChangeText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.darkGray,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  gainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentContainer: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  balanceCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  balanceCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  balanceTitle: {
    fontSize: 14,
    color: Colors.darkGray,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  balanceSubtitle: {
    fontSize: 12,
    color: Colors.darkGray,
  },
  portfolioStockContainer: {
    marginBottom: 8,
  },
  sharesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.primaryLight,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginTop: -8,
  },
  sharesLabel: {
    fontSize: 12,
    color: Colors.darkGray,
  },
  sharesValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondary,
  },
  shareColumn: {
    flex: 1,
    alignItems: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: Colors.white,
    borderRadius: 8,
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.secondary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.darkGray,
    marginTop: 8,
    textAlign: 'center',
  },
  startTradingButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  startTradingButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PortfolioScreen; 