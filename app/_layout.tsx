import { useEffect } from 'react';
import { Slot, Stack } from 'expo-router';
import { useFonts } from 'expo-font'
import { useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useState } from 'react'
import { View, Text } from 'react-native';
import firebase from './config/firebase';
import { useColorScheme } from '@/hooks/useColorScheme'
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function useProtectedRoute(user: any, isLoading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Don't do anything during the initial loading state
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    if (!user && !inAuthGroup) {
      // Delay navigation to next tick to ensure layout is mounted
      setTimeout(() => {
        router.replace('/(auth)/LoginScreen');
      }, 0);
    } else if (user && inAuthGroup) {
      // Delay navigation to next tick to ensure layout is mounted
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 0);
    }
  }, [user, segments, isLoading]);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [loaded] = useFonts({
    Montserrat: require('../assets/fonts/Montserrat-SemiBold.ttf'),
  });

  useProtectedRoute(user, isLoading);

  useEffect(() => {
    if (!loaded) return;

    try {
      const unsubscribe = onAuthStateChanged(firebase.auth, (currentUser) => {
        setUser(currentUser);
        setIsLoading(false);
        SplashScreen.hideAsync();
      }, (error) => {
        console.error('Auth state change error:', error);
        setError(error.message);
        setIsLoading(false);
        SplashScreen.hideAsync();
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Firebase initialization error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      setIsLoading(false);
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <Text style={{ color: '#fff' }}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <Text style={{ color: '#ff4444', textAlign: 'center', padding: 20 }}>
          {error}
        </Text>
      </View>
    );
  }

  // Use Slot for the root layout
  return <Slot />;
}
