import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Animated,
  Alert
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import Header from '../../components/Header';
import SectionHeader from '../../components/SectionHeader';
import Colors from '../../constants/colors';
import demoTradingService from '../../services/demoTradingService';

const DemoTradingScreen = ({ navigation }) => {
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('portfolio');
  
  // Animation values
  const balanceAnimation = new Animated.Value(0);
  const profitAnimation = new Animated.Value(0);
  
  // Fetch account data
  const fetchAccountData = useCallback(async (retryCount = 0) => {
    try {
      setError(null);
      const data = await demoTradingService.getAccount();
      console.log('Account data fetched successfully:', data);
      setAccount(data);
      
      // Reset animation values
      balanceAnimation.setValue(0);
      profitAnimation.setValue(0);
      
      // Animate values
      Animated.parallel([
        Animated.timing(balanceAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true
        }),
        Animated.timing(profitAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true
        })
      ]).start();
      
    } catch (error) {
      console.error('Error fetching account data:', error);
      
      // If we've retried less than 3 times, try again after a delay
      if (retryCount < 2) {
        console.log(`Retrying (${retryCount + 1}/2)...`);
        setTimeout(() => {
          fetchAccountData(retryCount + 1);
        }, 1500);
        return;
      }
      
      const errorMessage = error.message || 'Failed to load account data';
      setError(`${errorMessage}\nPlease try again or check your connection.`);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    fetchAccountData();
  }, [fetchAccountData]);
  
  // Initial data load
  useEffect(() => {
    fetchAccountData();
  }, [fetchAccountData]);
  
  // Reset trading account
  const handleResetAccount = () => {
    Alert.alert(
      'Reset Trading Account',
      'Are you sure you want to reset your demo trading account? This will remove all your positions and reset your balance to $100,000.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await demoTradingService.resetAccount();
              await fetchAccountData();
              Alert.alert('Success', 'Your trading account has been reset successfully.');
            } catch (error) {
              console.error('Error resetting account:', error);
              Alert.alert('Error', 'Failed to reset account. Please try again.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };
  
  // Navigate to trade screen
  const handleTrade = () => {
    navigation.navigate('Trade', { accountBalance: account?.balance || 0 });
  };
  
  // Format a number as currency
  const formatCurrency = (value) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  // Format percentage
  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };
  
  // Calculate animated values
  const balanceValue = account?.balance || 0;
  const profitValue = account?.totalProfitLoss || 0;
  
  // Render loading state
  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <Header
          title="Demo Trading"
          showBackButton
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your trading account...</Text>
        </View>
      </View>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <View style={styles.container}>
        <Header
          title="Demo Trading"
          showBackButton
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAccountData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // Render portfolio tab
  const renderPortfolio = () => (
    <View style={styles.tabContent}>
      {/* Account Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Cash Balance</Text>
            <Animated.Text 
              style={[
                styles.summaryValue,
                { opacity: balanceAnimation }
              ]}
            >
              {formatCurrency(balanceValue)}
            </Animated.Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Equity</Text>
            <Text style={styles.summaryValue}>{formatCurrency(account?.equity || 0)}</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total P/L</Text>
            <Animated.Text 
              style={[
                styles.summaryValue, 
                { 
                  color: profitValue >= 0 ? Colors.success : Colors.error,
                  opacity: profitAnimation 
                }
              ]}
            >
              {profitValue >= 0 ? '+' : ''}
              {formatCurrency(Math.abs(profitValue))}
            </Animated.Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Return</Text>
            <Text 
              style={[
                styles.summaryValue, 
                { color: (account?.totalProfitLossPercentage || 0) >= 0 ? Colors.success : Colors.error }
              ]}
            >
              {formatPercentage(account?.totalProfitLossPercentage || 0)}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleTrade}>
          <MaterialCommunityIcons name="swap-horizontal" size={22} color={Colors.white} />
          <Text style={styles.actionButtonText}>Trade</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: Colors.error }]} 
          onPress={handleResetAccount}
        >
          <Ionicons name="refresh" size={22} color={Colors.white} />
          <Text style={styles.actionButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>
      
      {/* Portfolio Holdings */}
      <SectionHeader title="Your Holdings" />
      
      {account?.holdings?.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <MaterialCommunityIcons name="chart-line" size={64} color={Colors.lightGray} />
          <Text style={styles.emptyStateText}>No holdings yet</Text>
          <Text style={styles.emptyStateSubtext}>Start trading to build your portfolio</Text>
          <TouchableOpacity style={styles.startTradingButton} onPress={handleTrade}>
            <Text style={styles.startTradingButtonText}>Start Trading</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {account?.holdings?.map((holding, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.holdingCard}
              onPress={() => navigation.navigate('StockDetail', { symbol: holding.symbol })}
            >
              <View style={styles.holdingHeader}>
                <View style={styles.holdingTitleContainer}>
                  <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                  <Text style={styles.holdingName}>{holding.companyName}</Text>
                </View>
                <View style={styles.holdingValueContainer}>
                  <Text style={styles.holdingPrice}>{formatCurrency(holding.currentPrice)}</Text>
                  <View style={[
                    styles.holdingChangeContainer,
                    { backgroundColor: holding.profitPercentage >= 0 ? Colors.success : Colors.error }
                  ]}>
                    <Ionicons 
                      name={holding.profitPercentage >= 0 ? 'arrow-up' : 'arrow-down'} 
                      size={12} 
                      color={Colors.white} 
                    />
                    <Text style={styles.holdingChangeText}>
                      {Math.abs(holding.profitPercentage).toFixed(2)}%
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.holdingDetails}>
                <View style={styles.holdingDetailItem}>
                  <Text style={styles.holdingDetailLabel}>Shares</Text>
                  <Text style={styles.holdingDetailValue}>{holding.quantity}</Text>
                </View>
                <View style={styles.holdingDetailItem}>
                  <Text style={styles.holdingDetailLabel}>Avg Price</Text>
                  <Text style={styles.holdingDetailValue}>{formatCurrency(holding.averagePrice)}</Text>
                </View>
                <View style={styles.holdingDetailItem}>
                  <Text style={styles.holdingDetailLabel}>Market Value</Text>
                  <Text style={styles.holdingDetailValue}>{formatCurrency(holding.currentValue)}</Text>
                </View>
                <View style={styles.holdingDetailItem}>
                  <Text style={styles.holdingDetailLabel}>P/L</Text>
                  <Text style={[
                    styles.holdingDetailValue,
                    { color: holding.profit >= 0 ? Colors.success : Colors.error }
                  ]}>
                    {holding.profit >= 0 ? '+' : ''}{formatCurrency(holding.profit)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
  
  // Render transactions tab
  const renderTransactions = () => (
    <View style={styles.tabContent}>
      {account?.transactions?.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <MaterialCommunityIcons name="history" size={64} color={Colors.lightGray} />
          <Text style={styles.emptyStateText}>No transactions yet</Text>
          <Text style={styles.emptyStateSubtext}>Your transaction history will appear here</Text>
          <TouchableOpacity style={styles.startTradingButton} onPress={handleTrade}>
            <Text style={styles.startTradingButtonText}>Start Trading</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {account?.transactions?.map((transaction, index) => (
            <View key={index} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <View style={styles.transactionType}>
                  <View style={[
                    styles.transactionTypeIndicator,
                    { backgroundColor: transaction.type === 'BUY' ? Colors.success : Colors.error }
                  ]} />
                  <Text style={styles.transactionTypeText}>
                    {transaction.type === 'BUY' ? 'Bought' : 'Sold'}
                  </Text>
                </View>
                <Text style={styles.transactionDate}>
                  {new Date(transaction.date).toLocaleDateString()} {new Date(transaction.date).toLocaleTimeString()}
                </Text>
              </View>
              
              <View style={styles.transactionDetails}>
                <View>
                  <Text style={styles.transactionSymbol}>{transaction.symbol}</Text>
                  <Text style={styles.transactionName}>{transaction.companyName}</Text>
                </View>
                <View style={styles.transactionValueContainer}>
                  <Text style={styles.transactionAmount}>
                    {transaction.type === 'BUY' ? '-' : '+'}{formatCurrency(Math.abs(transaction.totalAmount))}
                  </Text>
                  <Text style={styles.transactionShares}>
                    {transaction.quantity} shares at {formatCurrency(transaction.price)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
  
  return (
    <View style={styles.container}>
      <Header
        title="Demo Trading"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />
      
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'portfolio' && styles.activeTab]}
          onPress={() => setActiveTab('portfolio')}
        >
          <Text style={[styles.tabText, activeTab === 'portfolio' && styles.activeTabText]}>
            Portfolio
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>
            Transactions
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'portfolio' ? renderPortfolio() : renderTransactions()}
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
  errorContainer: {
    flex: 1,
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
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
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
    padding: 16,
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
    marginBottom: 14,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.darkGray,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 6,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
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
  holdingCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
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
    marginBottom: 12,
  },
  holdingTitleContainer: {
    flex: 1,
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
  holdingValueContainer: {
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
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  holdingDetailItem: {
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
  transactionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionTypeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  transactionTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.darkGray,
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  transactionName: {
    fontSize: 12,
    color: Colors.darkGray,
    marginTop: 2,
  },
  transactionValueContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary,
  },
  transactionShares: {
    fontSize: 12,
    color: Colors.darkGray,
    marginTop: 2,
  },
});

export default DemoTradingScreen; 