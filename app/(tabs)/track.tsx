import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { auth, db } from '../config/firebase'
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  Timestamp,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { router } from 'expo-router'
import { createDocument, getDocument, handleFirebaseError } from '../services/firebase'

const { width } = Dimensions.get('window')

// Types
interface HealthMetric {
  id: string;
  type: string;
  value: number;
  unit: string;
  timestamp: Timestamp;
  notes?: string;
}

interface VitalData {
  value: number;
  unit: string;
  status: string;
  timestamp: Timestamp;
  goal?: number;
}

interface HealthData {
  vitals: {
    heartRate: VitalData;
    bloodPressure: VitalData;
    temperature: VitalData;
    oxygenLevel: VitalData;
  };
  metrics: HealthMetric[];
  lastUpdated?: Timestamp;
}

const defaultVitalData: VitalData = {
  value: 0,
  unit: '',
  status: 'Not Measured',
  timestamp: Timestamp.now(),
  goal: 0,
}

const defaultHealthData: HealthData = {
  vitals: {
    heartRate: { ...defaultVitalData, unit: 'BPM', goal: 70 },
    bloodPressure: { ...defaultVitalData, unit: 'mmHg', goal: 120 },
    temperature: { ...defaultVitalData, unit: '°C', goal: 36.6 },
    oxygenLevel: { ...defaultVitalData, unit: '%', goal: 98 },
  },
  metrics: [],
  lastUpdated: Timestamp.now(),
}

export default function TrackScreen() {
  const [healthData, setHealthData] = useState<HealthData>(defaultHealthData)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedVital, setSelectedVital] = useState<string | null>(null)
  const [newValue, setNewValue] = useState('')
  const [notes, setNotes] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [historyView, setHistoryView] = useState(false)
  const [metricHistory, setMetricHistory] = useState<HealthMetric[]>([])
  const [historyType, setHistoryType] = useState<string | null>(null)

  // Check authentication and load health data
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace('/LoginScreen')
        return
      }
      setUserId(user.uid)
      loadHealthData(user.uid)
    })

    return () => unsubscribeAuth()
  }, [])

  const loadHealthData = async (uid: string) => {
    try {
      const healthDocRef = doc(db, 'health_data', uid)
      const unsubscribe = onSnapshot(healthDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          try {
            const data = docSnapshot.data();
            
            // Create a safe copy of the health data with all required fields
            const safeData: HealthData = {
              vitals: {
                heartRate: {
                  value: 0,
                  unit: 'BPM',
                  status: 'Not Measured',
                  timestamp: Timestamp.now(),
                  goal: 70,
                  ...((data.vitals && data.vitals.heartRate) || {})
                },
                bloodPressure: {
                  value: 0,
                  unit: 'mmHg',
                  status: 'Not Measured',
                  timestamp: Timestamp.now(),
                  goal: 120,
                  ...((data.vitals && data.vitals.bloodPressure) || {})
                },
                temperature: {
                  value: 0,
                  unit: '°C',
                  status: 'Not Measured',
                  timestamp: Timestamp.now(),
                  goal: 36.6,
                  ...((data.vitals && data.vitals.temperature) || {})
                },
                oxygenLevel: {
                  value: 0,
                  unit: '%',
                  status: 'Not Measured',
                  timestamp: Timestamp.now(),
                  goal: 98,
                  ...((data.vitals && data.vitals.oxygenLevel) || {})
                }
              },
              metrics: data.metrics || [],
              lastUpdated: data.lastUpdated || Timestamp.now()
            };
            
            // Ensure all timestamps are valid
            Object.keys(safeData.vitals).forEach(key => {
              const vitalKey = key as keyof typeof safeData.vitals;
              if (!safeData.vitals[vitalKey].timestamp || 
                  !(safeData.vitals[vitalKey].timestamp instanceof Timestamp)) {
                safeData.vitals[vitalKey].timestamp = Timestamp.now();
              }
            });
            
            setHealthData(safeData);
          } catch (err) {
            console.error('Error parsing health data:', err);
            // If there's an error parsing the data, use default data
            setHealthData(defaultHealthData);
          }
        } else {
          // Initialize health data if it doesn't exist
          try {
            setDoc(healthDocRef, defaultHealthData)
              .catch(error => {
                console.error('Error creating health data:', error);
                Alert.alert('Error', handleFirebaseError(error));
              });
            setHealthData(defaultHealthData);
          } catch (err) {
            console.error('Error initializing health data:', err);
            Alert.alert('Error', 'Failed to initialize health data');
          }
        }
        setLoading(false);
        setRefreshing(false);
      }, (error) => {
        console.error('Error loading health data:', error);
        Alert.alert('Error', handleFirebaseError(error));
        setLoading(false);
        setRefreshing(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up health data listener:', error);
      Alert.alert('Error', handleFirebaseError(error));
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateVital = async (type: string, value: number) => {
    if (!userId) return

    try {
      setLoading(true)
      const healthDocRef = doc(db, 'health_data', userId)
      const status = getVitalStatus(type, value)
      
      // Get the current vital data or use default if it doesn't exist
      const currentVital = healthData.vitals[type as keyof typeof healthData.vitals] || 
        defaultHealthData.vitals[type as keyof typeof defaultHealthData.vitals];
      
      const newVital: VitalData = {
        value,
        unit: currentVital.unit || defaultHealthData.vitals[type as keyof typeof defaultHealthData.vitals].unit,
        status,
        timestamp: Timestamp.now(),
        goal: currentVital.goal || defaultHealthData.vitals[type as keyof typeof defaultHealthData.vitals].goal,
      }

      // First ensure the vitals object exists in Firestore
      const healthDocSnap = await getDoc(healthDocRef);
      if (!healthDocSnap.exists() || !healthDocSnap.data().vitals) {
        // Initialize the entire health data structure if it doesn't exist
        await setDoc(healthDocRef, defaultHealthData);
      }

      // Then update the specific vital
      await updateDoc(healthDocRef, {
        [`vitals.${type}`]: newVital,
        lastUpdated: serverTimestamp(),
      })

      // Add to metrics history - IMPORTANT: Don't include undefined values
      const metricRef = collection(db, 'health_data', userId, 'metrics')
      const newMetric: HealthMetric = {
        id: Date.now().toString(),
        type,
        value,
        unit: newVital.unit,
        timestamp: newVital.timestamp,
      }
      
      // Only add notes if they exist and aren't empty
      if (notes && notes.trim() !== '') {
        newMetric.notes = notes.trim();
      }

      await setDoc(doc(metricRef, newMetric.id), newMetric)
      setSelectedVital(null)
      setNewValue('')
      setNotes('')
    } catch (error) {
      console.error('Error updating vital:', error)
      Alert.alert('Error', handleFirebaseError(error))
    } finally {
      setLoading(false)
    }
  }

  const loadMetricHistory = async (type: string) => {
    if (!userId) return

    try {
      setLoading(true)
      setHistoryType(type)
      
      const metricsRef = collection(db, 'health_data', userId, 'metrics')
      const q = query(
        metricsRef,
        orderBy('timestamp', 'desc'),
        limit(10)
      )
      
      const querySnapshot = await getDocs(q)
      const metrics: HealthMetric[] = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as HealthMetric
        if (data.type === type) {
          metrics.push({
            ...data,
            id: doc.id
          })
        }
      })
      
      setMetricHistory(metrics)
      setHistoryView(true)
    } catch (error) {
      console.error('Error loading metric history:', error)
      Alert.alert('Error', handleFirebaseError(error))
    } finally {
      setLoading(false)
    }
  }

  const getVitalStatus = (type: string, value: number): string => {
    switch (type) {
      case 'heartRate':
        if (value < 60) return 'Low'
        if (value > 100) return 'High'
        return 'Normal'
      case 'bloodPressure':
        if (value < 90) return 'Low'
        if (value > 140) return 'High'
        return 'Normal'
      case 'temperature':
        if (value < 36.1) return 'Low'
        if (value > 37.2) return 'High'
        return 'Normal'
      case 'oxygenLevel':
        if (value < 95) return 'Low'
        if (value > 100) return 'Invalid'
        return 'Normal'
      default:
        return 'Unknown'
    }
  }

  const handleUpdateVital = () => {
    if (!selectedVital || !newValue) return

    const value = parseFloat(newValue)
    if (isNaN(value)) {
      Alert.alert('Error', 'Please enter a valid number')
      return
    }

    updateVital(selectedVital, value)
  }

  const onRefresh = useCallback(() => {
    if (!userId) return
    
    setRefreshing(true)
    loadHealthData(userId)
  }, [userId])

  const formatTimestamp = (timestamp: Timestamp | undefined) => {
    if (!timestamp || !(timestamp instanceof Timestamp)) {
      return 'No timestamp'
    }
    
    const date = timestamp.toDate()
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderHistoryView = () => {
    if (!historyType) return null
    
    const vitalName = historyType.replace(/([A-Z])/g, ' $1').trim()
    
    return (
      <View style={styles.historyContainer}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>{vitalName} History</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setHistoryView(false)}
          >
            <MaterialIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {metricHistory.length === 0 ? (
          <View style={styles.emptyHistory}>
            <MaterialIcons name="history" size={48} color="#666" />
            <Text style={styles.emptyHistoryText}>No history available</Text>
          </View>
        ) : (
          <ScrollView style={styles.historyList}>
            {metricHistory.map((metric) => (
              <View key={metric.id} style={styles.historyItem}>
                <View style={styles.historyItemHeader}>
                  <View style={styles.historyItemValue}>
                    <Text style={styles.historyItemValueText}>
                      {metric.value} {metric.unit}
                    </Text>
                    <Text style={[
                      styles.historyItemStatus,
                      { color: getStatusColor(getVitalStatus(historyType, metric.value)) }
                    ]}>
                      {getVitalStatus(historyType, metric.value)}
                    </Text>
                  </View>
                  <Text style={styles.historyItemDate}>
                    {formatTimestamp(metric.timestamp)}
                  </Text>
                </View>
                {metric.notes && (
                  <Text style={styles.historyItemNotes}>{metric.notes}</Text>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    )
  }

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading health data...</Text>
      </View>
    )
  }

  if (historyView) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#4CAF50', '#2196F3']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Health History</Text>
          <Text style={styles.headerSubtitle}>View your health trends</Text>
        </LinearGradient>
        
        {renderHistoryView()}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#4CAF50', '#2196F3']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Health Tracking</Text>
        <Text style={styles.headerSubtitle}>
          Monitor your vital signs
          {healthData.lastUpdated && 
            ` • Last updated: ${formatTimestamp(healthData.lastUpdated)}`
          }
        </Text>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        {/* Vitals Grid */}
        <View style={styles.vitalsGrid}>
          {Object.entries(healthData.vitals).map(([key, data]) => (
            <View key={key} style={styles.vitalCardContainer}>
              <TouchableOpacity
                style={styles.vitalCard}
                onPress={() => setSelectedVital(key)}
              >
                <MaterialCommunityIcons
                  name={getVitalIcon(key)}
                  size={24}
                  color={getStatusColor(data.status)}
                />
                <Text style={styles.vitalValue}>
                  {data.value > 0 ? data.value : '--'} {data.unit}
                </Text>
                <Text style={styles.vitalLabel}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </Text>
                <Text style={[
                  styles.vitalStatus,
                  { color: getStatusColor(data.status) }
                ]}>
                  {data.status}
                </Text>
                <Text style={styles.timestamp}>
                  {formatTimestamp(data.timestamp)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.historyButton}
                onPress={() => loadMetricHistory(key)}
              >
                <MaterialIcons name="history" size={16} color="#fff" />
                <Text style={styles.historyButtonText}>History</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Update Vital Form */}
        {selectedVital && (
          <View style={styles.updateForm}>
            <Text style={styles.updateTitle}>
              Update {selectedVital.replace(/([A-Z])/g, ' $1').trim()}
            </Text>
            <TextInput
              style={styles.input}
              value={newValue}
              onChangeText={setNewValue}
              placeholder={`Enter ${selectedVital} value`}
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes (optional)"
              placeholderTextColor="#666"
              multiline
            />
            <View style={styles.formButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setSelectedVital(null)
                  setNewValue('')
                  setNotes('')
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.updateButton]}
                onPress={handleUpdateVital}
              >
                <Text style={styles.buttonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Health Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Health Tips</Text>
          <View style={styles.tipCard}>
            <MaterialIcons name="lightbulb" size={24} color="#FFD700" />
            <Text style={styles.tipText}>
              Regular monitoring of vital signs helps detect health issues early.
              Consult your healthcare provider for personalized advice.
            </Text>
          </View>
          
          <View style={styles.tipCard}>
            <MaterialIcons name="favorite" size={24} color="#F44336" />
            <Text style={styles.tipText}>
              A normal resting heart rate for adults ranges from 60 to 100 beats per minute.
              Athletes may have lower heart rates.
            </Text>
          </View>
          
          <View style={styles.tipCard}>
            <MaterialCommunityIcons name="thermometer" size={24} color="#FF9800" />
            <Text style={styles.tipText}>
              Normal body temperature is around 36.5–37.5°C (97.7–99.5°F).
              Fever is typically defined as a temperature above 38°C (100.4°F).
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

// Helper functions
const getVitalIcon = (type: string): keyof typeof MaterialCommunityIcons.glyphMap => {
  const icons: { [key: string]: keyof typeof MaterialCommunityIcons.glyphMap } = {
    heartRate: 'heart-pulse',
    bloodPressure: 'blood-bag',
    temperature: 'thermometer',
    oxygenLevel: 'lungs',
  }
  return icons[type] || 'medical-bag'
}

const getStatusColor = (status: string): string => {
  const colors: { [key: string]: string } = {
    'Normal': '#4CAF50',
    'Low': '#FF9800',
    'High': '#F44336',
    'Invalid': '#F44336',
    'Not Measured': '#666',
    'Unknown': '#666',
  }
  return colors[status] || '#666'
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
    fontSize: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  vitalCardContainer: {
    width: (width - 44) / 2,
  },
  vitalCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  historyButton: {
    backgroundColor: '#333',
    padding: 8,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  historyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
    textAlign: 'center',
  },
  vitalStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  timestamp: {
    color: '#666',
    fontSize: 10,
    marginTop: 8,
  },
  updateForm: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  updateTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    marginBottom: 12,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#424242',
  },
  updateButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  tipsContainer: {
    marginBottom: 24,
  },
  tipsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tipCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  tipText: {
    color: '#fff',
    flex: 1,
    opacity: 0.8,
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
  historyContainer: {
    flex: 1,
    padding: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyItemValue: {
    flexDirection: 'column',
  },
  historyItemValueText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyItemStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  historyItemDate: {
    color: '#666',
    fontSize: 12,
  },
  historyItemNotes: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyHistory: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyHistoryText: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
  },
}) 