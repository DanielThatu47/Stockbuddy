import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';

const StockCard = ({ 
  symbol, 
  companyName, 
  price, 
  priceChange, 
  volume,
  logo,
  currency = 'USD',
  onPress,
  containerStyle = {},
  recentVolume = 0 // Keep this prop for real-time updates
}) => {
  const isPositiveChange = priceChange >= 0;
  const [showVolumeActivity, setShowVolumeActivity] = useState(false);
  const volumeActivityOpacity = useRef(new Animated.Value(0)).current;
  const lastVolumeRef = useRef(volume);
  
  // Get currency symbol based on the currency code
  const getCurrencySymbol = (currencyCode) => {
    switch (currencyCode) {
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
  
  const currencySymbol = getCurrencySymbol(currency);
  
  // Truncate company name if too long
  const truncatedName = companyName.length > 22 
    ? companyName.substring(0, 20) + '...' 
    : companyName;
  
  // Format volume with suffix (keep for backend calculations)
  const formatVolume = (vol) => {
    if (!vol || vol === 'N/A') return 'N/A';
    
    // If it's already formatted with suffix
    if (typeof vol === 'string' && (vol.endsWith('K') || vol.endsWith('M') || vol.endsWith('B'))) {
      return vol;
    }
    
    // Format with appropriate suffix
    const num = parseFloat(vol);
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };
  
  // Handle volume change animation (keep for price animation triggers)
  useEffect(() => {
    if (recentVolume > 0) {
      // Update last volume reference
      lastVolumeRef.current = volume;
    }
  }, [recentVolume]);
  
  return (
    <TouchableOpacity 
      style={[styles.container, containerStyle]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.leftSection}>
        {logo ? (
          <Image source={{ uri: logo }} style={styles.logo} />
        ) : (
          <View style={styles.symbolCircle}>
            <Text style={styles.symbolText}>{symbol.split(':').pop().charAt(0)}</Text>
          </View>
        )}
        
        <View style={styles.nameSection}>
          <Text style={styles.companyName}>{truncatedName}</Text>
          <Text style={styles.symbol}>{symbol}</Text>
        </View>
      </View>
      
      <View style={styles.rightSection}>
        <Text style={styles.price}>{currencySymbol}{price.toFixed(2)}</Text>
        <View style={[
          styles.changeContainer, 
          {backgroundColor: isPositiveChange ? Colors.lightGreen : Colors.lightRed}
        ]}>
          <Ionicons
            name={isPositiveChange ? 'caret-up' : 'caret-down'}
            size={14}
            color={isPositiveChange ? Colors.success : Colors.error}
          />
          <Text style={[
            styles.priceChange,
            {color: isPositiveChange ? Colors.success : Colors.error}
          ]}>
            {Math.abs(priceChange).toFixed(2)}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  symbolCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  symbolText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  nameSection: {
    justifyContent: 'center',
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 2,
  },
  symbol: {
    fontSize: 12,
    color: Colors.secondary,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.secondary,
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceChange: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  }
});

export default StockCard; 