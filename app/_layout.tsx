import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import 'react-native-reanimated'
import { useColorScheme } from '@/hooks/useColorScheme'

import * as SecureStore from 'expo-secure-store'

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // const [loaded] = useFonts({
  //   SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  // })
  const [loaded] = useFonts({
    Montserrat: require('../assets/fonts/Montserrat-SemiBold.ttf'),
  })

  useEffect(() => {
    // Check for authentication token
    async function checkAuth() {
      try {
        const token = await SecureStore.getItemAsync('userToken')
        setIsAuthenticated(!!token) // Set isAuthenticated based on token presence
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [])

  useEffect(() => {
    if (loaded && !isLoading) {
      SplashScreen.hideAsync()
    }
  }, [loaded, isLoading])

  if (!loaded || isLoading) {
    return null
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName={isAuthenticated ? '(tabs)' : 'LoginScreen'}>
        <Stack.Screen name='LoginScreen' options={{ headerShown: false }} />
        <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
        <Stack.Screen name='SignupScreen' options={{ headerShown: false }} />
      </Stack>
      <StatusBar style='auto' />
    </ThemeProvider>
  )
}
