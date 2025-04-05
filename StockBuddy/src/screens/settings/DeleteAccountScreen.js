import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import Colors from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';

const DeleteAccountScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  const [errors, setErrors] = useState({
    password: '',
    confirmationText: ''
  });

  // Expected confirmation text (capitalized)
  const EXPECTED_CONFIRMATION = 'DELETE MY ACCOUNT';

  useEffect(() => {
    // Enable/disable button based on validation
    const isValid = password.length > 0 && confirmationText === EXPECTED_CONFIRMATION;
    setIsButtonEnabled(isValid);
    
    // Clear confirmation text error when user types the correct text
    if (confirmationText === EXPECTED_CONFIRMATION && errors.confirmationText) {
      setErrors(prev => ({...prev, confirmationText: ''}));
    }
  }, [password, confirmationText, errors.confirmationText]);

  const validateInputs = () => {
    let isValid = true;
    const newErrors = {
      password: '',
      confirmationText: ''
    };

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    }

    if (!confirmationText) {
      newErrors.confirmationText = 'Confirmation text is required';
      isValid = false;
    } else if (confirmationText !== EXPECTED_CONFIRMATION) {
      newErrors.confirmationText = `Please type exactly "${EXPECTED_CONFIRMATION}"`;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleDeleteAccount = async () => {
    if (!validateInputs()) {
      return;
    }

    // Show a final confirmation alert
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be permanently deleted. Are you sure you want to proceed?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: performAccountDeletion
        }
      ],
      { cancelable: true }
    );
  };

  const performAccountDeletion = async () => {
    try {
      setIsLoading(true);
      const result = await apiRequest('/profile', 'DELETE', {
        password,
        confirmationText: confirmationText.toLowerCase() // Send in lowercase to match backend expectation
      }, true);

      if (result.success) {
        Alert.alert(
          'Account Deleted',
          'Your account has been successfully deleted.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Log the user out and return to login screen
                logout();
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Auth' }]
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Error', error.message || 'Failed to delete account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Delete Account"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView}>
        <View style={styles.warningCard}>
          <Ionicons name="warning-outline" size={32} color={Colors.error} />
          <Text style={styles.warningTitle}>Warning: Account Deletion</Text>
          <Text style={styles.warningText}>
            This action will permanently delete your account and all associated data. This includes:
          </Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>• All personal information</Text>
            <Text style={styles.bulletPoint}>• Profile pictures</Text>
            <Text style={styles.bulletPoint}>• Prediction history</Text>
            <Text style={styles.bulletPoint}>• All other associated data</Text>
          </View>
          <Text style={styles.warningText}>
            This action cannot be undone. Please be certain before proceeding.
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Enter your password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Current password"
              secureTextEntry={!passwordVisible}
              placeholderTextColor={Colors.textLight}
            />
            <TouchableOpacity 
              style={styles.visibilityIcon} 
              onPress={() => setPasswordVisible(!passwordVisible)}
            >
              <Ionicons 
                name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} 
                size={24} 
                color={Colors.textLight} 
              />
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

          <Text style={styles.label}>Confirmation</Text>
          <Text style={styles.confirmationInstructions}>
            Please type "<Text style={styles.confirmText}>{EXPECTED_CONFIRMATION}</Text>" to confirm
          </Text>
          <View style={styles.confirmationInputContainer}>
            <TextInput
              style={[
                styles.confirmationInput,
                confirmationText.length > 0 && styles.confirmationInputActive,
                confirmationText === EXPECTED_CONFIRMATION ? styles.confirmationInputMatch : styles.confirmationInputNoMatch
              ]}
              value={confirmationText}
              onChangeText={setConfirmationText}
              placeholder={`Type "${EXPECTED_CONFIRMATION}"`}
              placeholderTextColor={Colors.textLight}
              autoCapitalize="characters" 
            />
            {confirmationText === EXPECTED_CONFIRMATION && (
              <View style={styles.confirmationCheckmark}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.error} />
              </View>
            )}
          </View>
          {errors.confirmationText ? <Text style={styles.errorText}>{errors.confirmationText}</Text> : null}
        </View>

        <TouchableOpacity
          style={[
            styles.deleteButton, 
            password.length > 0 && styles.deleteButtonActive,
            isButtonEnabled ? styles.deleteButtonMatch : styles.deleteButtonNoMatch
          ]}
          onPress={handleDeleteAccount}
          disabled={!isButtonEnabled || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons 
                name="trash-outline" 
                size={20} 
                color="#fff" 
                style={[
                  styles.buttonIcon,
                  isButtonEnabled && styles.buttonIconEnabled
                ]} 
              />
              <Text style={[
                styles.deleteButtonText,
                isButtonEnabled && styles.deleteButtonTextEnabled
              ]}>DELETE MY ACCOUNT</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
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
  scrollView: {
    padding: 16,
  },
  warningCard: {
    backgroundColor: Colors.errorLight,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.error,
    marginVertical: 8,
  },
  warningText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  bulletPoints: {
    width: '100%',
    marginVertical: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  confirmationInstructions: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  confirmText: {
    fontWeight: 'bold',
    color: Colors.error,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  confirmationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  confirmationInput: {
    flex: 1,
    backgroundColor: Colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  confirmationCheckmark: {
    position: 'absolute',
    right: 12,
  },
  confirmationInputActive: {
    borderWidth: 2,
  },
  confirmationInputNoMatch: {
    borderColor: Colors.errorLight,
    backgroundColor: 'rgba(255, 200, 200, 0.1)', // Very light red background
  },
  confirmationInputMatch: {
    borderColor: Colors.error,
    backgroundColor: 'rgba(255, 200, 200, 0.2)', // Slightly darker red background
    color: Colors.error, // Red text color
    fontWeight: 'bold',
  },
  passwordContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
  },
  visibilityIcon: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginTop: 4,
  },
  deleteButton: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deleteButtonActive: {
    borderWidth: 2,
  },
  deleteButtonNoMatch: {
    backgroundColor: 'rgba(255, 200, 200, 0.1)', // Very light red background
    borderColor: Colors.errorLight,
  },
  deleteButtonMatch: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonIconEnabled: {
    transform: [{ scale: 1.1 }],
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonTextEnabled: {
    fontWeight: 'bold',
    fontSize: 17,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  cancelButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DeleteAccountScreen; 