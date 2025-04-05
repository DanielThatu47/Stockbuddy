import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal, TextInput } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import Header from '../components/Header';
import SectionHeader from '../components/SectionHeader';
import Colors from '../constants/colors';

const AlertsScreen = ({ navigation }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAlertType, setSelectedAlertType] = useState('price');
  const [alertStock, setAlertStock] = useState('');
  const [alertValue, setAlertValue] = useState('');

  // Mock data for existing alerts
  const alerts = [
    { 
      id: 1, 
      type: 'price', 
      stock: 'AAPL', 
      stockName: 'Apple Inc.',
      condition: 'above', 
      value: 180.00,
      enabled: true,
      notificationMethod: ['app', 'email']
    },
    { 
      id: 2, 
      type: 'price', 
      stock: 'TSLA', 
      stockName: 'Tesla Inc',
      condition: 'below', 
      value: 700.00,
      enabled: true,
      notificationMethod: ['app']
    },
    { 
      id: 3, 
      type: 'volume', 
      stock: 'AMZN', 
      stockName: 'Amazon.com Inc',
      condition: 'above', 
      value: 15000000,
      enabled: false,
      notificationMethod: ['app', 'email', 'sms']
    },
    { 
      id: 4, 
      type: 'technical', 
      stock: 'MSFT', 
      stockName: 'Microsoft Corp',
      condition: 'crosses', 
      value: 'SMA(50)', 
      direction: 'upward',
      enabled: true,
      notificationMethod: ['app', 'email']
    },
    { 
      id: 5, 
      type: 'news', 
      stock: 'GOOGL', 
      stockName: 'Alphabet Inc',
      enabled: true,
      notificationMethod: ['app']
    },
  ];

  // Alert categories
  const alertTypes = [
    { id: 'price', name: 'Price Alert', icon: 'cash-outline' },
    { id: 'technical', name: 'Technical', icon: 'analytics-outline' },
    { id: 'volume', name: 'Volume', icon: 'stats-chart-outline' },
    { id: 'news', name: 'News', icon: 'newspaper-outline' },
    { id: 'earnings', name: 'Earnings', icon: 'calendar-outline' },
  ];

  // Alert suggestions
  const alertSuggestions = [
    { stock: 'AAPL', stockName: 'Apple Inc.', type: 'technical', condition: 'approaching', value: 'Resistance' },
    { stock: 'NVDA', stockName: 'NVIDIA Corp', type: 'news', condition: 'high impact' },
    { stock: 'JPM', stockName: 'JPMorgan Chase', type: 'earnings', date: 'in 2 days' },
  ];

  // Toggle alert status
  const toggleAlertStatus = (alertId) => {
    // In a real app, this would update the state
    console.log(`Toggling alert ${alertId}`);
  };

  // Delete alert
  const deleteAlert = (alertId) => {
    // In a real app, this would remove the alert
    console.log(`Deleting alert ${alertId}`);
  };

  // Get icon for alert type
  const getAlertTypeIcon = (type) => {
    switch (type) {
      case 'price':
        return 'cash-outline';
      case 'technical':
        return 'analytics-outline';
      case 'volume':
        return 'stats-chart-outline';
      case 'news':
        return 'newspaper-outline';
      case 'earnings':
        return 'calendar-outline';
      default:
        return 'notifications-outline';
    }
  };

  // Format alert condition text
  const formatAlertCondition = (alert) => {
    switch (alert.type) {
      case 'price':
        return `${alert.condition === 'above' ? 'Rises above' : 'Falls below'} $${alert.value.toFixed(2)}`;
      case 'volume':
        return `Volume ${alert.condition === 'above' ? 'exceeds' : 'drops below'} ${(alert.value / 1000000).toFixed(1)}M`;
      case 'technical':
        return `${alert.condition === 'crosses' ? 'Crosses' : 'Touches'} ${alert.value} ${alert.direction ? alert.direction : ''}`;
      case 'news':
        return 'Important news released';
      case 'earnings':
        return 'Earnings announcement';
      default:
        return '';
    }
  };

  // Render alert creation modal
  const renderAlertModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Alert</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.darkGray} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalSectionTitle}>Alert Type</Text>
            <View style={styles.alertTypeContainer}>
              {alertTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.alertTypeButton,
                    selectedAlertType === type.id && styles.alertTypeButtonActive
                  ]}
                  onPress={() => setSelectedAlertType(type.id)}
                >
                  <Ionicons 
                    name={type.icon} 
                    size={20} 
                    color={selectedAlertType === type.id ? Colors.white : Colors.primary} 
                  />
                  <Text style={[
                    styles.alertTypeText,
                    selectedAlertType === type.id && styles.alertTypeTextActive
                  ]}>
                    {type.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalSectionTitle}>Stock Symbol</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter stock symbol (e.g., AAPL)"
                value={alertStock}
                onChangeText={setAlertStock}
              />
            </View>

            {selectedAlertType !== 'news' && (
              <>
                <Text style={styles.modalSectionTitle}>
                  {selectedAlertType === 'price' ? 'Price Condition' : 
                   selectedAlertType === 'volume' ? 'Volume Condition' : 
                   selectedAlertType === 'technical' ? 'Technical Indicator' : 
                   'Condition'}
                </Text>
                <View style={styles.conditionContainer}>
                  {selectedAlertType === 'price' && (
                    <>
                      <View style={styles.radioContainer}>
                        <TouchableOpacity style={styles.radioOption}>
                          <View style={styles.radioButton}>
                            <View style={styles.radioButtonInner} />
                          </View>
                          <Text style={styles.radioText}>Above</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.radioOption}>
                          <View style={styles.radioButton}>
                            <View style={styles.radioButtonInner} />
                          </View>
                          <Text style={styles.radioText}>Below</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputPrefix}>$</Text>
                        <TextInput
                          style={[styles.input, styles.valueInput]}
                          placeholder="Enter price"
                          keyboardType="numeric"
                          value={alertValue}
                          onChangeText={setAlertValue}
                        />
                      </View>
                    </>
                  )}
                </View>
              </>
            )}

            <Text style={styles.modalSectionTitle}>Notification Method</Text>
            <View style={styles.notificationMethodContainer}>
              <View style={styles.notificationMethod}>
                <Text style={styles.notificationMethodText}>App Notification</Text>
                <Switch
                  value={true}
                  trackColor={{ false: Colors.lightGray, true: Colors.lightPrimary }}
                  thumbColor={Colors.primary}
                />
              </View>
              <View style={styles.notificationMethod}>
                <Text style={styles.notificationMethodText}>Email</Text>
                <Switch
                  value={false}
                  trackColor={{ false: Colors.lightGray, true: Colors.lightPrimary }}
                  thumbColor={Colors.primary}
                />
              </View>
              <View style={styles.notificationMethod}>
                <Text style={styles.notificationMethodText}>SMS</Text>
                <Switch
                  value={false}
                  trackColor={{ false: Colors.lightGray, true: Colors.lightPrimary }}
                  thumbColor={Colors.primary}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={styles.createAlertButton}
              onPress={() => {
                // Create alert logic here
                setModalVisible(false);
              }}
            >
              <Text style={styles.createAlertButtonText}>Create Alert</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Alerts"
        showBackButton
        onBackPress={() => navigation.goBack()}
      >
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color={Colors.white} />
        </TouchableOpacity>
      </Header>

      <ScrollView style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{alerts.filter(a => a.enabled).length}</Text>
            <Text style={styles.statLabel}>Active Alerts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{alerts.length}</Text>
            <Text style={styles.statLabel}>Total Alerts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Triggered Today</Text>
          </View>
        </View>

        <SectionHeader title="Your Alerts" />

        {alerts.map((alert) => (
          <View key={alert.id} style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <View style={styles.alertInfo}>
                <View style={styles.stockInfoContainer}>
                  <Text style={styles.stockSymbol}>{alert.stock}</Text>
                  <Text style={styles.stockName}>{alert.stockName}</Text>
                </View>
                <View style={[styles.alertTypeBadge, { backgroundColor: Colors.lightPrimary }]}>
                  <Ionicons name={getAlertTypeIcon(alert.type)} size={14} color={Colors.primary} />
                  <Text style={styles.alertTypeBadgeText}>{alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}</Text>
                </View>
              </View>
              <Switch
                value={alert.enabled}
                onValueChange={() => toggleAlertStatus(alert.id)}
                trackColor={{ false: Colors.lightGray, true: Colors.lightPrimary }}
                thumbColor={alert.enabled ? Colors.primary : Colors.gray}
              />
            </View>
            
            <Text style={styles.alertCondition}>{formatAlertCondition(alert)}</Text>
            
            <View style={styles.alertFooter}>
              <View style={styles.notificationBadges}>
                {alert.notificationMethod.includes('app') && (
                  <View style={styles.notificationBadge}>
                    <Ionicons name="phone-portrait-outline" size={12} color={Colors.primary} />
                    <Text style={styles.notificationBadgeText}>App</Text>
                  </View>
                )}
                {alert.notificationMethod.includes('email') && (
                  <View style={styles.notificationBadge}>
                    <Ionicons name="mail-outline" size={12} color={Colors.primary} />
                    <Text style={styles.notificationBadgeText}>Email</Text>
                  </View>
                )}
                {alert.notificationMethod.includes('sms') && (
                  <View style={styles.notificationBadge}>
                    <Ionicons name="chatbubble-outline" size={12} color={Colors.primary} />
                    <Text style={styles.notificationBadgeText}>SMS</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => deleteAlert(alert.id)}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <SectionHeader title="Suggested Alerts" />
        
        <View style={styles.suggestionsContainer}>
          {alertSuggestions.map((suggestion, index) => (
            <TouchableOpacity key={index} style={styles.suggestionCard}>
              <View style={styles.suggestionHeader}>
                <View style={styles.stockInfoContainer}>
                  <Text style={styles.stockSymbol}>{suggestion.stock}</Text>
                  <Text style={styles.stockName}>{suggestion.stockName}</Text>
                </View>
                <View style={[styles.alertTypeBadge, { backgroundColor: Colors.lightPrimary }]}>
                  <Ionicons name={getAlertTypeIcon(suggestion.type)} size={14} color={Colors.primary} />
                  <Text style={styles.alertTypeBadgeText}>{suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}</Text>
                </View>
              </View>
              
              <Text style={styles.suggestionDescription}>
                {suggestion.type === 'technical' ? 
                  `Stock is ${suggestion.condition} ${suggestion.value} level` :
                 suggestion.type === 'news' ?
                  `Set alert for ${suggestion.condition} news` :
                 suggestion.type === 'earnings' ?
                  `Earnings announcement ${suggestion.date}` :
                  'Set custom alert'}
              </Text>
              
              <TouchableOpacity style={styles.createSuggestionButton}>
                <Text style={styles.createSuggestionText}>Create Alert</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {renderAlertModal()}
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
  headerButton: {
    padding: 8,
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
    padding: 12,
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
  alertCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  alertInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockInfoContainer: {
    flex: 1,
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
  alertTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 10,
  },
  alertTypeBadgeText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 4,
  },
  alertCondition: {
    fontSize: 14,
    color: Colors.secondary,
    marginBottom: 12,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingTop: 10,
  },
  notificationBadges: {
    flexDirection: 'row',
  },
  notificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  notificationBadgeText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 4,
  },
  deleteButton: {
    padding: 5,
  },
  suggestionsContainer: {
    marginBottom: 20,
  },
  suggestionCard: {
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
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  suggestionDescription: {
    fontSize: 14,
    color: Colors.secondary,
    marginBottom: 15,
  },
  createSuggestionButton: {
    backgroundColor: Colors.lightBackground,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  createSuggestionText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  modalContent: {
    padding: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary,
    marginVertical: 10,
  },
  alertTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  alertTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  alertTypeButtonActive: {
    backgroundColor: Colors.primary,
  },
  alertTypeText: {
    color: Colors.primary,
    fontSize: 14,
    marginLeft: 6,
  },
  alertTypeTextActive: {
    color: Colors.white,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  inputPrefix: {
    fontSize: 16,
    color: Colors.darkGray,
    marginRight: 5,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: Colors.secondary,
  },
  valueInput: {
    textAlign: 'right',
  },
  radioContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  radioText: {
    fontSize: 14,
    color: Colors.secondary,
  },
  conditionContainer: {
    marginBottom: 15,
  },
  notificationMethodContainer: {
    marginBottom: 20,
  },
  notificationMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  notificationMethodText: {
    fontSize: 16,
    color: Colors.secondary,
  },
  createAlertButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  createAlertButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AlertsScreen;