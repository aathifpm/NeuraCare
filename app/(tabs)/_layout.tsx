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
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#888',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          height: Platform.OS === 'ios' ? 85 : 65,
        },
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen
        name='index'
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name={focused ? 'home' : 'home'}
              size={25}
              color={color}
            />
          ),
          tabBarAccessibilityLabel: 'Home Tab',
        }}
      />

      {/* Chat Tab */}
      <Tabs.Screen
        name='chat'
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name={focused ? 'chat' : 'chat-bubble-outline'}
              size={25}
              color={color}
            />
          ),
          tabBarAccessibilityLabel: 'Health Chat',
        }}
      />

      {/* Track Tab */}
      <Tabs.Screen
        name='track'
        options={{
          title: 'Track',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name={focused ? 'track-changes' : 'track-changes'}
              size={25}
              color={color}
            />
          ),
          tabBarAccessibilityLabel: 'Health Tracking',
        }}
      />

      {/* Reminders Tab */}
      <Tabs.Screen
        name='reminders'
        options={{
          title: 'Reminders',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name={focused ? 'notifications' : 'notifications-none'}
              size={25}
              color={color}
            />
          ),
          tabBarAccessibilityLabel: 'Medication Reminders',
        }}
      />

      {/* Profile Tab */}
      <Tabs.Screen
        name='profile'
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name={focused ? 'person' : 'person-outline'}
              size={25}
              color={color}
            />
          ),
          tabBarAccessibilityLabel: 'Profile',
        }}
      />
    </Tabs>
  )
}
