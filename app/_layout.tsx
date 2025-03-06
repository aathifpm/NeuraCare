import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font'
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useState } from 'react'
import { View, Text } from 'react-native';
import firebase from './config/firebase';
import { useColorScheme } from '@/hooks/useColorScheme'

export default function RootLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null);

  // const [loaded] = useFonts({
  //   SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  // })
  const [loaded] = useFonts({
    Montserrat: require('../assets/fonts/Montserrat-SemiBold.ttf'),
  })

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(firebase.auth, (user) => {
        setIsLoading(false);
        if (!user) {
          router.replace('/LoginScreen');
        } else {
          router.replace('/(tabs)');
        }
      }, (error) => {
        console.error('Auth state change error:', error);
        setError(error.message);
        setIsLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Firebase initialization error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      setIsLoading(false);
    }
  }, []);

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

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="LoginScreen" options={{ headerShown: false }} />
      <Stack.Screen name="SignupScreen" options={{ headerShown: false }} />
    </Stack>
  );
}
