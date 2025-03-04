import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

export default function RemindersScreen() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#9C27B0', '#673AB7']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Reminders</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Medications</Text>
            <TouchableOpacity style={styles.addButton}>
              <MaterialIcons name="add" size={24} color="#9C27B0" />
            </TouchableOpacity>
          </View>

          <View style={styles.reminderList}>
            <View style={styles.reminderItem}>
              <View style={styles.reminderTime}>
                <Text style={styles.timeText}>8:00 AM</Text>
                <Text style={styles.statusText}>Taken</Text>
              </View>
              <View style={styles.medicationInfo}>
                <MaterialCommunityIcons name="pill" size={24} color="#9C27B0" />
                <View style={styles.medicationDetails}>
                  <Text style={styles.medicationName}>Vitamin D3</Text>
                  <Text style={styles.medicationDosage}>1000 IU - 1 tablet</Text>
                </View>
                <TouchableOpacity style={styles.checkButton}>
                  <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.reminderItem}>
              <View style={styles.reminderTime}>
                <Text style={styles.timeText}>2:00 PM</Text>
                <Text style={styles.pendingText}>Pending</Text>
              </View>
              <View style={styles.medicationInfo}>
                <MaterialCommunityIcons name="pill" size={24} color="#9C27B0" />
                <View style={styles.medicationDetails}>
                  <Text style={styles.medicationName}>Multivitamin</Text>
                  <Text style={styles.medicationDosage}>1 tablet with food</Text>
                </View>
                <TouchableOpacity style={styles.checkButton}>
                  <MaterialIcons name="radio-button-unchecked" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Health Checks</Text>
            <TouchableOpacity style={styles.addButton}>
              <MaterialIcons name="add" size={24} color="#9C27B0" />
            </TouchableOpacity>
          </View>

          <View style={styles.checkupList}>
            <TouchableOpacity style={styles.checkupItem}>
              <MaterialIcons name="event" size={24} color="#9C27B0" />
              <View style={styles.checkupInfo}>
                <Text style={styles.checkupTitle}>Annual Physical</Text>
                <Text style={styles.checkupDate}>March 15, 2024 - 10:00 AM</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkupItem}>
              <MaterialIcons name="event" size={24} color="#9C27B0" />
              <View style={styles.checkupInfo}>
                <Text style={styles.checkupTitle}>Dental Checkup</Text>
                <Text style={styles.checkupDate}>April 2, 2024 - 2:30 PM</Text>
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
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderList: {
    gap: 12,
  },
  reminderItem: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
  },
  reminderTime: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  pendingText: {
    color: '#FF9800',
    fontSize: 14,
  },
  medicationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medicationDetails: {
    flex: 1,
    marginLeft: 12,
  },
  medicationName: {
    color: '#fff',
    fontSize: 16,
  },
  medicationDosage: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  checkButton: {
    padding: 4,
  },
  checkupList: {
    gap: 12,
  },
  checkupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
  },
  checkupInfo: {
    flex: 1,
    marginLeft: 12,
  },
  checkupTitle: {
    color: '#fff',
    fontSize: 16,
  },
  checkupDate: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
}) 