import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../components/Header';
import SectionHeader from '../components/SectionHeader';
import Colors from '../constants/colors';
import demoTradingService from '../services/demoTradingService';

const PortfolioAnalysisScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch account data
  const fetchAccountData = useCallback(async () => {
    try {
      setError(null);
      const data = await demoTradingService.getAccount();
      console.log('Portfolio analysis data fetched successfully');
      setAccount(data);
      
      // Calculate sector allocations
      if (data?.holdings?.length > 0) {
        const enhancedData = await enhanceAccountData(data);
        setAccount(enhancedData);
      }
    } catch (error) {
      console.error('Error fetching portfolio analysis data:', error);
      setError('Failed to load portfolio analysis. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  // Format a number as currency
  const formatCurrency = (value) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '$0.00';
    }
    return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  // Calculate sector allocations
  const calculateSectorAllocations = (holdings) => {
    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      return [];
    }
    
    // Map symbols to sectors (in real app, this would come from API)
    const sectorMap = {
      'AAPL': 'Technology',
      'MSFT': 'Technology',
      'GOOGL': 'Technology',
      'AMZN': 'Consumer',
      'TSLA': 'Automotive',
      'META': 'Technology',
      'NFLX': 'Entertainment',
      'NVDA': 'Technology',
      'JPM': 'Finance',
      'BAC': 'Finance',
      'JNJ': 'Healthcare',
      'PFE': 'Healthcare',
      'XOM': 'Energy',
      'CVX': 'Energy',
      'WMT': 'Retail',
      'TGT': 'Retail',
    };
    
    // Group holdings by sector
    const sectorValues = {};
    let totalValue = 0;
    
    holdings.forEach(holding => {
      if (!holding.currentValue) return;
      
      const sector = sectorMap[holding.symbol] || 'Other';
      sectorValues[sector] = (sectorValues[sector] || 0) + holding.currentValue;
      totalValue += holding.currentValue;
    });
    
    // Convert to array format with percentages
    const allocation = Object.entries(sectorValues).map(([category, value]) => {
      const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
      return {
        category,
        percentage: Math.round(percentage),
        value
      };
    });
    
    // Sort by percentage (descending)
    return allocation.sort((a, b) => b.percentage - a.percentage);
  };
  
  // Enhance account data with sector allocations
  const enhanceAccountData = async (accountData) => {
    try {
      // Get portfolio history to calculate performance periods
      const portfolioData = await demoTradingService.getPortfolioHistory();
      
      // Calculate sector allocations
      const sectors = calculateSectorAllocations(accountData?.holdings || []);
      
      // Use performance data from the API response
      const performance = portfolioData.performance || {
        day: { change: 0, percentage: 0 },
        week: { change: 0, percentage: 0 },
        month: { change: 0, percentage: 0 },
        year: { change: 0, percentage: 0 },
        total: { change: 0, percentage: 0 }
      };
      
      return {
        ...accountData,
        allocation: sectors,
    performance: {
          day: performance.day.percentage,
          week: performance.week.percentage,
          month: performance.month.percentage,
          year: performance.year.percentage
        },
        // Add daily change if not already present
        dayChange: performance.day.change || accountData.dayChange || 0,
        dayChangePercentage: performance.day.percentage || accountData.dayChangePercentage || 0,
        weekChange: performance.week.change || 0,
        weekChangePercentage: performance.week.percentage || 0,
        monthChange: performance.month.change || 0,
        monthChangePercentage: performance.month.percentage || 0,
        yearChange: performance.year.change || 0,
        yearChangePercentage: performance.year.percentage || 0,
        totalProfitLoss: performance.total.change || accountData.totalProfitLoss || 0,
        totalProfitLossPercentage: performance.total.percentage || accountData.totalProfitLossPercentage || 0
      };
    } catch (error) {
      console.error('Error enhancing account data:', error);
      return {
        ...accountData,
        allocation: [],
        performance: { day: 0, week: 0, month: 0, year: 0 },
        dayChange: accountData.dayChange || 0,
        dayChangePercentage: accountData.dayChangePercentage || 0
      };
    }
  };
  
  // Check if a value is valid
  const isValidNumber = (value) => {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  };
  
  // Safely get performance value
  const safePerformanceValue = (value) => {
    return isValidNumber(value) ? value : 0;
  };
  
  // Calculate performance periods
  const calculatePerformancePeriods = (history) => {
    if (!history || history.length === 0) {
      return {
        day: 0,
        week: 0,
        month: 0,
        year: 0,
      };
    }
    
    // Get latest equity value
    const latestEquity = history[history.length - 1].equity;
    
    // Find equity values for different time periods
    const now = new Date();
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    // Find closest entries for each period
    const dayEntry = findClosestEntry(history, oneDayAgo);
    const weekEntry = findClosestEntry(history, oneWeekAgo);
    const monthEntry = findClosestEntry(history, oneMonthAgo);
    const yearEntry = findClosestEntry(history, oneYearAgo);
    
    // Calculate performance percentages
    return {
      day: calculatePercentageChange(dayEntry?.equity, latestEquity),
      week: calculatePercentageChange(weekEntry?.equity, latestEquity),
      month: calculatePercentageChange(monthEntry?.equity, latestEquity),
      year: calculatePercentageChange(yearEntry?.equity, latestEquity),
    };
  };
  
  // Find closest entry to target date
  const findClosestEntry = (history, targetDate) => {
    if (!history || history.length === 0) return null;
    
    const targetTime = targetDate.getTime();
    let closestEntry = history[0];
    let minDiff = Math.abs(new Date(history[0].date).getTime() - targetTime);
    
    for (let i = 1; i < history.length; i++) {
      const entryTime = new Date(history[i].date).getTime();
      const diff = Math.abs(entryTime - targetTime);
      
      if (diff < minDiff) {
        minDiff = diff;
        closestEntry = history[i];
      }
    }
    
    return closestEntry;
  };
  
  // Calculate percentage change
  const calculatePercentageChange = (oldValue, newValue) => {
    if (!oldValue || !newValue) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
  };
  
  // Refresh data
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);
  
  // Initial data load
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        if (!isMounted) return;
        
        setError(null);
        const data = await demoTradingService.getAccount();
        
        if (!isMounted) return;
        console.log('Portfolio analysis data fetched successfully');
        
        if (data?.holdings?.length > 0 && isMounted) {
          // Enhance the data with allocation and performance metrics
          const enhancedData = await enhanceAccountData(data);
          if (isMounted) {
            setAccount(enhancedData);
          }
        } else if (isMounted) {
          setAccount(data);
        }
      } catch (error) {
        console.error('Error in loadData:', error);
        if (isMounted) {
          setError('Failed to load portfolio analysis. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    
    loadData();
    
    // Set up refresh interval - update data every 5 minutes
    const refreshInterval = setInterval(() => {
      if (isMounted) {
        loadData();
      }
    }, 300000); // 5 minutes
    
    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
    };
  }, []);

  // Render portfolio overview tab
  const renderOverview = () => {
    // Calculate summary statistics
    const portfolioValue = account?.equity || 0;
    const cashBalance = account?.balance || 0;
    const holdingsValue = portfolioValue - cashBalance;
    const dayChange = account?.dayChange || 0;
    const dayChangePercentage = account?.dayChangePercentage || 0;
    const initialInvestment = account?.initialBalance || 10000;
    const totalReturn = portfolioValue - initialInvestment;
    const totalReturnPercentage = initialInvestment > 0 ? (totalReturn / initialInvestment) * 100 : 0;
    
    return (
    <View style={styles.tabContent}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Portfolio Value</Text>
            <Text style={styles.summaryValue}>{formatCurrency(portfolioValue)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Day Change</Text>
          <View style={styles.changeContainer}>
              <Text style={[styles.changeValue, { 
                color: (dayChange || 0) >= 0 ? Colors.success : Colors.error 
              }]}>
                {formatCurrency(Math.abs(dayChange || 0))}
            </Text>
            <View style={[styles.changePercentContainer, { 
                backgroundColor: (dayChange || 0) >= 0 ? Colors.success : Colors.error 
            }]}>
              <Ionicons 
                  name={(dayChange || 0) >= 0 ? 'arrow-up' : 'arrow-down'} 
                size={12} 
                color={Colors.white} 
              />
              <Text style={styles.changePercentText}>
                  {Math.abs(dayChangePercentage || 0).toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.portfolioComposition}>
            <View style={styles.compositionItem}>
              <Text style={styles.compositionLabel}>Cash</Text>
              <Text style={styles.compositionValue}>{formatCurrency(cashBalance)}</Text>
              <Text style={styles.compositionPercentage}>
                {portfolioValue > 0 ? ((cashBalance / portfolioValue) * 100).toFixed(1) : '0.0'}%
              </Text>
            </View>
            <View style={styles.compositionDivider} />
            <View style={styles.compositionItem}>
              <Text style={styles.compositionLabel}>Holdings</Text>
              <Text style={styles.compositionValue}>{formatCurrency(holdingsValue)}</Text>
              <Text style={styles.compositionPercentage}>
                {portfolioValue > 0 ? ((holdingsValue / portfolioValue) * 100).toFixed(1) : '0.0'}%
              </Text>
            </View>
          </View>
          <View style={styles.totalReturnContainer}>
            <Text style={styles.totalReturnLabel}>Total Return</Text>
            <View style={styles.totalReturnRow}>
              <Text style={[
                styles.totalReturnValue,
                { color: totalReturn >= 0 ? Colors.success : Colors.error }
              ]}>
                {totalReturn >= 0 ? '+' : ''}{formatCurrency(totalReturn)}
              </Text>
              <View style={[
                styles.totalReturnPercentContainer,
                { backgroundColor: totalReturn >= 0 ? Colors.success : Colors.error }
              ]}>
                <Ionicons 
                  name={totalReturn >= 0 ? 'arrow-up' : 'arrow-down'} 
                  size={12} 
                  color={Colors.white} 
                />
                <Text style={styles.totalReturnPercentText}>
                  {Math.abs(totalReturnPercentage).toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>
      </View>

      <SectionHeader title="Performance" />
      <View style={styles.performanceCard}>
        <View style={styles.performanceRow}>
          <Text style={styles.performanceLabel}>Today</Text>
          <Text style={[styles.performanceValue, { 
              color: safePerformanceValue(account?.performance?.day) >= 0 ? Colors.success : Colors.error 
          }]}>
              {safePerformanceValue(account?.performance?.day) >= 0 ? '+' : ''}
              {safePerformanceValue(account?.performance?.day).toFixed(2)}%
          </Text>
        </View>
        <View style={styles.performanceRow}>
          <Text style={styles.performanceLabel}>This Week</Text>
          <Text style={[styles.performanceValue, { 
              color: safePerformanceValue(account?.performance?.week) >= 0 ? Colors.success : Colors.error 
          }]}>
              {safePerformanceValue(account?.performance?.week) >= 0 ? '+' : ''}
              {safePerformanceValue(account?.performance?.week).toFixed(2)}%
          </Text>
        </View>
        <View style={styles.performanceRow}>
          <Text style={styles.performanceLabel}>This Month</Text>
          <Text style={[styles.performanceValue, { 
              color: safePerformanceValue(account?.performance?.month) >= 0 ? Colors.success : Colors.error 
          }]}>
              {safePerformanceValue(account?.performance?.month) >= 0 ? '+' : ''}
              {safePerformanceValue(account?.performance?.month).toFixed(2)}%
          </Text>
        </View>
        <View style={styles.performanceRow}>
          <Text style={styles.performanceLabel}>This Year</Text>
          <Text style={[styles.performanceValue, { 
              color: safePerformanceValue(account?.performance?.year) >= 0 ? Colors.success : Colors.error 
          }]}>
              {safePerformanceValue(account?.performance?.year) >= 0 ? '+' : ''}
              {safePerformanceValue(account?.performance?.year).toFixed(2)}%
          </Text>
        </View>
      </View>

      <SectionHeader title="Asset Allocation" />
        {!account?.allocation || account.allocation.length === 0 ? (
          <View style={styles.emptyAllocationCard}>
            <Text style={styles.emptyStateText}>No holdings to analyze</Text>
            <Text style={styles.emptyStateSubtext}>Start trading to see your asset allocation</Text>
          </View>
        ) : (
      <View style={styles.allocationCard}>
            {account.allocation.map((item, index) => (
          <View key={index} style={styles.allocationRow}>
            <View style={styles.allocationLabelContainer}>
              <View style={[styles.allocationDot, { backgroundColor: getColorForIndex(index) }]} />
              <Text style={styles.allocationLabel}>{item.category}</Text>
            </View>
            <View style={styles.allocationValueContainer}>
              <Text style={styles.allocationPercentage}>{item.percentage}%</Text>
                  <Text style={styles.allocationValue}>{formatCurrency(item.value)}</Text>
            </View>
          </View>
        ))}
      </View>
        )}

        <TouchableOpacity style={styles.analysisButton} onPress={() => setActiveTab('holdings')}>
          <Text style={styles.analysisButtonText}>View Holdings Details</Text>
      </TouchableOpacity>
    </View>
  );
  };

  // Render holdings tab
  const renderHoldings = () => (
    <View style={styles.tabContent}>
      {!account?.holdings || account.holdings.length === 0 ? (
        <View style={styles.emptyHoldingsContainer}>
          <Text style={styles.emptyStateText}>No holdings yet</Text>
          <Text style={styles.emptyStateSubtext}>Start trading to see your holdings analysis</Text>
          <TouchableOpacity 
            style={styles.startTradingButton} 
            onPress={() => navigation.navigate('Trade')}
          >
            <Text style={styles.startTradingButtonText}>Start Trading</Text>
          </TouchableOpacity>
        </View>
      ) : (
        account.holdings.map((holding, index) => {
          // Calculate profit/loss
          const profitLoss = holding.currentValue - (holding.averageCost * holding.quantity);
          const profitLossPercentage = holding.profitPercentage || 
            ((holding.currentPrice - holding.averageCost) / holding.averageCost * 100);
          
          return (
            <TouchableOpacity 
              key={index} 
              style={styles.holdingCard}
              onPress={() => navigation.navigate('StockDetail', { symbol: holding.symbol })}
            >
          <View style={styles.holdingHeader}>
            <View>
                  <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                  <Text style={styles.holdingName}>{holding.companyName}</Text>
            </View>
            <View style={styles.holdingValue}>
                  <Text style={styles.holdingPrice}>{formatCurrency(holding.currentPrice)}</Text>
              <View style={[styles.holdingChangeContainer, { 
                    backgroundColor: profitLossPercentage >= 0 ? Colors.success : Colors.error 
              }]}>
                <Ionicons 
                      name={profitLossPercentage >= 0 ? 'arrow-up' : 'arrow-down'} 
                  size={12} 
                  color={Colors.white} 
                />
                <Text style={styles.holdingChangeText}>
                      {Math.abs(profitLossPercentage).toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.holdingDetails}>
            <View style={styles.holdingDetail}>
              <Text style={styles.holdingDetailLabel}>Shares</Text>
                  <Text style={styles.holdingDetailValue}>{holding.quantity}</Text>
            </View>
            <View style={styles.holdingDetail}>
              <Text style={styles.holdingDetailLabel}>Avg Price</Text>
                  <Text style={styles.holdingDetailValue}>{formatCurrency(holding.averageCost)}</Text>
            </View>
            <View style={styles.holdingDetail}>
              <Text style={styles.holdingDetailLabel}>Value</Text>
                  <Text style={styles.holdingDetailValue}>{formatCurrency(holding.currentValue)}</Text>
                </View>
              </View>
              <View style={styles.profitLossContainer}>
                <Text style={styles.profitLossLabel}>Total Profit/Loss</Text>
                <View style={styles.profitLossValueContainer}>
                  <Text style={[
                    styles.profitLossValue, 
                    { color: profitLoss >= 0 ? Colors.success : Colors.error }
                  ]}>
                    {profitLoss >= 0 ? '+' : ''}{formatCurrency(profitLoss)}
                  </Text>
                  <View style={[
                    styles.profitLossPercentContainer,
                    { backgroundColor: profitLoss >= 0 ? Colors.success : Colors.error }
                  ]}>
                    <Text style={styles.profitLossPercentText}>
                      {profitLossPercentage >= 0 ? '+' : ''}{Math.abs(profitLossPercentage).toFixed(2)}%
                    </Text>
                  </View>
            </View>
          </View>
        </TouchableOpacity>
          );
        })
      )}
    </View>
  );

  // Helper function to get color for allocation chart
  const getColorForIndex = (index) => {
    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
    return colors[index % colors.length];
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <Header
          title="Portfolio Analysis"
          showBackButton
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading analysis data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Portfolio Analysis"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />
      
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'holdings' && styles.activeTab]}
          onPress={() => setActiveTab('holdings')}
        >
          <Text style={[styles.tabText, activeTab === 'holdings' && styles.activeTabText]}>Holdings</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'overview' ? renderOverview() : renderHoldings()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: Colors.darkGray,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: Colors.darkGray,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  tabContent: {
    paddingBottom: 20,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 15,
    marginVertical: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeValue: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  changePercentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  changePercentText: {
    fontSize: 12,
    color: Colors.white,
    marginLeft: 2,
  },
  performanceCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 15,
    marginVertical: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  performanceLabel: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  performanceValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  allocationCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 15,
    marginVertical: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyAllocationCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 25,
    marginVertical: 10,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.darkGray,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyHoldingsContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 30,
    marginVertical: 10,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  allocationLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  allocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  allocationLabel: {
    fontSize: 14,
    color: Colors.secondary,
  },
  allocationValueContainer: {
    alignItems: 'flex-end',
  },
  allocationPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },
  allocationValue: {
    fontSize: 12,
    color: Colors.darkGray,
    marginTop: 2,
  },
  analysisButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginVertical: 20,
  },
  analysisButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  holdingCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 15,
    marginVertical: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  holdingSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  holdingName: {
    fontSize: 12,
    color: Colors.darkGray,
    marginTop: 2,
  },
  holdingValue: {
    alignItems: 'flex-end',
  },
  holdingPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary,
  },
  holdingChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  holdingChangeText: {
    fontSize: 10,
    color: Colors.white,
    marginLeft: 2,
  },
  holdingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  holdingDetail: {
    alignItems: 'center',
  },
  holdingDetailLabel: {
    fontSize: 12,
    color: Colors.darkGray,
  },
  holdingDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
    marginTop: 3,
  },
  portfolioComposition: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  compositionItem: {
    alignItems: 'center',
  },
  compositionLabel: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  compositionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  compositionPercentage: {
    fontSize: 12,
    color: Colors.darkGray,
  },
  compositionDivider: {
    width: 1,
    height: '100%',
    backgroundColor: Colors.lightGray,
  },
  totalReturnContainer: {
    marginBottom: 10,
  },
  totalReturnLabel: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  totalReturnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalReturnValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  totalReturnPercentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  totalReturnPercentText: {
    fontSize: 12,
    color: Colors.white,
    marginLeft: 2,
  },
  profitLossContainer: {
    marginBottom: 10,
  },
  profitLossLabel: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  profitLossValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profitLossValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  profitLossPercentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  profitLossPercentText: {
    fontSize: 12,
    color: Colors.white,
    marginLeft: 2,
  },
});

export default PortfolioAnalysisScreen; 