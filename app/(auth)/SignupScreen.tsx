import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import GradientText from '../../components/GradientText'
import { signUp, createDocument, handleFirebaseError } from '../services/firebase'
import type { BaseDocument } from '../services/firebase'

interface UserProfile extends BaseDocument {
  fullName: string;
  email: string;
  phoneNumber: string;
  createdAt: number;
}

export default function SignupScreen() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')

  const handleSignup = async () => {
    if (!email || !password || !fullName || !phoneNumber) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    setIsLoading(true)
    try {
      // Create user authentication
      const userCredential = await signUp(email, password)
      
      // Create user profile in Firestore
      const userProfile: UserProfile = {
        fullName,
        email,
        phoneNumber,
        createdAt: Date.now(),
      }
      
      await createDocument<UserProfile>('users', userCredential.user.uid, userProfile)
      
      Alert.alert('Success', 'Account created successfully!', [
        {
          text: 'OK',
          onPress: () => router.push('/LoginScreen'),
        },
      ])
    } catch (error) {
      const errorMessage = handleFirebaseError(error)
      Alert.alert('Error', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <Text style={styles.title}>SIGNUP</Text>

        <LinearGradient
          colors={['#00BFFF', '#1E90FF', '#4169E1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.welcomeGradientBorder}
        >
          <View style={styles.welcomeInner}>
            <GradientText style={styles.welcomeText}>
              Welcome to NeuraCare,
            </GradientText>
            <GradientText style={styles.subText}>
              Your journey to better health starts here.
            </GradientText>
          </View>
        </LinearGradient>

        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/ai-avatar.png')}
            style={styles.logo}
            resizeMode='contain'
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder='Your Full Name'
            placeholderTextColor='#666'
            value={fullName}
            onChangeText={setFullName}
          />
          <TextInput
            style={styles.input}
            placeholder='Your Email Address'
            placeholderTextColor='#666'
            keyboardType='email-address'
            autoCapitalize='none'
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder='Your Password'
            placeholderTextColor='#666'
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={styles.input}
            placeholder='Your Mobile Number'
            placeholderTextColor='#666'
            keyboardType='phone-pad'
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>

        <View style={styles.buttonContainer}>
          <LinearGradient
            colors={['#00BFFF', '#1E90FF', '#4169E1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.buttonGradient]}
          >
            <TouchableOpacity
              style={[
                styles.button,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleSignup}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <Text style={styles.verifyText}>
          We will verify your email address.
        </Text>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/LoginScreen')}>
            <GradientText style={styles.loginLink}>Login</GradientText>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  innerContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    color: '#00BFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  welcomeGradientBorder: {
    borderRadius: 20,
    padding: 1,
    marginBottom: 30,
  },
  welcomeInner: {
    backgroundColor: '#121212',
    borderRadius: 20,
    padding: 16,
  },
  welcomeText: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  subText: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logo: {
    width: 80,
    height: 80,
  },
  inputContainer: {
    gap: 15,
    marginBottom: 25,
  },
  input: {
    backgroundColor: 'rgba(0, 191, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    height: 50,
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  buttonGradient: {
    borderRadius: 12,
    padding: 1,
    width: '50%',
  },
  button: {
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  verifyText: {
    paddingHorizontal: 20,
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 10,
  },
  loginContainer: {
    marginTop: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#00BFFF',
    fontWeight: '500',
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '500',
  },
})
