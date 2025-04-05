import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import Header from '../components/Header';
import SectionHeader from '../components/SectionHeader';
import Colors from '../constants/colors';

const MarketScannerScreen = ({ navigation }) => {
  const [selectedScan, setSelectedScan] = useState('gainers');
  const [searchText, setSearchText] = useState('');

  // Mock data for predefined scans
  const scannerData = {
    gainers: [
      { symbol: 'AAPL', name: 'Apple Inc.', change: 5.25, price: 175.50, volume: '12.3M', signal: 'Buy' },
      { symbol: 'MSFT', name: 'Microsoft Corp', change: 3.8, price: 280.33, volume: '8.7M', signal: 'Strong Buy' },
      { symbol: 'AMZN', name: 'Amazon.com Inc', change: 2.4, price: 3470.25, volume: '4.2M', signal: 'Buy' },
      { symbol: 'GOOGL', name: 'Alphabet Inc', change: 1.9, price: 2800.75, volume: '2.1M', signal: 'Hold' },
    ],
    losers: [
      { symbol: 'NFLX', name: 'Netflix Inc', change: -4.2, price: 540.25, volume: '5.6M', signal: 'Sell' },
      { symbol: 'FB', name: 'Meta Platforms', change: -3.1, price: 335.80, volume: '7.8M', signal: 'Hold' },
      { symbol: 'TSLA', name: 'Tesla Inc', change: -1.8, price: 750.25, volume: '9.3M', signal: 'Hold' },
      { symbol: 'DIS', name: 'Walt Disney Co', change: -1.5, price: 178.45, volume: '3.5M', signal: 'Buy' },
    ],
    volume: [
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF', change: 0.8, price: 443.80, volume: '85.7M', signal: 'Hold' },
      { symbol: 'AAPL', name: 'Apple Inc.', change: 5.25, price: 175.50, volume: '65.3M', signal: 'Buy' },
      { symbol: 'TSLA', name: 'Tesla Inc', change: -1.8, price: 750.25, volume: '42.5M', signal: 'Hold' },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust', change: 1.2, price: 368.90, volume: '35.8M', signal: 'Buy' },
    ],
    oversold: [
      { symbol: 'PYPL', name: 'PayPal Holdings', change: -2.5, price: 270.15, volume: '6.8M', signal: 'Strong Buy' },
      { symbol: 'ROKU', name: 'Roku Inc', change: -5.3, price: 340.70, volume: '4.2M', signal: 'Buy' },
      { symbol: 'PINS', name: 'Pinterest Inc', change: -4.8, price: 55.25, volume: '3.7M', signal: 'Buy' },
      { symbol: 'ETSY', name: 'Etsy Inc', change: -3.2, price: 210.50, volume: '2.9M', signal: 'Buy' },
    ],
    overbought: [
      { symbol: 'NVDA', name: 'NVIDIA Corporation', change: 8.5, price: 220.75, volume: '15.2M', signal: 'Sell' },
      { symbol: 'AMD', name: 'Advanced Micro Devices', change: 6.2, price: 105.80, volume: '12.7M', signal: 'Hold' },
      { symbol: 'CRM', name: 'Salesforce Inc', change: 4.7, price: 260.35, volume: '5.1M', signal: 'Hold' },
      { symbol: 'SHOP', name: 'Shopify Inc', change: 7.3, price: 1475.20, volume: '3.8M', signal: 'Sell' },
    ],
    earnings: [
      { symbol: 'JPM', name: 'JPMorgan Chase', change: 2.1, price: 160.40, volume: '8.3M', signal: 'Buy', date: 'Tomorrow' },
      { symbol: 'WFC', name: 'Wells Fargo & Co', change: 1.5, price: 46.75, volume: '6.2M', signal: 'Hold', date: 'Tomorrow' },
      { symbol: 'C', name: 'Citigroup Inc', change: 0.8, price: 70.25, volume: '5.7M', signal: 'Hold', date: '2 days' },
      { symbol: 'GS', name: 'Goldman Sachs Group', change: 1.9, price: 380.50, volume: '3.9M', signal: 'Buy', date: '3 days' },
    ],
  };

  // Predefined scans list
  const predefinedScans = [
    { id: 'gainers', name: 'Top Gainers', icon: 'trending-up' },
    { id: 'losers', name: 'Top Losers', icon: 'trending-down' },
    { id: 'volume', name: 'High Volume', icon: 'podium' },
    { id: 'oversold', name: 'Oversold', icon: 'arrow-down-circle' },
    { id: 'overbought', name: 'Overbought', icon: 'arrow-up-circle' },
    { id: 'earnings', name: 'Earnings', icon: 'calendar' },
  ];

  // Custom scans list
  const customScans = [
    { id: 'breakout', name: 'Breakout Stocks', description: 'Stocks breaking out of resistance levels' },
    { id: 'dividend', name: 'Dividend Champions', description: 'Stocks with consistent dividend growth' },
    { id: 'momentum', name: 'Momentum Leaders', description: 'Stocks showing strong upward momentum' },
  ];

  // Get signal color based on signal text
  const getSignalColor = (signal) => {
    switch (signal) {
      case 'Strong Buy':
        return Colors.success;
      case 'Buy':
        return '#4caf50'; // Light green
      case 'Hold':
        return '#ff9800'; // Orange
      case 'Sell':
        return '#f44336'; // Light red
      case 'Strong Sell':
        return Colors.error;
      default:
        return Colors.darkGray;
    }
  };

  // Render scan result
  const renderScanResults = () => {
    const data = scannerData[selectedScan] || [];
    
    if (data.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No results found</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.scanResultsContainer}>
        {data.map((stock, index) => (
          <TouchableOpacity key={index} style={styles.stockCard}>
            <View style={styles.stockHeader}>
              <View>
                <Text style={styles.stockSymbol}>{stock.symbol}</Text>
                <Text style={styles.stockName}>{stock.name}</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.stockPrice}>${stock.price}</Text>
                <View style={[styles.changeContainer, { 
                  backgroundColor: stock.change >= 0 ? Colors.success : Colors.error 
                }]}>
                  <Ionicons 
                    name={stock.change >= 0 ? 'arrow-up' : 'arrow-down'} 
                    size={12} 
                    color={Colors.white} 
                  />
                  <Text style={styles.changeText}>
                    {Math.abs(stock.change).toFixed(2)}%
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.stockDetails}>
              <View style={styles.stockDetail}>
                <Text style={styles.detailLabel}>Volume</Text>
                <Text style={styles.detailValue}>{stock.volume}</Text>
              </View>
              <View style={styles.stockDetail}>
                <Text style={styles.detailLabel}>Signal</Text>
                <Text style={[styles.signalText, { color: getSignalColor(stock.signal) }]}>
                  {stock.signal}
                </Text>
              </View>
              {stock.date && (
                <View style={styles.stockDetail}>
                  <Text style={styles.detailLabel}>Earnings</Text>
                  <Text style={styles.detailValue}>{stock.date}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Market Scanner"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={Colors.darkGray} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search or create custom scan..."
            placeholderTextColor={Colors.darkGray}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color={Colors.darkGray} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <SectionHeader title="Predefined Scans" />
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.horizontalScrollContent}
        >
          {predefinedScans.map((scan) => (
            <TouchableOpacity
              key={scan.id}
              style={[
                styles.scanButton,
                selectedScan === scan.id && styles.scanButtonActive
              ]}
              onPress={() => setSelectedScan(scan.id)}
            >
              <Ionicons 
                name={scan.icon} 
                size={18} 
                color={selectedScan === scan.id ? Colors.white : Colors.primary} 
              />
              <Text style={[
                styles.scanButtonText,
                selectedScan === scan.id && styles.scanButtonTextActive
              ]}>
                {scan.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            {predefinedScans.find(scan => scan.id === selectedScan)?.name || 'Results'}
          </Text>
          <TouchableOpacity style={styles.refreshButton}>
            <Ionicons name="refresh" size={18} color={Colors.primary} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {renderScanResults()}

        <SectionHeader title="My Custom Scans" />
        <View style={styles.customScansContainer}>
          {customScans.map((scan, index) => (
            <TouchableOpacity key={index} style={styles.customScanCard}>
              <View style={styles.customScanHeader}>
                <Text style={styles.customScanName}>{scan.name}</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.darkGray} />
              </View>
              <Text style={styles.customScanDescription}>{scan.description}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.createScanButton}>
            <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
            <Text style={styles.createScanText}>Create New Custom Scan</Text>
          </TouchableOpacity>
        </View>
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
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 10,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: Colors.secondary,
    fontSize: 14,
  },
  filterButton: {
    backgroundColor: Colors.primary,
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalScroll: {
    marginBottom: 15,
  },
  horizontalScrollContent: {
    paddingRight: 10,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  scanButtonActive: {
    backgroundColor: Colors.primary,
  },
  scanButtonText: {
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 6,
  },
  scanButtonTextActive: {
    color: Colors.white,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 4,
  },
  scanResultsContainer: {
    marginBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.darkGray,
  },
  stockCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  stockSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  stockName: {
    fontSize: 12,
    color: Colors.darkGray,
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  stockPrice: {
    fontSize: 16,
    fontWeight: '600',
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
  stockDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingTop: 10,
  },
  stockDetail: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.darkGray,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },
  signalText: {
    fontSize: 14,
    fontWeight: '600',
  },
  customScansContainer: {
    marginBottom: 20,
  },
  customScanCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customScanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  customScanName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary,
  },
  customScanDescription: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  createScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: Colors.lightBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
  },
  createScanText: {
    fontSize: 16,
    color: Colors.primary,
    marginLeft: 8,
  },
});

export default MarketScannerScreen; 