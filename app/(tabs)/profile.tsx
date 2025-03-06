import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
} from 'react-native'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { auth, db } from '../config/firebase'
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { 
  updateProfile, 
  updateEmail, 
  updatePassword, 
  reauthenticateWithCredential,
  EmailAuthProvider,
  User,
  signOut
} from 'firebase/auth'
import { router } from 'expo-router'
import { handleFirebaseError } from '../services/firebase'
import * as ImagePicker from 'expo-image-picker'

// Types
interface UserProfile {
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth?: string;
  gender?: string;
  height?: number;
  weight?: number;
  bloodType?: string;
  allergies?: string[];
  conditions?: string[];
  emergencyContact?: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  profilePicture?: string;
  lastUpdated?: Timestamp;
}

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  
  // Form states
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [allergies, setAllergies] = useState('')
  const [conditions, setConditions] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyRelationship, setEmergencyRelationship] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Load user profile
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        router.replace('/LoginScreen')
        return
      }
      
      setUser(currentUser)
      await loadUserProfile(currentUser.uid)
    })
    
    return () => unsubscribe()
  }, [])

  const loadUserProfile = async (uid: string) => {
    try {
      setLoading(true)
      const userDocRef = doc(db, 'users', uid)
      const userDoc = await getDoc(userDocRef)
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile
        setProfile(userData)
        
        // Set form states
        setFullName(userData.fullName || '')
        setEmail(userData.email || '')
        setPhoneNumber(userData.phoneNumber || '')
        setDateOfBirth(userData.dateOfBirth || '')
        setGender(userData.gender || '')
        setHeight(userData.height?.toString() || '')
        setWeight(userData.weight?.toString() || '')
        setBloodType(userData.bloodType || '')
        setAllergies(userData.allergies?.join(', ') || '')
        setConditions(userData.conditions?.join(', ') || '')
        
        if (userData.emergencyContact) {
          setEmergencyName(userData.emergencyContact.name || '')
          setEmergencyRelationship(userData.emergencyContact.relationship || '')
          setEmergencyPhone(userData.emergencyContact.phoneNumber || '')
        }
      } else {
        // Create default profile if it doesn't exist
        const defaultProfile: UserProfile = {
          fullName: user?.displayName || '',
          email: user?.email || '',
          phoneNumber: '',
        }
        
        setProfile(defaultProfile)
        setFullName(defaultProfile.fullName)
        setEmail(defaultProfile.email)
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
      Alert.alert('Error', handleFirebaseError(error))
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    
    try {
      setSaving(true)
      
      // Validate required fields
      if (!fullName.trim()) {
        Alert.alert('Error', 'Please enter your full name')
        setSaving(false)
        return
      }
      
      // Prepare profile data
      const updatedProfile: Record<string, any> = {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        lastUpdated: serverTimestamp(),
      }
      
      // Add optional fields if they have values
      if (dateOfBirth) updatedProfile.dateOfBirth = dateOfBirth
      if (gender) updatedProfile.gender = gender
      if (height) updatedProfile.height = parseFloat(height)
      if (weight) updatedProfile.weight = parseFloat(weight)
      if (bloodType) updatedProfile.bloodType = bloodType
      
      if (allergies.trim()) {
        updatedProfile.allergies = allergies.split(',').map(item => item.trim())
      }
      
      if (conditions.trim()) {
        updatedProfile.conditions = conditions.split(',').map(item => item.trim())
      }
      
      if (emergencyName.trim() && emergencyPhone.trim()) {
        updatedProfile.emergencyContact = {
          name: emergencyName.trim(),
          relationship: emergencyRelationship.trim(),
          phoneNumber: emergencyPhone.trim(),
        }
      }
      
      // Update email if changed
      if (email.trim() !== user.email && email.trim()) {
        try {
          await updateEmail(user, email.trim())
          updatedProfile.email = email.trim()
        } catch (error) {
          console.error('Error updating email:', error)
          Alert.alert('Error', 'Failed to update email. You may need to reauthenticate.')
        }
      }
      
      // Update profile in Firestore
      const userDocRef = doc(db, 'users', user.uid)
      await updateDoc(userDocRef, updatedProfile)
      
      // Update display name in Firebase Auth
      await updateProfile(user, {
        displayName: fullName.trim(),
      })
      
      Alert.alert('Success', 'Profile updated successfully')
      setEditMode(false)
      await loadUserProfile(user.uid)
    } catch (error) {
      console.error('Error saving profile:', error)
      Alert.alert('Error', handleFirebaseError(error))
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!user || !user.email) return
    
    try {
      // Validate passwords
      if (!currentPassword) {
        Alert.alert('Error', 'Please enter your current password')
        return
      }
      
      if (!newPassword) {
        Alert.alert('Error', 'Please enter a new password')
        return
      }
      
      if (newPassword !== confirmPassword) {
        Alert.alert('Error', 'New passwords do not match')
        return
      }
      
      if (newPassword.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters')
        return
      }
      
      // Reauthenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)
      
      // Update password
      await updatePassword(user, newPassword)
      
      Alert.alert('Success', 'Password updated successfully')
      setPasswordModalVisible(false)
      resetPasswordForm()
    } catch (error) {
      console.error('Error changing password:', error)
      Alert.alert('Error', handleFirebaseError(error))
    }
  }

  const resetPasswordForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handlePickImage = async () => {
    if (!user) return
    
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'You need to grant permission to access your photos')
        return
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      })
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri
        
        // In a real app, you would upload this to Firebase Storage
        // For now, we'll just update the profile with the URI
        const userDocRef = doc(db, 'users', user.uid)
        await updateDoc(userDocRef, {
          profilePicture: imageUri,
        })
        
        // Update local state
        setProfile(prev => prev ? {...prev, profilePicture: imageUri} : null)
        
        // Update Firebase Auth profile
        await updateProfile(user, {
          photoURL: imageUri,
        })
      }
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert('Error', 'Failed to update profile picture')
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      router.replace('/LoginScreen')
    } catch (error) {
      console.error('Error signing out:', error)
      Alert.alert('Error', 'Failed to sign out')
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <LinearGradient
        colors={['#4CAF50', '#2196F3']}
        style={styles.header}
      >
        <View style={styles.profileHeader}>
          <TouchableOpacity 
            style={styles.profileImageContainer}
            onPress={handlePickImage}
          >
            {profile?.profilePicture ? (
              <Image 
                source={{ uri: profile.profilePicture }} 
                style={styles.profileImage} 
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <MaterialIcons name="person" size={40} color="#fff" />
              </View>
            )}
            <View style={styles.editImageButton}>
              <MaterialIcons name="edit" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.fullName || 'User'}</Text>
            <Text style={styles.profileEmail}>{profile?.email || ''}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Edit/Save Buttons */}
        <View style={styles.actionButtons}>
          {editMode ? (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  setEditMode(false)
                  loadUserProfile(user?.uid || '')
                }}
              >
                <MaterialIcons name="close" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.passwordButton]}
                onPress={() => setPasswordModalVisible(true)}
              >
                <MaterialIcons name="lock" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Change Password</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.editButton]}
                onPress={() => setEditMode(true)}
              >
                <MaterialIcons name="edit" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Profile Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor="#666"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.fullName || 'Not set'}</Text>
            )}
          </View>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Email</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#666"
                keyboardType="email-address"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.email || 'Not set'}</Text>
            )}
          </View>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter your phone number"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.phoneNumber || 'Not set'}</Text>
            )}
          </View>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Date of Birth</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#666"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.dateOfBirth || 'Not set'}</Text>
            )}
          </View>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Gender</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={gender}
                onChangeText={setGender}
                placeholder="Enter your gender"
                placeholderTextColor="#666"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.gender || 'Not set'}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Information</Text>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Height (cm)</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                placeholder="Enter your height"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.height || 'Not set'}</Text>
            )}
          </View>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Weight (kg)</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="Enter your weight"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.weight || 'Not set'}</Text>
            )}
          </View>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Blood Type</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={bloodType}
                onChangeText={setBloodType}
                placeholder="Enter your blood type"
                placeholderTextColor="#666"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.bloodType || 'Not set'}</Text>
            )}
          </View>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Allergies</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={allergies}
                onChangeText={setAllergies}
                placeholder="Enter allergies (comma separated)"
                placeholderTextColor="#666"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {profile?.allergies?.join(', ') || 'None'}
              </Text>
            )}
          </View>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Medical Conditions</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={conditions}
                onChangeText={setConditions}
                placeholder="Enter conditions (comma separated)"
                placeholderTextColor="#666"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {profile?.conditions?.join(', ') || 'None'}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Name</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={emergencyName}
                onChangeText={setEmergencyName}
                placeholder="Enter contact name"
                placeholderTextColor="#666"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {profile?.emergencyContact?.name || 'Not set'}
              </Text>
            )}
          </View>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Relationship</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={emergencyRelationship}
                onChangeText={setEmergencyRelationship}
                placeholder="Enter relationship"
                placeholderTextColor="#666"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {profile?.emergencyContact?.relationship || 'Not set'}
              </Text>
            )}
          </View>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={emergencyPhone}
                onChangeText={setEmergencyPhone}
                placeholder="Enter phone number"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {profile?.emergencyContact?.phoneNumber || 'Not set'}
              </Text>
            )}
          </View>
        </View>
        
        {/* Sign Out Button */}
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <MaterialIcons name="logout" size={20} color="#fff" />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Change Password Modal */}
      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setPasswordModalVisible(false)
                  resetPasswordForm()
                }}
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.passwordField}>
                <MaterialIcons name="lock" size={20} color="#4CAF50" style={styles.inputIcon} />
                <TextInput
                  style={styles.passwordInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Current Password"
                  placeholderTextColor="#666"
                  secureTextEntry
                />
              </View>
              
              <View style={styles.passwordField}>
                <MaterialIcons name="lock-outline" size={20} color="#4CAF50" style={styles.inputIcon} />
                <TextInput
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New Password"
                  placeholderTextColor="#666"
                  secureTextEntry
                />
              </View>
              
              <View style={styles.passwordField}>
                <MaterialIcons name="lock-outline" size={20} color="#4CAF50" style={styles.inputIcon} />
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm New Password"
                  placeholderTextColor="#666"
                  secureTextEntry
                />
              </View>
              
              <TouchableOpacity
                style={styles.changePasswordButton}
                onPress={handleChangePassword}
              >
                <Text style={styles.changePasswordButtonText}>Update Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileEmail: {
    color: '#fff',
    opacity: 0.8,
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  passwordButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  section: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
  },
  fieldValue: {
    color: '#fff',
    fontSize: 16,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
  },
  signOutButton: {
    backgroundColor: '#F44336',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  signOutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  passwordField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    color: '#fff',
  },
  changePasswordButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  changePasswordButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
}) 