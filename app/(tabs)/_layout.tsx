import { Tabs } from 'expo-router'
import React from 'react'
import { Platform } from 'react-native'
import { Colors } from '@/constants/Colors'
import { useColorScheme } from '@/hooks/useColorScheme'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'

export default function TabLayout() {
  const colorScheme = useColorScheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopColor: '#2A2A2A',
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#666',
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen
        name='index'
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Home Tab',
        }}
      />

      {/* Chat Tab */}
      <Tabs.Screen
        name='chat'
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="robot" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Health Chat',
        }}
      />

      {/* Track Tab */}
      <Tabs.Screen
        name='track'
        options={{
          title: 'Track',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="track-changes" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Health Tracking',
        }}
      />

      {/* Reminders Tab */}
      <Tabs.Screen
        name='reminders'
        options={{
          title: 'Reminders',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="notifications" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Medication Reminders',
        }}
      />

      {/* Profile Tab */}
      <Tabs.Screen
        name='profile'
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Profile',
        }}
      />
    </Tabs>
  )
}
