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
import GradientText from '../../components/GradientText'
import { signIn, handleFirebaseError } from '../services/firebase'

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
      router.replace('../(tabs)')
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
              Welcome back to NeuraCare,
            </GradientText>
            <GradientText style={styles.welcomeSubText}>
              Your personal healthcare companion awaits.
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

        <View style={styles.buttonContainer}>
          <LinearGradient
            colors={['#00BFFF', '#1E90FF', '#4169E1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.loginGradientBorder, styles.buttonGradient]}
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
                {isLoading ? 'LOGGING IN...' : 'LOGIN'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>

          <LinearGradient
            colors={['#00BFFF', '#1E90FF', '#4169E1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.loginGradientBorder, styles.buttonGradient]}
          >
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push('/SignupScreen')}
            >
              <Text style={styles.loginButtonText}>SIGNUP</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={styles.socialLoginContainer}>
          <Text style={styles.socialLoginText}>Or else Login with:</Text>
          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialLogin()}
            >
              <Image
                source={require('../../assets/images/google.png')}
                style={styles.socialIcon}
                resizeMode='contain'
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialLogin()}
            >
              <Image
                source={require('../../assets/images/facebook.png')}
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
    backgroundColor: 'rgba(0, 191, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 16,
    height: 50,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 25,
  },
  buttonGradient: {
    width: '35%',
  },
  loginGradientBorder: {
    borderRadius: 12,
    padding: 1,
    alignSelf: 'center',
  },
  loginButton: {
    backgroundColor: '#121212',
    borderRadius: 12,
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
  socialLoginContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  socialLoginText: {
    color: '#00BFFF',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 191, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00BFFF',
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
    color: '#00BFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  ResetLink: {
    fontSize: 14,
    fontWeight: '500',
  },
})
