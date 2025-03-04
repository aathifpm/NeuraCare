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

export default function TrackScreen() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF9800', '#FF5722']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Health Tracking</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Vitals</Text>
          <View style={styles.vitalsGrid}>
            <TouchableOpacity style={styles.vitalCard}>
              <MaterialIcons name="favorite" size={24} color="#FF5722" />
              <Text style={styles.vitalValue}>72</Text>
              <Text style={styles.vitalLabel}>Heart Rate</Text>
              <Text style={styles.vitalUnit}>BPM</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.vitalCard}>
              <MaterialCommunityIcons name="thermometer" size={24} color="#FF9800" />
              <Text style={styles.vitalValue}>98.6</Text>
              <Text style={styles.vitalLabel}>Temperature</Text>
              <Text style={styles.vitalUnit}>°F</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.vitalCard}>
              <MaterialCommunityIcons name="blood-bag" size={24} color="#FF5722" />
              <Text style={styles.vitalValue}>120/80</Text>
              <Text style={styles.vitalLabel}>Blood Pressure</Text>
              <Text style={styles.vitalUnit}>mmHg</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.vitalCard}>
              <MaterialCommunityIcons name="lungs" size={24} color="#FF9800" />
              <Text style={styles.vitalValue}>98</Text>
              <Text style={styles.vitalLabel}>Oxygen</Text>
              <Text style={styles.vitalUnit}>%</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Symptom Tracking</Text>
          <TouchableOpacity style={styles.addSymptomButton}>
            <MaterialIcons name="add" size={24} color="#fff" />
            <Text style={styles.addSymptomText}>Record New Symptoms</Text>
          </TouchableOpacity>

          <View style={styles.symptomList}>
            <View style={styles.symptomItem}>
              <View style={styles.symptomHeader}>
                <MaterialIcons name="sick" size={24} color="#FF5722" />
                <Text style={styles.symptomName}>Headache</Text>
                <Text style={styles.symptomTime}>2h ago</Text>
              </View>
              <Text style={styles.symptomSeverity}>Moderate</Text>
            </View>

            <View style={styles.symptomItem}>
              <View style={styles.symptomHeader}>
                <MaterialIcons name="sick" size={24} color="#FF9800" />
                <Text style={styles.symptomName}>Fatigue</Text>
                <Text style={styles.symptomTime}>5h ago</Text>
              </View>
              <Text style={styles.symptomSeverity}>Mild</Text>
            </View>
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
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  vitalCard: {
    width: '47%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  vitalValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  vitalLabel: {
    color: '#888',
    fontSize: 14,
  },
  vitalUnit: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  addSymptomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5722',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  addSymptomText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  symptomList: {
    gap: 12,
  },
  symptomItem: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
  },
  symptomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  symptomName: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
    flex: 1,
  },
  symptomTime: {
    color: '#666',
    fontSize: 12,
  },
  symptomSeverity: {
    color: '#888',
    fontSize: 14,
    marginLeft: 32,
  },
}) 