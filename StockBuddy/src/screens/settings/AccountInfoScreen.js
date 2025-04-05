import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import Colors from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import * as ImagePicker from 'expo-image-picker';

const AccountInfoScreen = ({ navigation }) => {
  const { user, uploadAvatar, deleteAvatar } = useAuth();
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    avatar: '',
    countryCode: '',
    address: '',
    dateOfBirth: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  // Keep track of this screen instance to avoid unmounting
  const isScreenMounted = useRef(true);

  // Method to get user's initial for fallback avatar
  const getInitial = () => {
    if (userInfo.name && userInfo.name.length > 0) {
      return userInfo.name.charAt(0).toUpperCase();
    }
    return 'U'; // Default initial if no name available
  };

  useEffect(() => {
    // Set flag when component mounts
    isScreenMounted.current = true;
    
    // Set up a listener to prevent navigation reset
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // If this is a profile update and not a back button press, prevent navigation
      if (e.data.action.type === 'GO_BACK' && isLoading) {
        e.preventDefault();
      }
    });

    return () => {
      // Clean up listener and flag
      unsubscribe();
      isScreenMounted.current = false;
    };
  }, [navigation, isLoading]);

  useEffect(() => {
    if (user && isScreenMounted.current) {
      setUserInfo({
        name: user.name || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        avatar: user.profilePicture || '',
        countryCode: user.countryCode || '',
        address: user.address || '',
        dateOfBirth: user.dateOfBirth || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const result = await apiRequest('/profile', 'PUT', {
        name: userInfo.name,
        phoneNumber: userInfo.phoneNumber,
        address: userInfo.address,
        countryCode: userInfo.countryCode
      }, true);
      
      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      if (isScreenMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const handleSelectProfilePicture = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Please grant permission to access photos');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        if (!isScreenMounted.current) return;
        setIsLoading(true);
        console.log('Selected image:', result.assets[0].uri);
        
        // Show temporary local image preview immediately
        setUserInfo(prev => ({...prev, avatar: result.assets[0].uri}));
        
        const uploadResult = await uploadAvatar(result.assets[0].uri);
        console.log('Upload result:', uploadResult);
        
        if (uploadResult.success) {
          if (!isScreenMounted.current) return;
          // Update just the avatar URL when upload succeeds
          setUserInfo(prev => ({...prev, avatar: uploadResult.profilePicture || uploadResult.user?.profilePicture || prev.avatar}));
          Alert.alert('Success', 'Profile picture updated successfully');
        } else {
          const errorMsg = uploadResult.error || uploadResult.message || 'Failed to upload profile picture';
          console.error('Upload error:', errorMsg);
          Alert.alert('Error', errorMsg);
        }
      }
    } catch (error) {
      console.error('Error handling profile picture:', error);
      Alert.alert('Error', error.message || 'Failed to process profile picture');
    } finally {
      if (isScreenMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const handleRemoveProfilePicture = async () => {
    try {
      if (!isScreenMounted.current) return;
      setIsLoading(true);
      
      // Clear avatar immediately for responsive UI
      setUserInfo(prev => ({...prev, avatar: ''}));
      setModalVisible(false);
      
      const result = await deleteAvatar();
      
      if (result.success) {
        Alert.alert('Success', 'Profile picture removed successfully');
      } else {
        // If deletion fails, revert to original avatar
        if (user?.profilePicture && isScreenMounted.current) {
          setUserInfo(prev => ({...prev, avatar: user.profilePicture}));
        }
        Alert.alert('Error', result.error || 'Failed to remove profile picture');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to remove profile picture');
      // If deletion fails, revert to original avatar
      if (user?.profilePicture && isScreenMounted.current) {
        setUserInfo(prev => ({...prev, avatar: user.profilePicture}));
      }
    } finally {
      if (isScreenMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const openImageOptions = () => {
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Account Information" 
        showBackButton={true}
        onBackPress={() => {
          if (!isLoading) {
            navigation.goBack();
          }
        }}
      />

      {/* Photo options modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Profile Picture</Text>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => {
                setModalVisible(false);
                handleSelectProfilePicture();
              }}
            >
              <Ionicons name="image-outline" size={24} color={Colors.primary} />
              <Text style={styles.modalOptionText}>Choose from Library</Text>
            </TouchableOpacity>
            
            {userInfo.avatar ? (
              <TouchableOpacity 
                style={styles.modalOption}
                onPress={handleRemoveProfilePicture}
              >
                <Ionicons name="trash-outline" size={24} color={Colors.danger} />
                <Text style={[styles.modalOptionText, {color: Colors.danger}]}>Remove Current Photo</Text>
              </TouchableOpacity>
            ) : null}
            
            <TouchableOpacity 
              style={[styles.modalOption, styles.cancelOption]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={openImageOptions}>
            {userInfo.avatar ? (
              <Image 
                source={{ uri: userInfo.avatar }} 
                style={styles.avatar}
                onError={() => {
                  // If image fails to load, clear avatar URL
                  if (isScreenMounted.current) {
                    setUserInfo(prev => ({...prev, avatar: ''}));
                  }
                }} 
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{getInitial()}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.changePhotoButton}
            onPress={openImageOptions}
          >
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={userInfo.name}
              onChangeText={(text) => setUserInfo({ ...userInfo, name: text })}
              placeholder="Enter your full name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={userInfo.email}
              editable={false}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={userInfo.phoneNumber}
              onChangeText={(text) => setUserInfo({ ...userInfo, phoneNumber: text })}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={userInfo.address}
              onChangeText={(text) => setUserInfo({ ...userInfo, address: text })}
              placeholder="Enter your address"
              multiline
            />
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, isLoading && styles.disabledButton]} 
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Security</Text>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('ChangePassword')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="lock-closed" size={24} color={Colors.primary} />
              <Text style={styles.menuItemText}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.darkGray} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
              <Text style={styles.menuItemText}>Two-Factor Authentication</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.darkGray} />
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
  avatarContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gray,
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: Colors.white,
    fontSize: 40,
    fontWeight: 'bold',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  changePhotoButton: {
    marginTop: 10,
  },
  changePhotoText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: Colors.darkGray,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.secondary,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
  disabledInput: {
    backgroundColor: Colors.lightGray,
    color: Colors.darkGray,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.secondary,
    marginBottom: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.secondary,
    marginLeft: 15,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.secondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  modalOptionText: {
    fontSize: 16,
    color: Colors.secondary,
    marginLeft: 15,
  },
  cancelOption: {
    justifyContent: 'center',
    marginTop: 10,
    borderBottomWidth: 0,
  },
  cancelText: {
    fontSize: 16,
    color: Colors.darkGray,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default AccountInfoScreen; 