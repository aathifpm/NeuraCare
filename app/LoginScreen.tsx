import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Dimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import GradientText from '../components/GradientText'
import { signIn, handleFirebaseError } from './services/firebase'

const { width } = Dimensions.get('window')

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    setIsLoading(true)
    try {
      await signIn(email, password)
      router.replace('/(tabs)')
    } catch (error) {
      const errorMessage = handleFirebaseError(error)
      Alert.alert('Error', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = () => {
    // Implement social login logic here
    Alert.alert('Info login to be implemented')
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <Text style={styles.title}>LOGIN</Text>

        <LinearGradient
          colors={['#FF9F45', '#D494FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.welcomeGradientBorder}
        >
          <View style={styles.welcomeInner}>
            <GradientText style={styles.welcomeText}>
              Welcome back veteran,
            </GradientText>
            <GradientText style={styles.welcomeSubText}>
              Resume your place on our line-up.
            </GradientText>
          </View>
        </LinearGradient>

        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/TribletLogo.png')}
            style={styles.logo}
            resizeMode='contain'
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder='Your Email'
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
        </View>

        <View style={styles.ResetContainer}>
          <Text style={styles.ResetText}>Forgot password? </Text>
          <TouchableOpacity onPress={() => router.push('/LoginScreen')}>
            <GradientText style={styles.ResetLink}>Reset</GradientText>
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={['#FF9F45', '#D494FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.loginGradientBorder}
        >
          <TouchableOpacity
            style={[
              styles.loginButton,
              isLoading && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'LOGGING IN...' : 'LET ME IN!'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.socialLoginContainer}>
          <Text style={styles.socialLoginText}>Or else Login with:</Text>
          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialLogin()}
            >
              <Image
                source={require('../assets/images/google.png')}
                style={styles.socialIcon}
                resizeMode='contain'
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialLogin()}
            >
              <Image
                source={require('../assets/images/facebook.png')}
                style={styles.socialIcon}
                resizeMode='contain'
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.SignupContainer}>
          <Text style={styles.ResetText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/SignupScreen')}>
            <GradientText style={styles.ResetLink}>Signup</GradientText>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  innerContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  welcomeGradientBorder: {
    borderRadius: 50,
    padding: 1,
    marginBottom: 30,
  },
  welcomeInner: {
    backgroundColor: '#000000',
    borderRadius: 50,
    padding: 16,
  },
  welcomeText: {
    textAlign: 'center',
    fontWeight: '500',
    color: '#FFFFFF',
    fontSize: 16,
  },
  welcomeSubText: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 16,
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
    backgroundColor: '#1A1A1A',
    borderRadius: 25,
    padding: 15,
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 16,
    height: 50,
  },
  loginGradientBorder: {
    marginTop: 25,
    borderRadius: 25,
    padding: 1,
    width: '40%',
    alignSelf: 'center',
  },
  loginButton: {
    backgroundColor: '#000000',
    borderRadius: 24,
    padding: 12,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // New styles for social login
  socialLoginContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  socialLoginText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 15,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  socialButton: {
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialIcon: {
    width: 30,
    height: 30,
  },
  SignupContainer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ResetContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ResetText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  ResetLink: {
    fontSize: 14,
    fontWeight: '500',
  },
})
