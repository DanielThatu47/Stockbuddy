import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import Header from '../components/Header';
import SectionHeader from '../components/SectionHeader';
import Colors from '../constants/colors';

const RiskAssessmentScreen = ({ navigation }) => {
  // Mock data for portfolio risk metrics
  const portfolioRisk = {
    riskScore: 65,
    volatility: 12.8,
    sharpeRatio: 1.4,
    maxDrawdown: -18.5,
    beta: 1.2,
    riskAssessment: 'Moderate-High',
    riskBreakdown: [
      { category: 'Market Risk', value: 35, description: 'Risk from market movements' },
      { category: 'Sector Risk', value: 25, description: 'Risk from sector concentration' },
      { category: 'Stock Specific', value: 20, description: 'Company-specific risks' },
      { category: 'Currency Risk', value: 10, description: 'Exposure to currency fluctuations' },
      { category: 'Interest Rate Risk', value: 10, description: 'Sensitivity to interest rates' },
    ],
  };

  // Mock data for high risk stocks
  const highRiskStocks = [
    { symbol: 'TSLA', name: 'Tesla Inc', riskScore: 85, volatility: 45.2 },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', riskScore: 78, volatility: 38.5 },
    { symbol: 'PLTR', name: 'Palantir Technologies', riskScore: 82, volatility: 42.3 },
    { symbol: 'COIN', name: 'Coinbase Global', riskScore: 88, volatility: 52.1 },
  ];

  // Helper function to determine risk color
  const getRiskColor = (score) => {
    if (score < 30) return Colors.success;
    if (score < 60) return '#f39c12'; // Orange
    return Colors.error;
  };

  // Helper function to render risk level indicator
  const renderRiskMeter = (score) => {
    return (
      <View style={styles.riskMeterContainer}>
        <View style={styles.riskMeterBackground}>
          <View 
            style={[
              styles.riskMeterFill, 
              { width: `${score}%`, backgroundColor: getRiskColor(score) }
            ]} 
          />
        </View>
        <View style={styles.riskLabels}>
          <Text style={styles.riskLabel}>Low</Text>
          <Text style={styles.riskLabel}>Moderate</Text>
          <Text style={styles.riskLabel}>High</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Risk Assessment"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.content}>
        <View style={styles.summaryCard}>
          <View style={styles.riskScoreContainer}>
            <Text style={styles.riskScoreLabel}>Portfolio Risk Score</Text>
            <View style={styles.riskScoreValueContainer}>
              <Text style={[styles.riskScoreValue, { color: getRiskColor(portfolioRisk.riskScore) }]}>
                {portfolioRisk.riskScore}
              </Text>
              <Text style={styles.riskAssessmentText}>
                {portfolioRisk.riskAssessment}
              </Text>
            </View>
          </View>
          
          {renderRiskMeter(portfolioRisk.riskScore)}
          
          <TouchableOpacity style={styles.assessButton}>
            <Text style={styles.assessButtonText}>Full Risk Analysis</Text>
          </TouchableOpacity>
        </View>

        <SectionHeader title="Key Risk Metrics" />
        <View style={styles.metricsCard}>
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Volatility</Text>
              <Text style={styles.metricValue}>{portfolioRisk.volatility}%</Text>
              <TouchableOpacity style={styles.infoButton}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.darkGray} />
              </TouchableOpacity>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Sharpe Ratio</Text>
              <Text style={styles.metricValue}>{portfolioRisk.sharpeRatio}</Text>
              <TouchableOpacity style={styles.infoButton}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.darkGray} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Max Drawdown</Text>
              <Text style={styles.metricValue}>{portfolioRisk.maxDrawdown}%</Text>
              <TouchableOpacity style={styles.infoButton}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.darkGray} />
              </TouchableOpacity>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Beta</Text>
              <Text style={styles.metricValue}>{portfolioRisk.beta}</Text>
              <TouchableOpacity style={styles.infoButton}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.darkGray} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <SectionHeader title="Risk Breakdown" />
        <View style={styles.breakdownCard}>
          {portfolioRisk.riskBreakdown.map((item, index) => (
            <View key={index} style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <Text style={styles.breakdownCategory}>{item.category}</Text>
                <Text style={styles.breakdownValue}>{item.value}%</Text>
              </View>
              <View style={styles.breakdownBarContainer}>
                <View 
                  style={[
                    styles.breakdownBar, 
                    { width: `${item.value}%`, backgroundColor: getRiskColor(item.value) }
                  ]} 
                />
              </View>
              <Text style={styles.breakdownDescription}>{item.description}</Text>
            </View>
          ))}
        </View>

        <SectionHeader title="Highest Risk Positions" />
        <View style={styles.highRiskContainer}>
          {highRiskStocks.map((stock, index) => (
            <TouchableOpacity key={index} style={styles.stockRiskCard}>
              <View style={styles.stockRiskHeader}>
                <View>
                  <Text style={styles.stockSymbol}>{stock.symbol}</Text>
                  <Text style={styles.stockName}>{stock.name}</Text>
                </View>
                <View style={[styles.riskScoreBadge, { backgroundColor: getRiskColor(stock.riskScore) }]}>
                  <Text style={styles.riskScoreBadgeText}>{stock.riskScore}</Text>
                </View>
              </View>
              <View style={styles.stockRiskDetails}>
                <Text style={styles.riskDetailLabel}>Volatility</Text>
                <Text style={styles.riskDetailValue}>{stock.volatility}%</Text>
              </View>
              <View style={styles.stockRiskMeter}>
                <View style={styles.stockRiskMeterBg}>
                  <View 
                    style={[
                      styles.stockRiskMeterFill, 
                      { width: `${stock.riskScore}%`, backgroundColor: getRiskColor(stock.riskScore) }
                    ]} 
                  />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.optimizeButton}>
          <Text style={styles.optimizeButtonText}>Optimize Risk-Return Balance</Text>
        </TouchableOpacity>
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
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 15,
    marginVertical: 15,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  riskScoreContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  riskScoreLabel: {
    fontSize: 16,
    color: Colors.darkGray,
    marginBottom: 5,
  },
  riskScoreValueContainer: {
    alignItems: 'center',
  },
  riskScoreValue: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  riskAssessmentText: {
    fontSize: 14,
    color: Colors.darkGray,
    marginTop: 5,
  },
  riskMeterContainer: {
    marginVertical: 15,
  },
  riskMeterBackground: {
    height: 10,
    backgroundColor: Colors.lightGray,
    borderRadius: 5,
    overflow: 'hidden',
  },
  riskMeterFill: {
    height: '100%',
    borderRadius: 5,
  },
  riskLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  riskLabel: {
    fontSize: 12,
    color: Colors.darkGray,
  },
  assessButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  assessButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  metricsCard: {
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
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: Colors.lightBackground,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.darkGray,
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  infoButton: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  breakdownCard: {
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
  breakdownItem: {
    marginBottom: 15,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  breakdownCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },
  breakdownBarContainer: {
    height: 8,
    backgroundColor: Colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  breakdownBar: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownDescription: {
    fontSize: 12,
    color: Colors.darkGray,
  },
  highRiskContainer: {
    marginVertical: 10,
  },
  stockRiskCard: {
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
  stockRiskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  riskScoreBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  riskScoreBadgeText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  stockRiskDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  riskDetailLabel: {
    fontSize: 12,
    color: Colors.darkGray,
  },
  riskDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },
  stockRiskMeter: {
    marginTop: 5,
  },
  stockRiskMeterBg: {
    height: 6,
    backgroundColor: Colors.lightGray,
    borderRadius: 3,
    overflow: 'hidden',
  },
  stockRiskMeterFill: {
    height: '100%',
    borderRadius: 3,
  },
  optimizeButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginVertical: 20,
  },
  optimizeButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RiskAssessmentScreen; 