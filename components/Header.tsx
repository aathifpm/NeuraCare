import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native'
import React, { useState } from 'react'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'

interface HeaderProps {
  onSignOut?: () => void;
}

export default function Header({ onSignOut }: HeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const handleProfilePress = () => {
    if (showProfileMenu) {
      setShowProfileMenu(false)
    } else {
      setShowProfileMenu(true)
    }
  }

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          onPress: onSignOut,
          style: 'destructive',
        },
      ]
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        {/* App Logo and Name */}
        <View style={styles.logoSection}>
          <LinearGradient
            colors={['#4CAF50', '#2196F3']}
            style={styles.logoGradient}
          >
            <MaterialIcons name="health-and-safety" size={24} color="#fff" />
          </LinearGradient>
          <Text style={styles.appName}>NeuraCare</Text>
        </View>

        {/* Right Actions */}
        <View style={styles.actions}>
          {/* Notifications */}
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.notificationContainer}>
              <MaterialIcons name="notifications" size={24} color="#fff" />
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>2</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Profile */}
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={handleProfilePress}
          >
            <LinearGradient
              colors={['#4CAF50', '#2196F3']}
              style={styles.profileGradient}
            >
              <MaterialIcons name="person" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Menu */}
      {showProfileMenu && (
        <View style={styles.profileMenu}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleSignOut}
          >
            <MaterialIcons name="logout" size={20} color="#FF5722" />
            <Text style={styles.menuItemText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar */}
      <TouchableOpacity style={styles.searchBar}>
        <MaterialIcons name="search" size={20} color="#666" />
        <Text style={styles.searchText}>Search symptoms, medicines...</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#121212',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 16,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF5722',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchText: {
    color: '#666',
    fontSize: 14,
    flex: 1,
  },
  profileMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 66,
    right: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  menuItemText: {
    color: '#FF5722',
    fontSize: 16,
    fontWeight: '500',
  },
})
