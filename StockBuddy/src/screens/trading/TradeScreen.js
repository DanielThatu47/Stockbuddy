import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../../components/Header';
import Colors from '../../constants/colors';
import demoTradingService from '../../services/demoTradingService';
import FinnhubService from '../../services/FinnhubService';

const TradeScreen = ({ route, navigation }) => {
  const { symbol, companyName, accountBalance } = route.params || {};
  
  const [selectedStock, setSelectedStock] = useState({
    symbol: symbol || '',
    companyName: companyName || '',
    price: 0,
    change: 0,
    changePercent: 0
  });
  const [tradeType, setTradeType] = useState('BUY');
  const [quantity, setQuantity] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchVisible, setSearchVisible] = useState(!symbol);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [balance, setBalance] = useState(accountBalance || 0);
  
  // Animation values
  const fadeAnim = new Animated.Value(1);
  const slideAnim = new Animated.Value(0);
  
  // Fetch stock data if symbol is provided
  useEffect(() => {
    if (selectedStock.symbol) {
      fetchStockData(selectedStock.symbol);
    }
  }, [selectedStock.symbol]);
  
  // Fetch stock data
  const fetchStockData = async (stockSymbol) => {
    try {
      setLoading(true);
      const quoteData = await FinnhubService.getQuote(stockSymbol);
      const profileData = await FinnhubService.getCompanyProfile(stockSymbol);
      
      setSelectedStock({
        symbol: stockSymbol,
        companyName: profileData?.name || stockSymbol,
        price: quoteData?.c || 0,
        change: quoteData?.d || 0,
        changePercent: quoteData?.dp || 0
      });
      
      // Calculate estimated cost
      if (quantity) {
        setEstimatedCost(parseFloat(quantity) * (quoteData?.c || 0));
      }
    } catch (error) {
      console.error('Error fetching stock data:', error);
      Alert.alert('Error', 'Failed to fetch stock data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle quantity change
  const handleQuantityChange = (value) => {
    // Allow only numeric input
    if (/^\d*$/.test(value)) {
      setQuantity(value);
      
      // Calculate estimated cost
      if (value) {
        setEstimatedCost(parseFloat(value) * selectedStock.price);
      } else {
        setEstimatedCost(0);
      }
    }
  };
  
  // Handle trade type toggle
  const handleTradeTypeToggle = (type) => {
    // Animate the transition
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true
      })
    ]).start();
    
    setTradeType(type);
  };
  
  // Handle search
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      setSearching(true);
      const results = await FinnhubService.searchSymbols(searchTerm);
      setSearchResults(results.slice(0, 10)); // Limit to 10 results
    } catch (error) {
      console.error('Error searching stocks:', error);
      Alert.alert('Error', 'Failed to search stocks. Please try again.');
    } finally {
      setSearching(false);
    }
  };
  
  // Select a stock from search results
  const handleSelectStock = (stock) => {
    // Animate selection
    Animated.timing(slideAnim, {
      toValue: 100,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      setSelectedStock({
        symbol: stock.symbol,
        companyName: stock.description,
        price: 0,
        change: 0,
        changePercent: 0
      });
      setSearchVisible(false);
      slideAnim.setValue(0);
    });
  };
  
  // Execute trade
  const handleExecuteTrade = async () => {
    // Validate inputs
    if (!selectedStock.symbol) {
      Alert.alert('Error', 'Please select a stock to trade.');
      return;
    }
    
    if (!quantity || parseInt(quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity.');
      return;
    }
    
    // Confirm trade
    Alert.alert(
      `Confirm ${tradeType}`,
      `Are you sure you want to ${tradeType === 'BUY' ? 'buy' : 'sell'} ${quantity} shares of ${selectedStock.symbol} at $${selectedStock.price.toFixed(2)} per share?\n\nTotal: $${estimatedCost.toFixed(2)}`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setLoading(true);
              
              const tradeData = {
                symbol: selectedStock.symbol,
                companyName: selectedStock.companyName,
                type: tradeType,
                quantity: parseInt(quantity),
                price: selectedStock.price
              };
              
              const result = await demoTradingService.executeTrade(tradeData);
              
              // Update balance
              setBalance(result.balance);
              
              // Reset form
              setQuantity('');
              setEstimatedCost(0);
              
              // Show success message
              Alert.alert(
                'Trade Executed',
                `Successfully ${tradeType === 'BUY' ? 'bought' : 'sold'} ${quantity} shares of ${selectedStock.symbol}.`,
                [
                  {
                    text: 'View Portfolio',
                    onPress: () => navigation.navigate('DemoTrading')
                  },
                  {
                    text: 'Make Another Trade',
                    style: 'cancel'
                  }
                ]
              );
            } catch (error) {
              console.error('Error executing trade:', error);
              
              // Show appropriate error message
              if (error.message.includes('Insufficient funds')) {
                Alert.alert('Error', 'You do not have enough funds to complete this purchase.');
              } else if (error.message.includes('Insufficient shares')) {
                Alert.alert('Error', 'You do not have enough shares to sell.');
              } else if (error.message.includes('You do not own this stock')) {
                Alert.alert('Error', 'You do not own any shares of this stock.');
              } else {
                Alert.alert('Error', 'Failed to execute trade. Please try again.');
              }
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  
  // Render search section
  const renderSearchSection = () => (
    <View style={styles.searchSection}>
      <Text style={styles.sectionTitle}>Select a Stock</Text>
      
      <View style={styles.searchInputContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by symbol or company name"
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={handleSearch}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Ionicons name="search" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
      
      {searching ? (
        <ActivityIndicator style={styles.searchingIndicator} color={Colors.primary} />
      ) : (
        searchResults.length > 0 && (
          <ScrollView style={styles.searchResultsContainer}>
            {searchResults.map((result, index) => (
              <Animated.View 
                key={index}
                style={[
                  styles.searchResultItem,
                  { transform: [{ translateY: slideAnim }] }
                ]}
              >
                <TouchableOpacity
                  style={styles.searchResultButton}
                  onPress={() => handleSelectStock(result)}
                >
                  <Text style={styles.searchResultSymbol}>{result.symbol}</Text>
                  <Text style={styles.searchResultName} numberOfLines={1}>
                    {result.description}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>
        )
      )}
    </View>
  );
  
  // Render trade form
  const renderTradeForm = () => (
    <Animated.View 
      style={[
        styles.tradeFormContainer,
        { opacity: fadeAnim }
      ]}
    >
      <View style={styles.stockInfoContainer}>
        <View style={styles.stockInfo}>
          <Text style={styles.stockSymbol}>{selectedStock.symbol}</Text>
          <Text style={styles.stockName}>{selectedStock.companyName}</Text>
        </View>
        
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <View style={styles.stockPrice}>
            <Text style={styles.priceValue}>${selectedStock.price.toFixed(2)}</Text>
            <View style={[
              styles.changeContainer,
              { backgroundColor: selectedStock.change >= 0 ? Colors.success : Colors.error }
            ]}>
              <Ionicons 
                name={selectedStock.change >= 0 ? 'arrow-up' : 'arrow-down'} 
                size={12} 
                color={Colors.white} 
              />
              <Text style={styles.changeText}>
                {Math.abs(selectedStock.changePercent).toFixed(2)}%
              </Text>
            </View>
          </View>
        )}
      </View>
      
      <View style={styles.tradeTypeContainer}>
        <TouchableOpacity 
          style={[
            styles.tradeTypeButton, 
            tradeType === 'BUY' && styles.activeTradeTypeButton
          ]}
          onPress={() => handleTradeTypeToggle('BUY')}
        >
          <Text style={[
            styles.tradeTypeText,
            tradeType === 'BUY' && styles.activeTradeTypeText
          ]}>
            BUY
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tradeTypeButton, 
            tradeType === 'SELL' && styles.activeTradeTypeButton
          ]}
          onPress={() => handleTradeTypeToggle('SELL')}
        >
          <Text style={[
            styles.tradeTypeText,
            tradeType === 'SELL' && styles.activeTradeTypeText
          ]}>
            SELL
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Available Balance:</Text>
        <Text style={styles.balanceValue}>
          ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Quantity</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter number of shares"
          value={quantity}
          onChangeText={handleQuantityChange}
          keyboardType="numeric"
        />
      </View>
      
      <View style={styles.costContainer}>
        <Text style={styles.costLabel}>Estimated {tradeType === 'BUY' ? 'Cost' : 'Proceeds'}</Text>
        <Text style={styles.costValue}>
          ${estimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={[
          styles.executeButton,
          tradeType === 'SELL' && styles.sellButton,
          (!selectedStock.symbol || !quantity) && styles.disabledButton
        ]}
        onPress={handleExecuteTrade}
        disabled={!selectedStock.symbol || !quantity}
      >
        <Text style={styles.executeButtonText}>
          {tradeType === 'BUY' ? 'Buy' : 'Sell'} {selectedStock.symbol}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.changeStockButton}
        onPress={() => setSearchVisible(true)}
      >
        <Text style={styles.changeStockButtonText}>Change Stock</Text>
      </TouchableOpacity>
    </Animated.View>
  );
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <Header
        title={`${searchVisible ? 'Select Stock' : 'Trade'}`}
        showBackButton
        onBackPress={() => navigation.goBack()}
      />
      
      <ScrollView style={styles.content}>
        {searchVisible ? renderSearchSection() : renderTradeForm()}
      </ScrollView>
    </KeyboardAvoidingView>
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
  searchSection: {
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.secondary,
    marginBottom: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  searchButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 12,
    marginLeft: 10,
  },
  searchingIndicator: {
    marginVertical: 20,
  },
  searchResultsContainer: {
    maxHeight: 300,
    marginTop: 10,
  },
  searchResultItem: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  searchResultButton: {
    padding: 15,
  },
  searchResultSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  searchResultName: {
    fontSize: 14,
    color: Colors.darkGray,
    marginTop: 2,
  },
  tradeFormContainer: {
    marginVertical: 15,
  },
  stockInfoContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stockInfo: {
    flex: 1,
  },
  stockSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  stockName: {
    fontSize: 14,
    color: Colors.darkGray,
    marginTop: 2,
  },
  stockPrice: {
    alignItems: 'flex-end',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  changeText: {
    fontSize: 10,
    color: Colors.white,
    marginLeft: 2,
  },
  tradeTypeContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.lightBackground,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 15,
  },
  tradeTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTradeTypeButton: {
    backgroundColor: Colors.primary,
  },
  tradeTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkGray,
  },
  activeTradeTypeText: {
    color: Colors.white,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.darkGray,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  costContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  costLabel: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  costValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  executeButton: {
    backgroundColor: Colors.success,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 15,
  },
  sellButton: {
    backgroundColor: Colors.error,
  },
  disabledButton: {
    opacity: 0.6,
  },
  executeButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  changeStockButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  changeStockButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TradeScreen; 