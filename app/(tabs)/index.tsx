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
import { MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import Header from '@/components/Header'
import { router } from 'expo-router'

const { width } = Dimensions.get('window')

// Type definitions
type VitalType = 'heartRate' | 'steps' | 'sleep' | 'water'
type VitalData = {
  value: number | string
  unit: string
  status: string
  goal?: number
  type: 'number' | 'string'
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

// Mock data
const mockUserData: UserData = {
  name: 'Aathif',
  healthScore: 92,
  vitals: {
    heartRate: { value: 72, unit: 'BPM', status: 'Normal', type: 'number' },
    steps: { value: 8547, unit: 'steps', status: 'On Track', goal: 10000, type: 'number' },
    sleep: { value: '7h 30m', unit: 'hours', status: 'Good', type: 'string' },
    water: { value: 1.8, unit: 'L', status: 'Need More', goal: 2.5, type: 'number' },
  },
  upcoming: [
    {
      id: 1,
      type: 'medication',
      title: 'Vitamin D3',
      time: 'Today, 2:00 PM',
      icon: 'pill',
      color: '#4CAF50',
    },
    {
      id: 2,
      type: 'appointment',
      title: 'Doctor Appointment',
      time: 'Tomorrow, 10:00 AM',
      icon: 'calendar',
      color: '#9C27B0',
    },
  ],
}

export default function Index() {
  const [userData, setUserData] = useState(mockUserData)
  const [greeting, setGreeting] = useState('')

  // Calculate greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

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

  // Calculate progress for health score
  const calculateHealthProgress = () => {
    const { vitals } = userData
    let score = 0
    
    // Heart rate within normal range (60-100)
    if (vitals.heartRate.type === 'number' && 
        typeof vitals.heartRate.value === 'number' &&
        vitals.heartRate.value >= 60 && 
        vitals.heartRate.value <= 100) {
      score += 25
    }
    
    // Steps progress towards goal
    if (vitals.steps.type === 'number' && 
        typeof vitals.steps.value === 'number' &&
        vitals.steps.goal) {
      score += (vitals.steps.value / vitals.steps.goal) * 25
    }
    
    // Sleep duration (7-9 hours ideal)
    if (vitals.sleep.type === 'string' && 
        typeof vitals.sleep.value === 'string') {
      const sleepHours = parseFloat(vitals.sleep.value.split('h')[0])
      if (sleepHours >= 7 && sleepHours <= 9) score += 25
    }
    
    // Water intake progress
    if (vitals.water.type === 'number' && 
        typeof vitals.water.value === 'number' &&
        vitals.water.goal) {
      score += (vitals.water.value / vitals.water.goal) * 25
    }
    
    return Math.round(score)
  }

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Section with Health Score */}
          <LinearGradient
          colors={['rgba(26, 35, 126, 0.7)', 'rgba(13, 71, 161, 0.7)']}
          style={styles.welcomeGradient}
        >
          <View style={styles.welcomeContent}>
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeSubtitle}>{greeting},</Text>
              <Text style={styles.welcomeName}>{userData.name}</Text>
            </View>
            <TouchableOpacity 
              style={styles.healthScoreContainer}
              onPress={() => Alert.alert('Health Score', 'Your health score is calculated based on your vitals, activity, and habits.')}
            >
              <LinearGradient
                colors={['#4CAF50', '#2196F3']}
                style={styles.healthScoreGradient}
              >
                <Text style={styles.healthScoreValue}>{calculateHealthProgress()}</Text>
                <Text style={styles.healthScoreLabel}>Health Score</Text>
              </LinearGradient>
          </TouchableOpacity>
                </View>
              </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => handleQuickAction('chat')}
            >
              <LinearGradient
              colors={['#4CAF50', '#2196F3']}
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
              colors={['#FF9800', '#FF5722']}
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
              colors={['#9C27B0', '#673AB7']}
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
              colors={['#00BCD4', '#03A9F4']}
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
              </TouchableOpacity>
                    ))}
                  </View>
                </View>

        {/* Upcoming */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          <View style={styles.upcomingList}>
            {userData.upcoming.map((item) => (
              <TouchableOpacity 
                key={item.id}
                style={styles.upcomingCard}
                onPress={() => handleUpcomingPress(item)}
              >
                <LinearGradient
                  colors={[`${item.color}20`, `${item.color}20`]}
                  style={styles.upcomingGradient}
                >
                  <View style={styles.upcomingIconContainer}>
                    <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
                  </View>
                  <View style={styles.upcomingContent}>
                    <Text style={styles.upcomingTitle}>{item.title}</Text>
                    <Text style={styles.upcomingTime}>{item.time}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="#666" />
                </LinearGradient>
              </TouchableOpacity>
            ))}
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
              colors={['#1a237e', '#0d47a1']}
              style={styles.tipGradient}
            >
              <MaterialIcons name="lightbulb" size={24} color="#FFD700" />
              <Text style={styles.tipTitle}>Stay Hydrated!</Text>
              <Text style={styles.tipText}>
                Drinking enough water helps maintain energy levels and supports overall health.
              </Text>
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
  }
  return icons[type]
}

const getVitalColor = (type: VitalType): string => {
  const colors: { [key: string]: string } = {
    heartRate: '#FF5722',
    steps: '#4CAF50',
    sleep: '#2196F3',
    water: '#00BCD4',
  }
  return colors[type] || '#666'
}

const getStatusColor = (status: string): string => {
  const colors: { [key: string]: string } = {
    'Normal': '#4CAF50',
    'Good': '#4CAF50',
    'On Track': '#4CAF50',
    'Need More': '#FF9800',
    'Low': '#FF5722',
    'High': '#FF5722',
  }
  return colors[status] || '#666'
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
  },
  welcomeGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeSubtitle: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.8,
  },
  welcomeName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 8,
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
    marginTop: -20,
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
    color: '#fff',
    fontSize: 12,
  },
  section: {
    padding: 16,
  },
  lastSection: {
    paddingBottom: 32,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  overviewCard: {
    width: (width - 44) / 2,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
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
    color: '#888',
    fontSize: 14,
  },
  overviewStatus: {
    color: '#4CAF50',
    fontSize: 12,
    marginTop: 4,
  },
  upcomingList: {
    gap: 12,
  },
  upcomingCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  upcomingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  upcomingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
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
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  tipCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  tipGradient: {
    padding: 20,
    alignItems: 'center',
  },
  tipTitle: {
    color: '#fff',
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
})
