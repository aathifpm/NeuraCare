import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2196F3', '#4CAF50']}
        style={styles.header}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://i.pravatar.cc/150' }}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.editAvatarButton}>
              <MaterialIcons name="edit" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>Aathif PM</Text>
          <Text style={styles.userEmail}>aathifpm@gmail.com</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoList}>
            <TouchableOpacity style={styles.infoItem}>
              <MaterialIcons name="person" size={24} color="#2196F3" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Age</Text>
                <Text style={styles.infoValue}>20 years</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.infoItem}>
              <MaterialIcons name="height" size={24} color="#2196F3" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Height</Text>
                <Text style={styles.infoValue}>185 cm</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.infoItem}>
              <MaterialIcons name="monitor-weight" size={24} color="#2196F3" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Weight</Text>
                <Text style={styles.infoValue}>70 kg</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Information</Text>
          <View style={styles.infoList}>
            <TouchableOpacity style={styles.infoItem}>
              <MaterialIcons name="local-hospital" size={24} color="#2196F3" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Blood Type</Text>
                <Text style={styles.infoValue}>O+</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.infoItem}>
              <MaterialIcons name="warning" size={24} color="#2196F3" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Allergies</Text>
                <Text style={styles.infoValue}>None</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <View style={styles.infoList}>
            <TouchableOpacity style={styles.infoItem}>
              <MaterialIcons name="notifications" size={24} color="#2196F3" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Notifications</Text>
                <Text style={styles.infoValue}>Enabled</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.infoItem}>
              <MaterialIcons name="security" size={24} color="#2196F3" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Privacy Settings</Text>
                <Text style={styles.infoValue}>Manage</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.infoItem}>
              <MaterialIcons name="help" size={24} color="#2196F3" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Help & Support</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
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
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    color: '#888',
    fontSize: 14,
  },
  infoValue: {
    color: '#fff',
    fontSize: 16,
    marginTop: 4,
  },
}) 