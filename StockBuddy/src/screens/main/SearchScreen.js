import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import Header from '../../components/Header';
import Colors from '../../constants/colors';
import FinnhubService from '../../services/FinnhubService';
import AlphaVantageService from '../../services/AlphaVantageService';

// Define exchange icons and colors for different exchanges
const EXCHANGE_INFO = {
  US: { 
    icon: 'flag-usa', 
    iconType: 'material-community', 
    color: '#3970BE', 
    textColor: '#FFFFFF',
    badgeColor: '#3970BE'
  },
  BSE: { 
    icon: 'flag-india', 
    iconType: 'material-community', 
    color: '#FF9933', 
    textColor: '#FFFFFF',
    badgeColor: '#FF9933' 
  },
  NSE: { 
    icon: 'flag-india', 
    iconType: 'material-community', 
    color: '#138808', 
    textColor: '#FFFFFF',
    badgeColor: '#138808' 
  },
  LSE: { 
    icon: 'flag-uk', 
    iconType: 'material-community', 
    color: '#00247D', 
    textColor: '#FFFFFF',
    badgeColor: '#00247D' 
  },
  TSE: { 
    icon: 'flag-canada', 
    iconType: 'material-community', 
    color: '#D80621', 
    textColor: '#FFFFFF',
    badgeColor: '#D80621' 
  },
  TSXV: { 
    icon: 'flag-canada', 
    iconType: 'material-community', 
    color: '#D80621', 
    textColor: '#FFFFFF',
    badgeColor: '#D80621' 
  },
  DEFAULT: { 
    icon: 'public', 
    iconType: 'material', 
    color: '#757575', 
    textColor: '#FFFFFF',
    badgeColor: '#757575' 
  }
};

// Function to get currency symbol
const getCurrencySymbol = (currency) => {
  switch (currency) {
    case 'USD': return '$';
    case 'INR': return '₹';
    case 'GBP': return '£';
    case 'EUR': return '€';
    case 'CAD': return 'C$';
    default: return '$';
  }
};

const SearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState(['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA']);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiProvider, setApiProvider] = useState('finnhub'); // 'finnhub' or 'alphavantage'

  // Search for stocks using the selected API
  const handleSearch = async (query) => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      let results;
      
      if (apiProvider === 'alphavantage') {
        // Use Alpha Vantage for Indian stocks (BSE)
        results = await AlphaVantageService.searchStocks(query);
        setSearchResults(AlphaVantageService.formatSearchResults(results));
      } else {
        // Use Finnhub for other stocks
        results = await FinnhubService.searchStocks(query);
        setSearchResults(FinnhubService.formatSearchResults(results));
      }
      
      // Add to recent searches if not already present
      if (!recentSearches.includes(query) && query.length > 1) {
        setRecentSearches(prev => [query, ...prev].slice(0, 5));
      }
    } catch (err) {
      setError('Failed to search stocks. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search to prevent too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.length > 1) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleStockSelect = (stock) => {
    // Pass the selected API provider to the detail screen
    navigation.navigate('StockDetail', { 
      symbol: stock.symbol,
      apiProvider: apiProvider 
    });
  };

  // Toggle between API providers
  const toggleApiProvider = () => {
    setApiProvider(prev => prev === 'finnhub' ? 'alphavantage' : 'finnhub');
    setSearchResults([]);
    setSearchQuery('');
  };

  const renderRecentSearch = ({ item }) => (
    <TouchableOpacity
      style={styles.recentSearchItem}
      onPress={() => {
        setSearchQuery(item);
        handleSearch(item);
      }}
    >
      <Ionicons name="time-outline" size={20} color={Colors.darkGray} />
      <Text style={styles.recentSearchText}>{item}</Text>
    </TouchableOpacity>
  );

  // Render search result items with proper handling for Alpha Vantage BSE stocks
  const renderSearchResult = ({ item }) => (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => handleStockSelect(item)}
    >
      <View style={styles.resultContent}>
        <View style={styles.symbolContainer}>
          <Text style={styles.symbolText}>{item.displaySymbol}</Text>
          <View style={[
            styles.exchangeBadge, 
            { backgroundColor: (EXCHANGE_INFO[item.exchange] || EXCHANGE_INFO.DEFAULT).badgeColor }
          ]}>
            <Text style={styles.exchangeText}>{item.exchange}</Text>
          </View>
        </View>
        <Text style={styles.descriptionText} numberOfLines={1}>{item.description}</Text>
        {apiProvider === 'alphavantage' && (
          <Text style={styles.regionText}>{item.region || 'India/BSE'}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.darkGray} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header 
        title="Search Stocks" 
        showBackButton={true}
        onSearchPress={null}
        onBackPress={() => navigation.goBack()}
      />

      {/* API Provider toggle */}
      <View style={styles.apiToggleContainer}>
        <TouchableOpacity
          style={[
            styles.apiToggleButton,
            apiProvider === 'finnhub' && styles.apiToggleButtonActive
          ]}
          onPress={() => setApiProvider('finnhub')}
        >
          <Text 
            style={[
              styles.apiToggleText,
              apiProvider === 'finnhub' && styles.apiToggleTextActive
            ]}
          >
            Finnhub
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.apiToggleButton,
            apiProvider === 'alphavantage' && styles.apiToggleButtonActive
          ]}
          onPress={() => setApiProvider('alphavantage')}
        >
          <Text 
            style={[
              styles.apiToggleText,
              apiProvider === 'alphavantage' && styles.apiToggleTextActive
            ]}
          >
            Alpha Vantage
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={Colors.darkGray} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={apiProvider === 'alphavantage' ? 
              "Search global stocks by name or symbol" : 
              "Search stocks, companies, or symbols"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={Colors.darkGray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.content}>
        {/* API provider info */}
        {!loading && !error && searchResults.length === 0 && searchQuery === '' && (
          <View style={styles.apiInfoContainer}>
            <Text style={styles.apiInfoTitle}>
              {apiProvider === 'alphavantage' ? 
                'Alpha Vantage API selected' : 
                'Finnhub API selected'}
            </Text>
            <Text style={styles.apiInfoDescription}>
              {apiProvider === 'alphavantage' ? 
                'Search for stocks from global exchanges including BSE, NSE, US, and more' : 
                'Showing global stocks from various exchanges'}
            </Text>
          </View>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
        
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.symbol}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            <FlatList
              data={recentSearches}
              renderItem={renderRecentSearch}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    padding: 15,
    paddingTop: 5,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.secondary,
  },
  clearButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.secondary,
    marginBottom: 15,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  recentSearchText: {
    fontSize: 16,
    color: Colors.secondary,
    marginLeft: 10,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  resultContent: {
    flex: 1,
  },
  symbolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  symbolText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary,
    marginRight: 8,
  },
  exchangeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  exchangeText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  regionText: {
    fontSize: 12,
    color: Colors.darkGray,
    marginLeft: 8,
  },
  apiToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
  },
  apiToggleButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: Colors.lightGray,
    marginHorizontal: 5,
  },
  apiToggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  apiToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.darkGray,
  },
  apiToggleTextActive: {
    color: Colors.white,
  },
  apiInfoContainer: {
    padding: 20,
    alignItems: 'center',
  },
  apiInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary,
    marginBottom: 5,
  },
  apiInfoDescription: {
    fontSize: 14,
    color: Colors.darkGray,
    textAlign: 'center',
  },
});

export default SearchScreen; 