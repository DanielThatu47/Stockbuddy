import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import Header from '../components/Header';
import SectionHeader from '../components/SectionHeader';
import Colors from '../constants/colors';

const TradingBotsScreen = ({ navigation }) => {
  const [activeBots, setActiveBots] = useState([]);

  // Mock data for bots
  const tradingBots = [
    { 
      id: 1, 
      name: 'MomentumTrader', 
      description: 'Identifies and trades stocks with strong momentum signals',
      active: true,
      status: 'Running',
      performance: {
        today: 1.2,
        week: 3.5,
        month: 5.8,
        total: 12.4
      },
      trades: 28,
      successRate: 68,
      settings: {
        risk: 'Medium',
        maxPosition: '$1,000',
        stopLoss: '2%'
      }
    },
    { 
      id: 2, 
      name: 'SwingTrader', 
      description: 'Captures short to medium term price movements using technical indicators',
      active: false,
      status: 'Paused',
      performance: {
        today: 0,
        week: 1.8,
        month: 4.2,
        total: 10.5
      },
      trades: 15,
      successRate: 73,
      settings: {
        risk: 'Medium-High',
        maxPosition: '$1,500',
        stopLoss: '3%'
      }
    },
    { 
      id: 3, 
      name: 'DividendCollector', 
      description: 'Strategically buys stocks before dividend payments and sells after collection',
      active: false,
      status: 'Idle',
      performance: {
        today: 0,
        week: 0,
        month: 2.3,
        total: 8.7
      },
      trades: 7,
      successRate: 85,
      settings: {
        risk: 'Low',
        maxPosition: '$2,000',
        stopLoss: '1.5%'
      }
    },
    { 
      id: 4, 
      name: 'MarketHedger', 
      description: 'Automatically hedges your portfolio during market volatility',
      active: true,
      status: 'Running',
      performance: {
        today: -0.3,
        week: 1.2,
        month: 3.5,
        total: 7.9
      },
      trades: 42,
      successRate: 62,
      settings: {
        risk: 'Low',
        maxPosition: '$1,000',
        stopLoss: '2%'
      }
    },
  ];

  // Bot template options for new bots
  const botTemplates = [
    { id: 't1', name: 'Day Trader', complexity: 'Advanced', description: 'High-frequency trading bot for day trading' },
    { id: 't2', name: 'Value Investor', complexity: 'Beginner', description: 'Seeks undervalued stocks based on fundamentals' },
    { id: 't3', name: 'Trend Follower', complexity: 'Intermediate', description: 'Follows established market trends' },
  ];

  // Update active bots when component mounts
  useEffect(() => {
    setActiveBots(tradingBots.filter(bot => bot.active));
  }, []);

  // Toggle bot active status
  const toggleBotStatus = (botId) => {
    const updatedBots = tradingBots.map(bot => {
      if (bot.id === botId) {
        bot.active = !bot.active;
        bot.status = bot.active ? 'Starting...' : 'Paused';
      }
      return bot;
    });
    
    setActiveBots(updatedBots.filter(bot => bot.active));
  };

  // Get color based on performance value
  const getPerformanceColor = (value) => {
    if (value > 0) return Colors.success;
    if (value < 0) return Colors.error;
    return Colors.darkGray;
  };

  return (
    <View style={styles.container}>
      <Header
        title="Trading Bots"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{activeBots.length}</Text>
            <Text style={styles.statLabel}>Active Bots</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {(tradingBots.reduce((sum, bot) => sum + (bot.active ? bot.performance.today : 0), 0) / Math.max(activeBots.length, 1)).toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Avg. Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {(tradingBots.reduce((sum, bot) => sum + bot.trades, 0))}
            </Text>
            <Text style={styles.statLabel}>Total Trades</Text>
          </View>
        </View>

        <SectionHeader title="Your Trading Bots" />

        {tradingBots.map((bot) => (
          <View key={bot.id} style={styles.botCard}>
            <View style={styles.botHeader}>
              <View style={styles.botInfo}>
                <Text style={styles.botName}>{bot.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: bot.active ? Colors.success : Colors.darkGray }]}>
                  <Text style={styles.statusText}>{bot.status}</Text>
                </View>
              </View>
              <Switch
                value={bot.active}
                onValueChange={() => toggleBotStatus(bot.id)}
                trackColor={{ false: Colors.lightGray, true: Colors.lightPrimary }}
                thumbColor={bot.active ? Colors.primary : Colors.gray}
              />
            </View>
            
            <Text style={styles.botDescription}>{bot.description}</Text>
            
            <View style={styles.performanceContainer}>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Today</Text>
                <Text style={[styles.performanceValue, { color: getPerformanceColor(bot.performance.today) }]}>
                  {bot.performance.today > 0 ? '+' : ''}{bot.performance.today}%
                </Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Week</Text>
                <Text style={[styles.performanceValue, { color: getPerformanceColor(bot.performance.week) }]}>
                  {bot.performance.week > 0 ? '+' : ''}{bot.performance.week}%
                </Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Month</Text>
                <Text style={[styles.performanceValue, { color: getPerformanceColor(bot.performance.month) }]}>
                  {bot.performance.month > 0 ? '+' : ''}{bot.performance.month}%
                </Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Total</Text>
                <Text style={[styles.performanceValue, { color: getPerformanceColor(bot.performance.total) }]}>
                  {bot.performance.total > 0 ? '+' : ''}{bot.performance.total}%
                </Text>
              </View>
            </View>
            
            <View style={styles.botFooter}>
              <View style={styles.botStat}>
                <MaterialCommunityIcons name="swap-horizontal" size={16} color={Colors.darkGray} />
                <Text style={styles.botStatText}>{bot.trades} trades</Text>
              </View>
              <View style={styles.botStat}>
                <MaterialCommunityIcons name="check-circle" size={16} color={Colors.darkGray} />
                <Text style={styles.botStatText}>{bot.successRate}% success</Text>
              </View>
              <View style={styles.botStat}>
                <MaterialCommunityIcons name="shield-alert" size={16} color={Colors.darkGray} />
                <Text style={styles.botStatText}>{bot.settings.risk} risk</Text>
              </View>
            </View>
            
            <View style={styles.botActions}>
              <TouchableOpacity style={styles.botActionButton}>
                <MaterialCommunityIcons name="history" size={18} color={Colors.primary} />
                <Text style={styles.botActionText}>History</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botActionButton}>
                <MaterialCommunityIcons name="tune" size={18} color={Colors.primary} />
                <Text style={styles.botActionText}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botActionButton}>
                <MaterialCommunityIcons name="chart-line" size={18} color={Colors.primary} />
                <Text style={styles.botActionText}>Analytics</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <SectionHeader title="Create New Bot" />
        
        <View style={styles.templateContainer}>
          {botTemplates.map((template, index) => (
            <TouchableOpacity key={template.id} style={styles.templateCard}>
              <View style={styles.templateHeader}>
                <Text style={styles.templateName}>{template.name}</Text>
                <View style={styles.complexityBadge}>
                  <Text style={styles.complexityText}>{template.complexity}</Text>
                </View>
              </View>
              <Text style={styles.templateDescription}>{template.description}</Text>
              <TouchableOpacity style={styles.useTemplateButton}>
                <Text style={styles.useTemplateText}>Use Template</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity style={styles.createCustomBotButton}>
            <Ionicons name="add-circle-outline" size={22} color={Colors.white} />
            <Text style={styles.createCustomBotText}>Create Custom Bot</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.disclaimer}>
          <MaterialCommunityIcons name="information-outline" size={18} color={Colors.darkGray} />
          <Text style={styles.disclaimerText}>
            Trading bots involve risk. Past performance is not indicative of future results.
            Review and customize all settings before running a bot.
          </Text>
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
    paddingBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.secondary,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.darkGray,
  },
  botCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  botHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  botInfo: {
    flex: 1,
  },
  botName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.secondary,
    marginBottom: 5,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 10,
  },
  statusText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '500',
  },
  botDescription: {
    fontSize: 14,
    color: Colors.darkGray,
    marginBottom: 15,
  },
  performanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    backgroundColor: Colors.lightBackground,
    borderRadius: 8,
    padding: 10,
  },
  performanceItem: {
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 12,
    color: Colors.darkGray,
    marginBottom: 5,
  },
  performanceValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  botFooter: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  botStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  botStatText: {
    fontSize: 12,
    color: Colors.darkGray,
    marginLeft: 5,
  },
  botActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingTop: 15,
  },
  botActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botActionText: {
    color: Colors.primary,
    marginLeft: 5,
    fontSize: 14,
  },
  templateContainer: {
    marginBottom: 20,
  },
  templateCard: {
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
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  templateName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  complexityBadge: {
    backgroundColor: Colors.lightPrimary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  complexityText: {
    fontSize: 12,
    color: Colors.primary,
  },
  templateDescription: {
    fontSize: 14,
    color: Colors.darkGray,
    marginBottom: 15,
  },
  useTemplateButton: {
    backgroundColor: Colors.lightBackground,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  useTemplateText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  createCustomBotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    marginVertical: 10,
  },
  createCustomBotText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: Colors.lightBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.darkGray,
    marginLeft: 8,
    lineHeight: 18,
  },
});

export default TradingBotsScreen;