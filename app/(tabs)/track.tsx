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

// Updated types and interfaces
type VitalType = string;

interface VitalConfig {
  unit: string;
  goal: number;
  type: 'number' | 'string';
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  ranges: {
    low?: number;
    high?: number;
    optimal?: number;
  };
}

interface VitalData {
  value: number | string;
  unit: string;
  status: string;
  timestamp: Timestamp;
  goal?: number;
  type: 'number' | 'string';
}

interface HealthMetric {
  id: string;
  type: string;
  value: number | string;
  unit: string;
  timestamp: Timestamp;
  notes?: string;
}

interface HealthData {
  vitals: {
    [key: string]: VitalData;
  };
  vitalConfigs: {
    [key: string]: VitalConfig;
  };
  metrics: HealthMetric[];
  lastUpdated?: Timestamp;
}

const defaultVitalConfigs: { [key: string]: VitalConfig } = {
  heartRate: {
    unit: 'BPM',
    goal: 70,
    type: 'number',
    icon: 'heart-pulse',
    color: '#FF5722',
    ranges: { low: 60, high: 100, optimal: 80 }
  },
  bloodPressure: {
    unit: 'mmHg',
    goal: 120,
    type: 'string',
    icon: 'blood-bag',
    color: '#F44336',
    ranges: { low: 90, high: 140, optimal: 120 }
  },
  temperature: {
    unit: '°C',
    goal: 36.6,
    type: 'number',
    icon: 'thermometer',
    color: '#FF9800',
    ranges: { low: 36.1, high: 37.2, optimal: 36.6 }
  },
  oxygenLevel: {
    unit: '%',
    goal: 98,
    type: 'number',
    icon: 'lungs',
    color: '#E91E63',
    ranges: { low: 95, high: 100, optimal: 98 }
  }
};

const defaultVitalData: VitalData = {
  value: 0,
  unit: '',
  status: 'Not Measured',
  timestamp: Timestamp.now(),
  goal: 0,
  type: 'number'
};

const defaultHealthData: HealthData = {
  vitals: Object.keys(defaultVitalConfigs).reduce((acc, key) => ({
    ...acc,
    [key]: {
      ...defaultVitalData,
      unit: defaultVitalConfigs[key].unit,
      goal: defaultVitalConfigs[key].goal,
      type: defaultVitalConfigs[key].type
    }
  }), {}),
  vitalConfigs: defaultVitalConfigs,
  metrics: [],
  lastUpdated: Timestamp.now()
};

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
  const [isAddingNewVital, setIsAddingNewVital] = useState(false)
  const [newVitalName, setNewVitalName] = useState('')
  const [newVitalUnit, setNewVitalUnit] = useState('')
  const [newVitalGoal, setNewVitalGoal] = useState('')
  const [newVitalType, setNewVitalType] = useState<'number' | 'string'>('number')

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
      const healthDocRef = doc(db, 'health_data', uid);
      const unsubscribe = onSnapshot(healthDocRef, async (docSnapshot) => {
        if (docSnapshot.exists()) {
          try {
            const data = docSnapshot.data();
            
            // Create a safe copy of the health data with all required fields
            const safeData: HealthData = {
              vitals: data.vitals || {},
              vitalConfigs: {
                ...defaultVitalConfigs,  // Always include default configs
                ...(data.vitalConfigs || {})  // Merge with any custom configs
              },
              metrics: data.metrics || [],
              lastUpdated: data.lastUpdated || Timestamp.now()
            };
            
            // Ensure all timestamps are valid
            Object.keys(safeData.vitals).forEach(key => {
              if (!safeData.vitals[key].timestamp || 
                  !(safeData.vitals[key].timestamp instanceof Timestamp)) {
                safeData.vitals[key].timestamp = Timestamp.now();
              }
              
              // Ensure each vital has a corresponding config
              if (!safeData.vitalConfigs[key]) {
                safeData.vitalConfigs[key] = {
                  unit: safeData.vitals[key].unit || '',
                  goal: safeData.vitals[key].goal || 0,
                  type: safeData.vitals[key].type || 'number',
                  icon: 'medical-bag',
                  color: '#666',
                  ranges: {
                    low: 0,
                    high: 100,
                    optimal: 50
                  }
                };
              }
            });
            
            setHealthData(safeData);
          } catch (err) {
            console.error('Error parsing health data:', err);
            setHealthData(defaultHealthData);
          }
        } else {
          try {
            await setDoc(healthDocRef, defaultHealthData);
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

  const updateVital = async (type: string, value: number | string) => {
    if (!userId) return;

    try {
      setLoading(true);
      const healthDocRef = doc(db, 'health_data', userId);
      const status = getVitalStatus(type, value);
      
      // Get the current vital config or create a default one
      const vitalConfig = healthData.vitalConfigs[type] || {
        unit: '',
        goal: 0,
        type: typeof value === 'number' ? 'number' : 'string',
        icon: 'medical-bag',
        color: '#666',
        ranges: { low: 0, high: 100, optimal: 50 }
      };
      
      // Create the new vital data
      const newVital: VitalData = {
        value,
        unit: vitalConfig.unit,
        status,
        timestamp: Timestamp.now(),
        goal: vitalConfig.goal,
        type: vitalConfig.type
      };

      // First ensure the vitals object exists in Firestore
      const healthDocSnap = await getDoc(healthDocRef);
      if (!healthDocSnap.exists()) {
        await setDoc(healthDocRef, {
          vitals: {},
          vitalConfigs: defaultVitalConfigs,
          metrics: [],
          lastUpdated: serverTimestamp()
        });
      }

      // Then update the specific vital and its config
      await updateDoc(healthDocRef, {
        [`vitals.${type}`]: newVital,
        [`vitalConfigs.${type}`]: vitalConfig,
        lastUpdated: serverTimestamp()
      });

      // Add to metrics history
      const metricRef = collection(db, 'health_data', userId, 'metrics');
      const newMetric: HealthMetric = {
        id: Date.now().toString(),
        type,
        value,
        unit: vitalConfig.unit,
        timestamp: newVital.timestamp
      };
      
      if (notes && notes.trim() !== '') {
        newMetric.notes = notes.trim();
      }

      await setDoc(doc(metricRef, newMetric.id), newMetric);
      setSelectedVital(null);
      setNewValue('');
      setNotes('');
    } catch (error) {
      console.error('Error updating vital:', error);
      Alert.alert('Error', handleFirebaseError(error));
    } finally {
      setLoading(false);
    }
  };

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

  const getVitalStatus = (type: string, value: number | string): string => {
    const vitalConfig = healthData.vitalConfigs[type];
    if (!vitalConfig) return 'Unknown';

    const { ranges } = vitalConfig;
    if (typeof value === 'string') {
      // Handle string values (like blood pressure "120/80")
      try {
        if (type === 'bloodPressure') {
          const [systolic] = value.split('/').map(Number);
          if (isNaN(systolic)) return 'Unknown';
          if (ranges.low && systolic < ranges.low) return 'Low';
          if (ranges.high && systolic > ranges.high) return 'High';
          if (ranges.optimal && Math.abs(systolic - ranges.optimal) < 0.1) return 'Optimal';
        }
        return 'Unknown';
      } catch {
        return 'Unknown';
      }
    } else if (typeof value === 'number') {
      // Handle numeric values
      if (ranges.low && value < ranges.low) return 'Low';
      if (ranges.high && value > ranges.high) return 'High';
      if (ranges.optimal && Math.abs(value - ranges.optimal) < 0.1) return 'Optimal';
      return 'Normal';
    }

    return 'Unknown';
  };

  const handleUpdateVital = () => {
    if (!selectedVital || !newValue) return;

    const vitalConfig = healthData.vitalConfigs[selectedVital];
    if (!vitalConfig) return;

    if (vitalConfig.type === 'number') {
      const value = parseFloat(newValue);
    if (isNaN(value)) {
        Alert.alert('Error', 'Please enter a valid number');
        return;
    }
      updateVital(selectedVital, value);
    } else {
      updateVital(selectedVital, newValue);
  }
  };

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

  // Add new vital type
  const handleAddNewVital = async () => {
    if (!userId || !newVitalName || !newVitalUnit || !newVitalGoal) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const vitalKey = newVitalName.replace(/\s+/g, '');
      
      const newVitalConfig: VitalConfig = {
        unit: newVitalUnit,
        goal: Number(newVitalGoal),
        type: newVitalType,
        icon: 'medical-bag', // Default icon
        color: '#666', // Default color
        ranges: {
          low: Number(newVitalGoal) * 0.8,
          high: Number(newVitalGoal) * 1.2,
          optimal: Number(newVitalGoal)
        }
      };

      const newVital: VitalData = {
        value: 0,
        unit: newVitalUnit,
        status: 'Not Measured',
        timestamp: Timestamp.now(),
        goal: Number(newVitalGoal),
        type: newVitalType
      };

      const healthDocRef = doc(db, 'health_data', userId);
      await updateDoc(healthDocRef, {
        [`vitals.${vitalKey}`]: newVital,
        [`vitalConfigs.${vitalKey}`]: newVitalConfig,
        lastUpdated: serverTimestamp()
      });

      setIsAddingNewVital(false);
      setNewVitalName('');
      setNewVitalUnit('');
      setNewVitalGoal('');
      setNewVitalType('number');
    } catch (error) {
      console.error('Error adding new vital:', error);
      Alert.alert('Error', handleFirebaseError(error));
    } finally {
      setLoading(false);
    }
  };

  const renderVitalValue = (value: number | string, unit: string): string => {
    if (typeof value === 'number') {
      return value > 0 ? `${value} ${unit}` : `-- ${unit}`;
    }
    return value ? `${value} ${unit}` : `-- ${unit}`;
  };

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
      <View style={styles.headerWrapper}>
      <LinearGradient
          colors={['#00BFFF', '#1E90FF', '#4169E1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerBorder}
        />
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.logoSection}>
              <LinearGradient
                colors={['#00BFFF', '#1E90FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <MaterialIcons name="track-changes" size={24} color="#fff" />
              </LinearGradient>
        <Text style={styles.headerTitle}>Health Tracking</Text>
            </View>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={onRefresh}
            >
              <MaterialIcons name="refresh" size={24} color="#00BFFF" />
            </TouchableOpacity>
          </View>
        <Text style={styles.headerSubtitle}>
          Monitor your vital signs
          {healthData.lastUpdated && 
            ` • Last updated: ${formatTimestamp(healthData.lastUpdated)}`
          }
        </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#00BFFF']}
            tintColor="#00BFFF"
          />
        }
      >
        {/* Add New Vital Button */}
        <TouchableOpacity
          style={styles.addVitalButton}
          onPress={() => setIsAddingNewVital(true)}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
          <Text style={styles.addVitalButtonText}>Add New Vital</Text>
        </TouchableOpacity>

        {/* Add New Vital Form */}
        {isAddingNewVital && (
          <View style={styles.updateForm}>
            <Text style={styles.updateTitle}>Add New Vital Type</Text>
            <TextInput
              style={styles.input}
              value={newVitalName}
              onChangeText={setNewVitalName}
              placeholder="Vital Name (e.g., Blood Sugar)"
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.input}
              value={newVitalUnit}
              onChangeText={setNewVitalUnit}
              placeholder="Unit (e.g., mg/dL)"
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.input}
              value={newVitalGoal}
              onChangeText={setNewVitalGoal}
              placeholder="Target/Goal Value"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newVitalType === 'number' && styles.typeButtonSelected
                ]}
                onPress={() => setNewVitalType('number')}
              >
                <Text style={styles.typeButtonText}>Number</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newVitalType === 'string' && styles.typeButtonSelected
                ]}
                onPress={() => setNewVitalType('string')}
              >
                <Text style={styles.typeButtonText}>Text</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.formButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setIsAddingNewVital(false);
                  setNewVitalName('');
                  setNewVitalUnit('');
                  setNewVitalGoal('');
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.updateButton]}
                onPress={handleAddNewVital}
              >
                <Text style={styles.buttonText}>Add Vital</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Vitals Grid */}
        <View style={styles.vitalsGrid}>
          {Object.entries(healthData.vitals).map(([key, data]) => {
            const vitalConfig = healthData.vitalConfigs[key] || {
              icon: 'medical-bag',
              color: '#666',
              unit: data.unit,
              type: data.type,
              goal: data.goal,
              ranges: { low: 0, high: 100, optimal: 50 }
            };

            return (
            <View key={key} style={styles.vitalCardContainer}>
              <TouchableOpacity
                style={styles.vitalCard}
                onPress={() => setSelectedVital(key)}
              >
                <MaterialCommunityIcons
                    name={(vitalConfig.icon || 'medical-bag') as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={24}
                  color={getStatusColor(data.status)}
                />
                <Text style={styles.vitalValue}>
                    {renderVitalValue(data.value, data.unit)}
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
            );
          })}
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
    'Optimal': '#4CAF50'
  };
  return colors[status] || '#666';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  headerWrapper: {
    position: 'relative',
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
  },
  headerBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 130 : 110,
    opacity: 0.2,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    zIndex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 191, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00BFFF',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: 'rgba(0, 191, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00BFFF',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  historyButton: {
    backgroundColor: 'rgba(0, 191, 255, 0.1)',
    padding: 8,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#00BFFF',
    borderTopWidth: 0,
  },
  historyButtonText: {
    color: '#00BFFF',
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
    color: '#00BFFF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  vitalStatus: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  timestamp: {
    color: '#666',
    fontSize: 10,
    marginTop: 8,
  },
  updateForm: {
    backgroundColor: 'rgba(0, 191, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#00BFFF',
  },
  updateTitle: {
    color: '#00BFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(0, 191, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#00BFFF',
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
    borderWidth: 1,
    borderColor: '#666',
  },
  updateButton: {
    backgroundColor: '#00BFFF',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  tipsContainer: {
    marginBottom: 24,
  },
  tipsTitle: {
    color: '#00BFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tipCard: {
    backgroundColor: 'rgba(0, 191, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#00BFFF',
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
    color: '#00BFFF',
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
    color: '#00BFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 191, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00BFFF',
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    backgroundColor: 'rgba(0, 191, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#00BFFF',
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
    fontWeight: '500',
  },
  historyItemDate: {
    color: '#00BFFF',
    fontSize: 12,
  },
  historyItemNotes: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  emptyHistory: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 191, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#00BFFF',
  },
  emptyHistoryText: {
    color: '#00BFFF',
    fontSize: 16,
    marginTop: 12,
  },
  addVitalButton: {
    backgroundColor: 'rgba(0, 191, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#00BFFF',
  },
  addVitalButtonText: {
    color: '#00BFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 191, 255, 0.1)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00BFFF',
  },
  typeButtonSelected: {
    backgroundColor: '#00BFFF',
  },
  typeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}) 