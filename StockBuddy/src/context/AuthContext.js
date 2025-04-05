import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../services/api';
import { biometricAuthService } from '../services/biometricAuth';

// Create the auth context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userToken, setUserToken] = useState(null);

  // Load token from storage on app start
  useEffect(() => {
    loadStoredToken();
  }, []);

  const loadStoredToken = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        setUserToken(token);
        const userData = await AsyncStorage.getItem('userData');
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading stored token:', error);
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiRequest('/login', 'POST', {
        email,
        password,
      });

      if (response.requiresCaptcha) {
        return { requiresCaptcha: true };
      }

      const { token, user: userData } = response;
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setUserToken(token);
      setUser(userData);
      return { success: true };
    } catch (error) {
      setError(error.message || 'Login failed. Please try again.');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      // Check if CAPTCHA is verified
      if (!userData.captchaVerified) {
        return { 
          success: false, 
          requiresCaptcha: true,
          error: 'CAPTCHA verification is required' 
        };
      }

      const response = await apiRequest('/register', 'POST', userData);
      const { token, user: newUser } = response;
      
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(newUser));
      setUserToken(token);
      setUser(newUser);
      return { success: true };
    } catch (error) {
      setError(error.message || 'Registration failed. Please try again.');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const verifyCaptcha = async (userInput) => {
    try {
      setLoading(true);
      setError(null);

      // Direct API request instead of using the custom function
      const response = await apiRequest('/verify-captcha', 'POST', {
        userInput,
      });

      return response;
    } catch (error) {
      setError(error.message || 'CAPTCHA verification failed');
      // Return failure with message, but don't perform any navigation
      return { 
        success: false, 
        message: error.message || 'CAPTCHA verification failed. Please try again.' 
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Set a flag to indicate explicit logout
      await AsyncStorage.setItem('user_logged_out', 'true');
      
      // Always remove the authentication token
      await AsyncStorage.removeItem('userToken');
      
      // Always clear the current user data
      await AsyncStorage.removeItem('userData');
      
      // Ensure state is reset even if AsyncStorage operations fail
      setUser(null);
      setUserToken(null);
      
      // Log success
      console.log('User logged out successfully');
      
      return { success: true };
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Even if there's an error with AsyncStorage, ensure user is logged out in state
      setUser(null);
      setUserToken(null);
      
      setError('Error during logout process, but session ended');
      return { success: true, warning: error.message };
    }
  };

  // Upload avatar function
  const uploadAvatar = async (imageUri) => {
    try {
      setLoading(true);
      setError(null);

      // Create form data with the image
      const formData = new FormData();
      // Extract filename and type
      const uriParts = imageUri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      
      // Append the image with a simpler format
      formData.append('image', {
        uri: imageUri,
        name: `profile-photo.${fileType}`,
        type: `image/${fileType}`
      });

      console.log('Uploading avatar image:', `profile-photo.${fileType}`);

      // Use fetch directly to handle FormData - no Content-Type header
      const response = await fetch(`http://192.168.191.238:5000/api/profile/upload-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        },
        body: formData
      });

      const responseData = await response.json();
      console.log('Upload response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || 'Upload failed');
      }

      // Update user data with new profile picture
      if (responseData.success && responseData.user) {
        await AsyncStorage.setItem('userData', JSON.stringify(responseData.user));
        setUser(responseData.user);
      }

      return responseData;
    } catch (error) {
      console.error('Avatar upload error:', error);
      setError(error.message || 'Avatar upload failed');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Delete avatar function
  const deleteAvatar = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiRequest('/profile/profile-picture', 'DELETE', null, true);
      
      if (response.success && response.user) {
        await AsyncStorage.setItem('userData', JSON.stringify(response.user));
        setUser(response.user);
      }

      return response;
    } catch (error) {
      setError(error.message || 'Failed to delete avatar');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Add a new method to handle biometric auth status
  const checkBiometricEnabled = async () => {
    try {
      return await biometricAuthService.isBiometricEnabled();
    } catch (error) {
      console.error('Error checking biometric status:', error);
      return false;
    }
  };

  // Add a method to enable biometric auth
  const enableBiometric = async () => {
    try {
      const result = await biometricAuthService.enableBiometric();
      return result;
    } catch (error) {
      console.error('Error enabling biometric:', error);
      return { success: false, error: error.message };
    }
  };

  // Add a method to disable biometric auth
  const disableBiometric = async () => {
    try {
      const result = await biometricAuthService.disableBiometric();
      return result;
    } catch (error) {
      console.error('Error disabling biometric:', error);
      return { success: false, error: error.message };
    }
  };

  // Add a method to authenticate with biometric
  const authenticateWithBiometric = async () => {
    try {
      const result = await biometricAuthService.authenticate();
      if (!result.success) {
        return result;
      }

      // Get stored credentials
      const storedCredentials = await AsyncStorage.getItem('stored_credentials');
      if (!storedCredentials) {
        return { success: false, error: 'No stored credentials found' };
      }

      const { email, password } = JSON.parse(storedCredentials);
      const loginResult = await login(email, password);
      return loginResult;
    } catch (error) {
      console.error('Error during biometric authentication:', error);
      return { success: false, error: error.message };
    }
  };

  // Add delete account function if it doesn't exist
  const deleteAccount = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiRequest('/delete-account', 'DELETE');
      
      if (response.success) {
        // Clear all stored data
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
        await AsyncStorage.removeItem('stored_credentials');
        await AsyncStorage.removeItem('biometric_auth_enabled');
        setUser(null);
        setUserToken(null);
        return { success: true };
      } else {
        throw new Error(response.message || 'Failed to delete account');
      }
    } catch (error) {
      setError(error.message || 'Error deleting account. Please try again.');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Change password function
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiRequest('/change-password', 'POST', {
        currentPassword,
        newPassword,
      }, true);
      
      if (response.success) {
        return { success: true, message: 'Password changed successfully' };
      } else {
        throw new Error(response.message || 'Failed to change password');
      }
    } catch (error) {
      setError(error.message || 'Error changing password. Please try again.');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    userToken,
    loading,
    error,
    login,
    register,
    logout,
    verifyCaptcha,
    checkBiometricEnabled,
    enableBiometric,
    disableBiometric,
    authenticateWithBiometric,
    deleteAccount,
    changePassword,
    uploadAvatar,
    deleteAvatar,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 