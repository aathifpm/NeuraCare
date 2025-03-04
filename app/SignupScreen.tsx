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
} from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import GradientText from '../components/GradientText'

export default function SignupScreen() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <Text style={styles.title}>SIGNUP</Text>

        <LinearGradient
          colors={['#FF9F45', '#D494FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.welcomeGradientBorder}
        >
          <View style={styles.welcomeInner}>
            <GradientText style={styles.welcomeText}>
              Welcome newbie,
            </GradientText>
            <GradientText style={styles.subText}>
              Let's get you on our line-up now.
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
            placeholder='Your Mobile Number'
            placeholderTextColor='#666'
            keyboardType='phone-pad'
          />
          <TextInput
            style={styles.input}
            placeholder='Your Full Name'
            placeholderTextColor='#666'
          />
          <TextInput
            style={styles.input}
            placeholder='Your Email Address'
            placeholderTextColor='#666'
            keyboardType='email-address'
            autoCapitalize='none'
          />
        </View>

        <LinearGradient
          colors={['#FF9F45', '#D494FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.continueGradientBorder}
        >
          <TouchableOpacity
            style={[
              styles.continueButton,
              isLoading && styles.continueButtonDisabled,
            ]}
          >
            <Text style={styles.continueText}>CONTINUE</Text>
          </TouchableOpacity>
        </LinearGradient>

        <Text style={styles.verifyText}>
          We will send an otp to your mobile number to verify.
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
    backgroundColor: '#1A1A1A',
    borderRadius: 25,
    padding: 15,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    height: 50,
  },
  continueGradientBorder: {
    borderRadius: 25,
    padding: 1,
    width: '40%',
    alignSelf: 'center',
    marginBottom: 10,
  },
  continueButton: {
    backgroundColor: '#000000',
    borderRadius: 24,
    padding: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueText: {
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
  },
  loginContainer: {
    marginTop: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  loginGradientText: {
    borderRadius: 5,
    fontWeight: '500',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '500',
  },
})
