import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ImageBackground,
  Platform,
  Dimensions,
  Alert,
} from 'react-native'
import React, { useState, useEffect } from 'react'
import { MaterialIcons, MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import Header from '@/components/Header'
import { router } from 'expo-router'
import { auth, db } from '../config/firebase'
import { doc, getDoc, onSnapshot, DocumentData } from 'firebase/firestore'
import { onAuthStateChanged, User } from 'firebase/auth'

const { width } = Dimensions.get('window')

// Type definitions
type VitalType = 'heartRate' | 'steps' | 'sleep' | 'water' | 'temperature' | 'oxygenLevel' | 'bloodPressure'
type VitalData = {
  value: number | string
  unit: string
  status: string
  goal?: number
  type: 'number' | 'string'
}

interface UserProfile extends DocumentData {
  fullName: string;
  email: string;
  phoneNumber: string;
  createdAt: number;
}

type UserData = {
  name: string
  healthScore: number
  vitals: Record<VitalType, VitalData>
  upcoming: Array<{
    id: number
    type: 'medication' | 'appointment'
    title: string
    time: string
    icon: keyof typeof MaterialCommunityIcons.glyphMap
    color: string
  }>
}

// Default user data
const defaultUserData: UserData = {
  name: '',
  healthScore: 0,
  vitals: {
    heartRate: { value: 0, unit: 'BPM', status: 'Normal', type: 'number' },
    steps: { value: 0, unit: 'steps', status: 'On Track', goal: 10000, type: 'number' },
    sleep: { value: '0h 0m', unit: 'hours', status: 'Good', type: 'string' },
    water: { value: 0, unit: 'L', status: 'Need More', goal: 2.5, type: 'number' },
    temperature: { value: 0, unit: '°C', status: 'Normal', type: 'number' },
    oxygenLevel: { value: 0, unit: '%', status: 'Normal', type: 'number' },
    bloodPressure: { value: '0/0', unit: 'mmHg', status: 'Normal', type: 'string' },
  },
  upcoming: [],
}

export default function Index() {
  const [userData, setUserData] = useState<UserData>(defaultUserData)
  const [greeting, setGreeting] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('') // For debugging

  // Check authentication and fetch user data
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/LoginScreen')
        return
      }

      setCurrentUser(user)

      try {
        // Fetch user profile from Firestore
        const userDocRef = doc(db, 'users', user.uid)
        const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const profileData = docSnapshot.data() as UserProfile
            setUserData(currentData => ({
              ...currentData,
              name: profileData.fullName || '',
            }))
          }
        })

        // Fetch user health data
        const healthDocRef = doc(db, 'health_data', user.uid)
        const healthSnapshot = await getDoc(healthDocRef)
        
        if (healthSnapshot.exists()) {
          const healthData = healthSnapshot.data()
          
          // Debug the data structure
          console.log('Health data from Firestore:', JSON.stringify(healthData, null, 2))
          
          // Check if vitals data exists
          if (!healthData.vitals) {
            console.warn('No vitals data found in Firestore, using defaults')
            setDebugInfo('No vitals data in Firestore')
          }
          
          // Create a complete vitals object by merging with defaults
          const mergedVitals = {
            ...defaultUserData.vitals,
            ...(healthData.vitals || {})
          };
          
          // Add any missing vital types
          Object.keys(defaultUserData.vitals).forEach(key => {
            if (!mergedVitals[key as VitalType]) {
              mergedVitals[key as VitalType] = defaultUserData.vitals[key as VitalType];
            }
          });
          
          // Process and set the user data with the updated vitals
          setUserData(currentData => {
            const newData = {
              ...currentData,
              vitals: mergedVitals,
              upcoming: healthData.upcoming || [],
            };
            
            // Debug the processed data
            console.log('Processed user data:', JSON.stringify(newData, null, 2));
            setDebugInfo(`Data processed: ${Object.keys(mergedVitals).length} vitals`);
            
            // Return the updated user data
            return newData;
          });
        } else {
          // No health data found, use defaults but log it
          console.warn('No health document found in Firestore for user', user.uid);
          setDebugInfo('No health document in Firestore');
          
          // Still set default values to ensure the UI works
          setUserData(currentData => ({
            ...currentData,
            vitals: defaultUserData.vitals,
          }));
        }

        setLoading(false)
        return () => {
          unsubscribeSnapshot()
        }
      } catch (error: any) {
        console.error('Error fetching user data:', error)
        setDebugInfo(`Error: ${error.message || 'Unknown error'}`)
        setLoading(false)
      }
    })

    return () => {
      unsubscribeAuth()
    }
  }, [])

  // Calculate greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await auth.signOut()
      router.replace('/LoginScreen')
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out. Please try again.')
    }
  }

  // Handle quick action navigation
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'chat':
        router.push('/(tabs)/chat')
        break
      case 'emergency':
        handleEmergency()
        break
      case 'doctor':
        router.push('/(tabs)/track')
        break
      case 'medicine':
        router.push('/(tabs)/reminders')
        break
    }
  }

  // Handle emergency action
  const handleEmergency = () => {
    Alert.alert(
      'Emergency Contact',
      'Do you want to call emergency services?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Call Emergency',
          onPress: () => {
            // In a real app, this would use Linking to make a phone call
            Alert.alert('Calling Emergency Services...')
          },
          style: 'destructive',
        },
      ]
    )
  }

  // Handle vital card press
  const handleVitalPress = (vitalType: string) => {
    router.push({
      pathname: '/track',
      params: { initialTab: vitalType }
    })
  }

  // Handle upcoming item press
  const handleUpcomingPress = (item: UserData['upcoming'][0]) => {
    if (item.type === 'medication') {
      router.push('/(tabs)/reminders')
    } else if (item.type === 'appointment') {
      router.push('/(tabs)/track')
    }
  }

  // Update vital statuses after data is loaded
  useEffect(() => {
    if (!loading && userData) {
      // Create a copy of vitals to update
      const updatedVitals = { ...userData.vitals };
      let hasChanges = false;
      
      // Debug the vital data
      console.log('Current vitals before status update:', JSON.stringify(updatedVitals, null, 2));
      
      // Update status for each vital
      Object.entries(updatedVitals).forEach(([key, data]) => {
        if (data) { // Check if data exists
          const vitalType = key as VitalType;
          const newStatus = calculateVitalStatus(vitalType, data.value);
          
          // Only update if status changed or was unknown
          if (data.status === 'Unknown' || data.status !== newStatus) {
            updatedVitals[vitalType] = {
              ...data,
              status: newStatus
            };
            hasChanges = true;
          }
        }
      });
      
      // Only update state if there were changes
      if (hasChanges) {
        setUserData(prev => {
          const updated = {
            ...prev,
            vitals: updatedVitals
          };
          console.log('Updated vitals with new statuses:', JSON.stringify(updated.vitals, null, 2));
          return updated;
        });
      }
      
      // Update the health score in the userData
      const calculatedScore = calculateHealthProgress();
      console.log('Calculated health score:', calculatedScore);
      
      if (userData.healthScore !== calculatedScore) {
        setUserData(prev => ({
          ...prev,
          healthScore: calculatedScore
        }));
      }
    }
  }, [loading, userData.vitals]);

  // Calculate status for each vital
  const calculateVitalStatus = (type: VitalType, value: number | string): string => {
    // Handle null or undefined values
    if (value === null || value === undefined) return 'Unknown';
    
    if (typeof value === 'number') {
      // Handle NaN or invalid numbers
      if (isNaN(value)) return 'Unknown';
      
      switch (type) {
        case 'heartRate':
          if (value < 60) return 'Low';
          if (value > 100) return 'High';
          return 'Normal';
        
        case 'steps':
          const stepsGoal = userData.vitals.steps?.goal || 10000;
          const percentage = (value / stepsGoal) * 100;
          if (percentage >= 100) return 'Achieved';
          if (percentage >= 75) return 'Almost There';
          if (percentage >= 50) return 'On Track';
          if (percentage >= 25) return 'Getting Started';
          return 'Need More';
        
        case 'water':
          const waterGoal = userData.vitals.water?.goal || 2.5;
          const waterPercentage = (value / waterGoal) * 100;
          if (waterPercentage >= 100) return 'Hydrated';
          if (waterPercentage >= 75) return 'Almost There';
          if (waterPercentage >= 50) return 'Halfway';
          return 'Need More';
        
        case 'temperature':
          if (value < 36) return 'Low';
          if (value > 37.5) return 'High';
          return 'Normal';
        
        case 'oxygenLevel':
          if (value < 95) return 'Low';
          return 'Normal';
        
        default:
          return 'Normal';
      }
    } else if (typeof value === 'string') {
      // Handle empty strings
      if (!value.trim()) return 'Unknown';
      
      switch (type) {
        case 'sleep':
          try {
            // Extract hours from format like "7h 30m"
            const hours = parseFloat(value.split('h')[0]);
            if (isNaN(hours)) return 'Unknown';
            if (hours >= 7 && hours <= 9) return 'Good';
            if (hours > 9) return 'Too Much';
            return 'Not Enough';
          } catch (e) {
            return 'Unknown';
          }
        
        case 'bloodPressure':
          try {
            // Parse systolic/diastolic values from "120/80" format
            const parts = value.split('/');
            if (parts.length === 2) {
              const systolic = parseInt(parts[0]);
              const diastolic = parseInt(parts[1]);
              
              if (isNaN(systolic) || isNaN(diastolic)) return 'Unknown';
              
              if (systolic >= 140 || diastolic >= 90) return 'High';
              if (systolic <= 90 || diastolic <= 60) return 'Low';
              return 'Normal';
            }
            return 'Unknown';
          } catch (e) {
            return 'Unknown';
          }
        
        default:
          return 'Unknown';
      }
    }
    
    return 'Unknown';
  }

  // Calculate progress for health score
  const calculateHealthProgress = () => {
    const { vitals } = userData;
    let score = 0;
    let scoreComponents = 0;
    let debugScoreInfo = [];
    
    console.log("Processing vitals for health score:", JSON.stringify(vitals, null, 2));
    
    // Heart rate - more nuanced scoring based on medical guidelines
    if (vitals.heartRate && 
        typeof vitals.heartRate.value === 'number' &&
        !isNaN(vitals.heartRate.value)) {
      scoreComponents++;
      let heartRateScore = 0;
      const hr = vitals.heartRate.value;
      
      // Normal range: 60-100 BPM (optimal: 60-80)
      if (hr >= 60 && hr <= 100) {
        // Optimal range gets full points
        if (hr >= 60 && hr <= 80) {
          heartRateScore = 25;
        } else {
          // Upper normal range gets slightly fewer points
          heartRateScore = 20;
        }
      } else if (hr > 100 && hr <= 120) {
        // Slightly elevated
        heartRateScore = 10;
      } else if (hr > 120) {
        // Significantly elevated
        heartRateScore = 0;
      } else if (hr >= 50 && hr < 60) {
        // Slightly below normal, could be athletic
        heartRateScore = 15;
      } else {
        // Too low
        heartRateScore = 0;
      }
      
      score += heartRateScore;
      debugScoreInfo.push(`HeartRate: ${heartRateScore}/25 (${hr} BPM)`);
    } else {
      debugScoreInfo.push(`HeartRate: missing data - ${JSON.stringify(vitals.heartRate)}`);
    }
    
    // Steps - reward progress, not just completion
    if (vitals.steps && 
        typeof vitals.steps.value === 'number' &&
        !isNaN(vitals.steps.value)) {
      scoreComponents++;
      // Use steps.goal if available, otherwise default to 10000
      const stepsGoal = (vitals.steps.goal && !isNaN(vitals.steps.goal)) ? vitals.steps.goal : 10000;
      
      // Calculate percentage but cap at 150% - excessive exercise isn't necessarily better
      const percentage = Math.min(vitals.steps.value / stepsGoal, 1.5);
      
      // Optimal is 100% of goal, above or below reduces score
      let stepsScore = 0;
      if (percentage >= 0.9 && percentage <= 1.1) {
        // Within 10% of goal (optimal)
        stepsScore = 25;
      } else if (percentage > 1.1 && percentage <= 1.5) {
        // Exceeding goal by 10-50%
        stepsScore = 20;
      } else if (percentage > 1.5) {
        // Exceeding goal by too much
        stepsScore = 15;
      } else if (percentage >= 0.7 && percentage < 0.9) {
        // 70-90% of goal
        stepsScore = 20;
      } else if (percentage >= 0.5 && percentage < 0.7) {
        // 50-70% of goal
        stepsScore = 15;
      } else if (percentage >= 0.3 && percentage < 0.5) {
        // 30-50% of goal
        stepsScore = 10;
      } else {
        // Less than 30% of goal
        stepsScore = 5;
      }
      
      score += stepsScore;
      debugScoreInfo.push(`Steps: ${stepsScore}/25 (${vitals.steps.value}/${stepsGoal} steps)`);
    } else {
      debugScoreInfo.push(`Steps: missing data - ${JSON.stringify(vitals.steps)}`);
    }
    
    // Sleep - realistic healthy ranges
    if (vitals.sleep) {
      let sleepValue = vitals.sleep.value;
      let sleepHours = 0;
      
      // Handle both string format ("7h 30m") and numeric formats
      if (typeof sleepValue === 'string' && sleepValue.includes('h')) {
        try {
          sleepHours = parseFloat(sleepValue.split('h')[0]);
        } catch (e) {
          debugScoreInfo.push(`Sleep: parsing error - ${sleepValue}`);
        }
      } else if (typeof sleepValue === 'number' && !isNaN(sleepValue)) {
        sleepHours = sleepValue; // Assume direct hours value
      }
      
      if (!isNaN(sleepHours) && sleepHours > 0) {
        scoreComponents++;
        let sleepScore = 0;
        
        // Healthy adults need 7-9 hours, with optimal being 7-8 hours
        if (sleepHours >= 7 && sleepHours <= 9) {
          // Optimal sleep range
          if (sleepHours >= 7 && sleepHours <= 8) {
            sleepScore = 25;
          } else {
            sleepScore = 22;
          }
        } else if (sleepHours >= 6 && sleepHours < 7) {
          // Slightly under recommended
          sleepScore = 15;
        } else if (sleepHours > 9 && sleepHours <= 10) {
          // Slightly over recommended
          sleepScore = 15;
        } else if (sleepHours >= 5 && sleepHours < 6) {
          // Significantly under recommended
          sleepScore = 8;
        } else if (sleepHours > 10 && sleepHours <= 12) {
          // Significantly over recommended
          sleepScore = 8;
        } else {
          // Extreme values (either too little or too much)
          // Less than 5 or more than 12 hours is generally unhealthy
          sleepScore = 0;
        }
        
        score += sleepScore;
        debugScoreInfo.push(`Sleep: ${sleepScore}/25 (${sleepHours}h)`);
      } else {
        debugScoreInfo.push(`Sleep: invalid hours - ${sleepValue}`);
      }
    } else {
      debugScoreInfo.push(`Sleep: missing data - ${JSON.stringify(vitals.sleep)}`);
    }
    
    // Water intake - balanced approach with reasonable limits
    if (vitals.water && 
        typeof vitals.water.value === 'number' &&
        !isNaN(vitals.water.value)) {
      scoreComponents++;
      // Use water.goal if available, otherwise default to 2.5L
      const waterGoal = (vitals.water.goal && !isNaN(vitals.water.goal)) ? vitals.water.goal : 2.5;
      
      // Water intake scoring - more isn't always better, staying hydrated without excess is ideal
      let waterScore = 0;
      const waterRatio = vitals.water.value / waterGoal;
      
      if (waterRatio >= 0.9 && waterRatio <= 1.2) {
        // Optimal range (90-120% of goal)
        waterScore = 25;
      } else if (waterRatio > 1.2 && waterRatio <= 1.5) {
        // Higher than recommended but not excessive
        waterScore = 20;
      } else if (waterRatio > 1.5 && waterRatio <= 2.0) {
        // Excessive intake - could be harmful
        waterScore = 15;
      } else if (waterRatio > 2.0) {
        // Very excessive - risk of overhydration
        waterScore = 5;
      } else if (waterRatio >= 0.7 && waterRatio < 0.9) {
        // Slightly under target
        waterScore = 20;
      } else if (waterRatio >= 0.5 && waterRatio < 0.7) {
        // Moderately under target
        waterScore = 15;
      } else if (waterRatio >= 0.3 && waterRatio < 0.5) {
        // Significantly under target
        waterScore = 10;
      } else {
        // Severely under target
        waterScore = 5;
      }
      
      score += waterScore;
      debugScoreInfo.push(`Water: ${waterScore}/25 (${vitals.water.value}/${waterGoal}L)`);
    } else {
      debugScoreInfo.push(`Water: missing data - ${JSON.stringify(vitals.water)}`);
    }
    
    // Blood Pressure - important health metric
    if (vitals.bloodPressure && 
        (typeof vitals.bloodPressure.value === 'string' || 
         typeof vitals.bloodPressure.value === 'number')) {
      
      let systolic = 0;
      let diastolic = 0;
      
      // Parse blood pressure values
      if (typeof vitals.bloodPressure.value === 'string' && vitals.bloodPressure.value.includes('/')) {
        try {
          const parts = vitals.bloodPressure.value.split('/');
          systolic = parseInt(parts[0]);
          diastolic = parseInt(parts[1]);
        } catch (e) {
          debugScoreInfo.push(`Blood Pressure: parsing error - ${vitals.bloodPressure.value}`);
        }
      } else if (typeof vitals.bloodPressure.value === 'number') {
        // If only one number is stored, assume it's systolic
        systolic = vitals.bloodPressure.value;
      }
      
      if (!isNaN(systolic) && systolic > 0) {
        scoreComponents++;
        let bpScore = 0;
        
        // Evaluate based on systolic (upper number)
        if (systolic < 120) {
          // Normal
          bpScore = 25;
        } else if (systolic >= 120 && systolic <= 129) {
          // Elevated
          bpScore = 20;
        } else if (systolic >= 130 && systolic <= 139) {
          // Stage 1 hypertension
          bpScore = 15;
        } else if (systolic >= 140 && systolic <= 159) {
          // Stage 2 hypertension
          bpScore = 5;
        } else if (systolic >= 160) {
          // Hypertensive crisis
          bpScore = 0;
        }
        
        score += bpScore;
        if (diastolic > 0) {
          debugScoreInfo.push(`Blood Pressure: ${bpScore}/25 (${systolic}/${diastolic} mmHg)`);
        } else {
          debugScoreInfo.push(`Blood Pressure: ${bpScore}/25 (${systolic} mmHg)`);
        }
      }
    } else {
      debugScoreInfo.push(`Blood Pressure: missing data - ${JSON.stringify(vitals.bloodPressure)}`);
    }
    
    // Oxygen Level - important health metric
    if (vitals.oxygenLevel && 
        typeof vitals.oxygenLevel.value === 'number' &&
        !isNaN(vitals.oxygenLevel.value)) {
      
      scoreComponents++;
      let o2Score = 0;
      const o2 = vitals.oxygenLevel.value;
      
      // Evaluate oxygen levels
      if (o2 >= 95 && o2 <= 100) {
        // Normal
        o2Score = 25;
      } else if (o2 >= 90 && o2 < 95) {
        // Mild hypoxemia
        o2Score = 15;
      } else if (o2 >= 85 && o2 < 90) {
        // Moderate hypoxemia
        o2Score = 5;
      } else if (o2 < 85) {
        // Severe hypoxemia
        o2Score = 0;
      } else if (o2 > 100) {
        // Invalid reading (O2 can't be > 100%)
        o2Score = 0;
      }
      
      score += o2Score;
      debugScoreInfo.push(`Oxygen: ${o2Score}/25 (${o2}%)`);
    } else {
      debugScoreInfo.push(`Oxygen: missing data - ${JSON.stringify(vitals.oxygenLevel)}`);
    }
    
    // Temperature - important health metric
    if (vitals.temperature && 
        typeof vitals.temperature.value === 'number' &&
        !isNaN(vitals.temperature.value)) {
      
      scoreComponents++;
      let tempScore = 0;
      const temp = vitals.temperature.value;
      const unit = vitals.temperature.unit || "°C";
      
      // Evaluate temperature (assuming Celsius)
      if (unit === "°C") {
        if (temp >= 36.1 && temp <= 37.2) {
          // Normal
          tempScore = 25;
        } else if ((temp >= 35.5 && temp < 36.1) || (temp > 37.2 && temp <= 38)) {
          // Slightly out of range
          tempScore = 15;
        } else if ((temp >= 35 && temp < 35.5) || (temp > 38 && temp <= 39)) {
          // Moderately out of range
          tempScore = 5;
        } else {
          // Severely abnormal
          tempScore = 0;
        }
      } else if (unit === "°F") {
        // Convert the same logic to Fahrenheit
        if (temp >= 97 && temp <= 99) {
          // Normal
          tempScore = 25;
        } else if ((temp >= 96 && temp < 97) || (temp > 99 && temp <= 100.4)) {
          // Slightly out of range
          tempScore = 15;
        } else if ((temp >= 95 && temp < 96) || (temp > 100.4 && temp <= 102.2)) {
          // Moderately out of range
          tempScore = 5;
        } else {
          // Severely abnormal
          tempScore = 0;
        }
      }
      
      score += tempScore;
      debugScoreInfo.push(`Temperature: ${tempScore}/25 (${temp}${unit})`);
    } else {
      debugScoreInfo.push(`Temperature: missing data - ${JSON.stringify(vitals.temperature)}`);
    }
    
    // Debug the score calculation
    console.log(`Health Score Debug: Components=${scoreComponents}, Score=${score}, Details:`, debugScoreInfo);
    setDebugInfo(`Score: ${score}/${scoreComponents*25} - ${debugScoreInfo.join(', ')}`);
    
    // If no valid data components, return 0
    if (scoreComponents === 0) return 0;
    
    // Normalize score based on available components
    return Math.round((score / (scoreComponents * 25)) * 100);
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header with modern gradient border */}
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
                <MaterialIcons name="health-and-safety" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.appName}>NeuraCare</Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionButton}>
                <View style={styles.notificationContainer}>
                  <MaterialIcons name="notifications" size={24} color="#00BFFF" />
                  <View style={styles.notificationBadge}>
                    <Text style={styles.badgeText}>2</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.profileButton}
                onPress={handleSignOut}
              >
                <LinearGradient
                  colors={['#00BFFF', '#1E90FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.profileGradient}
                >
                  <MaterialIcons name="person" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.searchBar}>
            <MaterialIcons name="search" size={20} color="#00BFFF" />
            <Text style={styles.searchText}>Search symptoms, medicines...</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Section with Health Score */}
        <View style={styles.welcomeContainer}>
          <LinearGradient
            colors={['rgba(0, 191, 255, 0.05)', 'rgba(30, 144, 255, 0.1)']}
            style={styles.welcomeGradient}
          >
            <View style={styles.welcomeContent}>
              <View style={styles.welcomeTextContainer}>
                <Text style={styles.welcomeSubtitle}>{greeting},</Text>
                <Text style={styles.welcomeName}>{userData.name}</Text>
              </View>
              <TouchableOpacity 
                style={styles.healthScoreContainer}
                onPress={() => Alert.alert('Health Score', `Your health score is calculated based on your vitals, activity, and habits.\n\nDebug Info: ${debugInfo}`)}
              >
                <LinearGradient
                  colors={['#00BFFF', '#1E90FF', '#4169E1']}
                  style={styles.healthScoreGradient}
                >
                  <Text style={styles.healthScoreValue}>{userData.healthScore}</Text>
                  <Text style={styles.healthScoreLabel}>Health Score</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => handleQuickAction('chat')}
          >
            <LinearGradient
              colors={['#00BFFF', '#1E90FF']}
              style={styles.quickActionGradient}
            >
              <MaterialCommunityIcons name="robot" size={24} color="#fff" />
            </LinearGradient>
            <Text style={styles.quickActionText}>AI Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => handleQuickAction('emergency')}
          >
            <LinearGradient
              colors={['#FF5722', '#FF9800']}
              style={styles.quickActionGradient}
            >
              <MaterialIcons name="add-alert" size={24} color="#fff" />
            </LinearGradient>
            <Text style={styles.quickActionText}>Emergency</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => handleQuickAction('doctor')}
          >
            <LinearGradient
              colors={['#00BFFF', '#4169E1']}
              style={styles.quickActionGradient}
            >
              <MaterialIcons name="local-hospital" size={24} color="#fff" />
            </LinearGradient>
            <Text style={styles.quickActionText}>Find Doctor</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => handleQuickAction('medicine')}
          >
            <LinearGradient
              colors={['#00BFFF', '#1E90FF']}
              style={styles.quickActionGradient}
            >
              <MaterialCommunityIcons name="pill" size={24} color="#fff" />
            </LinearGradient>
            <Text style={styles.quickActionText}>Medicine</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.overviewGrid}>
            {Object.entries(userData.vitals).map(([key, data]) => (
              <TouchableOpacity 
                key={key}
                style={styles.overviewCard}
                onPress={() => handleVitalPress(key)}
              >
                <View style={styles.overviewCardContent}>
                  <MaterialCommunityIcons 
                    name={getVitalIcon(key as VitalType)} 
                    size={24} 
                    color={getVitalColor(key as VitalType)} 
                  />
                  <Text style={styles.overviewValue}>
                    {typeof data.value === 'number' ? data.value.toLocaleString() : data.value}
                  </Text>
                  <Text style={styles.overviewLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                  <Text style={[
                    styles.overviewStatus,
                    { color: getStatusColor(data.status) }
                  ]}>{data.status}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Upcoming */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          <View style={styles.upcomingList}>
            {userData.upcoming.length > 0 ? (
              userData.upcoming.map((item) => (
                <TouchableOpacity 
                  key={item.id}
                  style={styles.upcomingCard}
                  onPress={() => handleUpcomingPress(item)}
                >
                  <View style={styles.upcomingCardContent}>
                    <View style={[styles.upcomingIconContainer, { borderColor: item.color }]}>
                      <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
                    </View>
                    <View style={styles.upcomingContent}>
                      <Text style={styles.upcomingTitle}>{item.title}</Text>
                      <Text style={styles.upcomingTime}>{item.time}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#00BFFF" />
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <MaterialIcons name="event-available" size={40} color="#00BFFF" />
                <Text style={styles.emptyStateText}>No upcoming events</Text>
              </View>
            )}
          </View>
        </View>

        {/* Health Tips */}
        <View style={[styles.section, styles.lastSection]}>
          <Text style={styles.sectionTitle}>Daily Health Tips</Text>
          <TouchableOpacity 
            style={styles.tipCard}
            onPress={() => router.push('/(tabs)/track')}
          >
            <LinearGradient
              colors={['rgba(0, 191, 255, 0.1)', 'rgba(65, 105, 225, 0.1)']}
              style={styles.tipGradient}
            >
              <View style={styles.tipContent}>
                <MaterialIcons name="lightbulb" size={24} color="#00BFFF" />
                <Text style={styles.tipTitle}>Stay Hydrated!</Text>
                <Text style={styles.tipText}>
                  Drinking enough water helps maintain energy levels and supports overall health.
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

// Helper functions
const getVitalIcon = (type: VitalType): keyof typeof MaterialCommunityIcons.glyphMap => {
  const icons: Record<VitalType, keyof typeof MaterialCommunityIcons.glyphMap> = {
    heartRate: 'heart-pulse',
    steps: 'run',
    sleep: 'sleep',
    water: 'water',
    temperature: 'thermometer',
    oxygenLevel: 'lungs',
    bloodPressure: 'blood-bag',
  }
  return icons[type]
}

const getVitalColor = (type: VitalType): string => {
  const colors: { [key: string]: string } = {
    heartRate: '#FF5722',
    steps: '#4CAF50',
    sleep: '#2196F3',
    water: '#00BFFF',
    temperature: '#FF9800',
    oxygenLevel: '#E91E63',
    bloodPressure: '#F44336',
  }
  return colors[type] || '#666'
}

const getStatusColor = (status: string): string => {
  const colors: { [key: string]: string } = {
    'Normal': '#4CAF50',
    'Good': '#4CAF50',
    'On Track': '#4CAF50',
    'Almost There': '#4CAF50',
    'Achieved': '#4CAF50',
    'Hydrated': '#4CAF50',
    'Halfway': '#FFC107',
    'Getting Started': '#FFC107',
    'Too Much': '#FF9800',
    'Need More': '#FF9800',
    'Not Enough': '#FF9800',
    'Low': '#F44336',
    'High': '#F44336',
    'Unknown': '#9E9E9E',
  }
  return colors[status] || '#666'
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
    marginBottom: 16,
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
    color: '#00BFFF',
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
    backgroundColor: 'rgba(0, 191, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00BFFF',
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
    backgroundColor: 'rgba(0, 191, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00BFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchText: {
    color: '#666',
    fontSize: 14,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  welcomeContainer: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  welcomeGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00BFFF',
    overflow: 'hidden',
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  welcomeTextContainer: {
    flexDirection: 'column',
  },
  welcomeSubtitle: {
    color: '#00BFFF',
    fontSize: 16,
  },
  welcomeName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  healthScoreContainer: {
    alignItems: 'center',
  },
  healthScoreGradient: {
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  healthScoreValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  healthScoreLabel: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: 8,
  },
  quickActionButton: {
    alignItems: 'center',
  },
  quickActionGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    color: '#00BFFF',
    fontSize: 12,
  },
  section: {
    padding: 16,
  },
  lastSection: {
    paddingBottom: 32,
  },
  sectionTitle: {
    color: '#00BFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  overviewCard: {
    width: (width - 48) / 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#00BFFF',
    overflow: 'hidden',
  },
  overviewCardContent: {
    backgroundColor: 'rgba(0, 191, 255, 0.05)',
    padding: 16,
    alignItems: 'center',
  },
  overviewValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  overviewLabel: {
    color: '#00BFFF',
    fontSize: 14,
  },
  overviewStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  upcomingList: {
    gap: 12,
  },
  upcomingCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#00BFFF',
    overflow: 'hidden',
  },
  upcomingCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 191, 255, 0.05)',
  },
  upcomingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upcomingContent: {
    flex: 1,
    marginLeft: 12,
  },
  upcomingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  upcomingTime: {
    color: '#00BFFF',
    fontSize: 14,
    marginTop: 4,
  },
  emptyStateContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00BFFF',
    borderRadius: 16,
    backgroundColor: 'rgba(0, 191, 255, 0.05)',
  },
  emptyStateText: {
    color: '#00BFFF',
    fontSize: 16,
    marginTop: 12,
  },
  tipCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#00BFFF',
    overflow: 'hidden',
  },
  tipGradient: {
    padding: 20,
  },
  tipContent: {
    alignItems: 'center',
  },
  tipTitle: {
    color: '#00BFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  tipText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#00BFFF',
    fontSize: 16,
  },
})
