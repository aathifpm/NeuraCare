import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Animated,
  Keyboard,
} from 'react-native'
import { MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { auth, db } from '../config/firebase'
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  addDoc,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { router } from 'expo-router'
import Constants from 'expo-constants'

const { GoogleGenerativeAI } = require("@google/generative-ai")

// Get API key from environment variables or use a fallback for development
const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey 
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

// Types
interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  message: string;
  timestamp: Timestamp;
  isRecommendation?: boolean;
}

interface UserProfile {
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth?: string;
  gender?: string;
  height?: number;
  weight?: number;
  bloodType?: string;
  allergies?: string[];
  conditions?: string[];
  emergencyContact?: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  profilePicture?: string;
  lastUpdated?: Timestamp;
}

interface HealthData {
  vitals: {
    heartRate: VitalData;
    bloodPressure: VitalData;
    temperature: VitalData;
    oxygenLevel: VitalData;
  };
  metrics: HealthMetric[];
  lastUpdated?: Timestamp;
}

interface VitalData {
  value: number;
  unit: string;
  status: string;
  timestamp: Timestamp;
  goal?: number;
}

interface HealthMetric {
  id: string;
  type: string;
  value: number;
  unit: string;
  timestamp: Timestamp;
  notes?: string;
}

// Initial system prompt to make the AI act as a health assistant
const HEALTH_SYSTEM_PROMPT = `You are a virtual health assistant named Neuracare AI. Your role is to:
1. Provide general health advice and information
2. Help track symptoms and health conditions
3. Offer lifestyle and wellness recommendations
4. Suggest medications, treatments, or first aid when appropriate
5. Handle health-related queries with empathy and professionalism

Important guidelines:
- When suggesting medications or treatments, always include a disclaimer about consulting a healthcare professional
- Tailor your responses based on the user's health profile data when available
- For emergency situations, emphasize seeking immediate medical attention
- Keep responses concise but informative
- Use a friendly, conversational tone
- Format your responses with clear sections and bullet points when appropriate

Remember to personalize your responses based on the user's health data when available.`

const INITIAL_MESSAGE: ChatMessage = {
  id: '1',
  type: 'assistant',
  message: 'Hello! I\'m your Neuracare AI Health Assistant. I can help you with health information, symptom tracking, and personalized wellness advice. How can I assist you today?',
  timestamp: Timestamp.now(),
}

export default function ChatScreen() {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([INITIAL_MESSAGE])
  const [userId, setUserId] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(true)
  const scrollViewRef = useRef<ScrollView>(null)
  const fadeAnim = useRef(new Animated.Value(1)).current

  // Check authentication and load user data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/LoginScreen')
        return
      }
      
      setUserId(user.uid)
      await Promise.all([
        loadUserProfile(user.uid),
        loadHealthData(user.uid),
        loadChatHistory(user.uid)
      ])
      setIsInitializing(false)
    })
    
    return () => unsubscribe()
  }, [])

  // Set up keyboard listeners to hide suggestions when keyboard appears
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setShowSuggestions(false)
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start()
      }
    )
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setShowSuggestions(true)
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start()
      }
    )

    return () => {
      keyboardDidShowListener.remove()
      keyboardDidHideListener.remove()
    }
  }, [])

  // Generate suggested questions based on user profile and health data
  useEffect(() => {
    if (userProfile && healthData) {
      const questions = generateSuggestedQuestions(userProfile, healthData)
      setSuggestedQuestions(questions)
    }
  }, [userProfile, healthData])

  // Load user profile from Firestore
  const loadUserProfile = async (uid: string) => {
    try {
      const userDocRef = doc(db, 'users', uid)
      const userDoc = await getDoc(userDocRef)
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile
        setUserProfile(userData)
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  // Load health data from Firestore
  const loadHealthData = async (uid: string) => {
    try {
      const healthDocRef = doc(db, 'healthData', uid)
      const healthDoc = await getDoc(healthDocRef)
      
      if (healthDoc.exists()) {
        const data = healthDoc.data() as HealthData
        setHealthData(data)
      }
    } catch (error) {
      console.error('Error loading health data:', error)
    }
  }

  // Load chat history from Firestore
  const loadChatHistory = async (uid: string) => {
    try {
      const chatRef = collection(db, 'chats', uid, 'messages')
      const q = query(chatRef, orderBy('timestamp', 'asc'), limit(50))
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages: ChatMessage[] = []
        snapshot.forEach((doc) => {
          messages.push({ id: doc.id, ...doc.data() } as ChatMessage)
        })
        
        if (messages.length > 0) {
          setChatHistory(messages)
        }
      })
      
      return unsubscribe
    } catch (error) {
      console.error('Error loading chat history:', error)
      return () => {}
    }
  }

  // Save message to Firestore
  const saveMessage = async (message: Omit<ChatMessage, 'id'>) => {
    if (!userId) return
    
    try {
      const chatRef = collection(db, 'chats', userId, 'messages')
      await addDoc(chatRef, message)
    } catch (error) {
      console.error('Error saving message:', error)
    }
  }

  // Generate health-specific suggested questions
  const generateSuggestedQuestions = (profile: UserProfile, health: HealthData): string[] => {
    const questions: string[] = [
      "How can I improve my sleep quality?",
      "What are some exercises for stress reduction?",
      "Can you suggest a healthy meal plan?",
    ]
    
    // Add personalized questions based on user data
    if (profile.conditions && profile.conditions.length > 0) {
      questions.push(`What should I know about managing ${profile.conditions[0]}?`)
    }
    
    if (health.vitals.heartRate && health.vitals.heartRate.status === 'high') {
      questions.push("What can I do to lower my heart rate?")
    }
    
    if (profile.allergies && profile.allergies.length > 0) {
      questions.push(`What treatments are available for ${profile.allergies[0]} allergies?`)
    }
    
    return questions.slice(0, 4) // Limit to 4 suggestions
  }

  // Send message to AI and get response
  const sendMessage = async (text: string = message) => {
    if (!text.trim() || !userId) return
    
    const userMessage: Omit<ChatMessage, 'id'> = {
      type: 'user',
      message: text.trim(),
      timestamp: Timestamp.now(),
    }
    
    // Save user message to Firestore
    await saveMessage(userMessage)
    
    // Clear input field
    setMessage('')
    setIsLoading(true)

    try {
      // Prepare health context for the AI
      let healthContext = "User health information:\n"
      
      if (userProfile) {
        healthContext += `Name: ${userProfile.fullName}\n`
        if (userProfile.gender) healthContext += `Gender: ${userProfile.gender}\n`
        if (userProfile.dateOfBirth) healthContext += `Date of Birth: ${userProfile.dateOfBirth}\n`
        if (userProfile.height) healthContext += `Height: ${userProfile.height} cm\n`
        if (userProfile.weight) healthContext += `Weight: ${userProfile.weight} kg\n`
        if (userProfile.bloodType) healthContext += `Blood Type: ${userProfile.bloodType}\n`
        
        if (userProfile.allergies && userProfile.allergies.length > 0) {
          healthContext += `Allergies: ${userProfile.allergies.join(', ')}\n`
        }
        
        if (userProfile.conditions && userProfile.conditions.length > 0) {
          healthContext += `Medical Conditions: ${userProfile.conditions.join(', ')}\n`
        }
      }
      
      if (healthData) {
        healthContext += "Recent Vital Signs:\n"
        
        if (healthData.vitals.heartRate) {
          healthContext += `Heart Rate: ${healthData.vitals.heartRate.value} ${healthData.vitals.heartRate.unit} (${healthData.vitals.heartRate.status})\n`
        }
        
        if (healthData.vitals.bloodPressure) {
          healthContext += `Blood Pressure: ${healthData.vitals.bloodPressure.value} ${healthData.vitals.bloodPressure.unit} (${healthData.vitals.bloodPressure.status})\n`
        }
        
        if (healthData.vitals.temperature) {
          healthContext += `Temperature: ${healthData.vitals.temperature.value} ${healthData.vitals.temperature.unit} (${healthData.vitals.temperature.status})\n`
        }
        
        if (healthData.vitals.oxygenLevel) {
          healthContext += `Oxygen Level: ${healthData.vitals.oxygenLevel.value} ${healthData.vitals.oxygenLevel.unit} (${healthData.vitals.oxygenLevel.status})\n`
        }
      }

      // Prepare conversation context
      const recentMessages = chatHistory
        .slice(-5) // Get last 5 messages for context
        .map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.message}`)
        .join('\n')

      // Combine system prompt, health context, conversation context, and user message
      const prompt = `${HEALTH_SYSTEM_PROMPT}\n\n${healthContext}\n\nRecent conversation:\n${recentMessages}\n\nUser: ${text.trim()}\n\nAssistant:`

      const result = await model.generateContent(prompt)
      const response = await result.response.text()

      // Check if response contains medication or treatment recommendations
      const isRecommendation = containsRecommendation(response)

      const aiResponse: Omit<ChatMessage, 'id'> = {
        type: 'assistant',
        message: response,
        timestamp: Timestamp.now(),
        isRecommendation,
      }

      // Save AI response to Firestore
      await saveMessage(aiResponse)

    } catch (error) {
      console.error('Error getting AI response:', error)
      
      const errorMessage: Omit<ChatMessage, 'id'> = {
        type: 'assistant',
        message: 'I apologize, but I encountered an error. Please try again or rephrase your question. Remember, for any urgent medical concerns, please contact a healthcare professional.',
        timestamp: Timestamp.now(),
      }
      
      await saveMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Check if a message contains medication or treatment recommendations
  const containsRecommendation = (text: string): boolean => {
    const keywords = [
      'medication', 'medicine', 'drug', 'treatment', 'therapy', 'prescription',
      'dose', 'dosage', 'take', 'recommend', 'advise', 'suggest', 'first aid',
      'remedy', 'cure', 'mg', 'milligram', 'tablet', 'capsule', 'syrup', 'injection'
    ]
    
    return keywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  // Clear chat history
  const clearHistory = async () => {
    if (!userId) return
    
    Alert.alert(
      'Clear Chat History',
      'Are you sure you want to clear all chat history? This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // In a real app, you would delete all documents from the collection
              // For now, we'll just reset the local state
              setChatHistory([INITIAL_MESSAGE])
              
              // Save initial message to Firestore
              await saveMessage(INITIAL_MESSAGE)
            } catch (error) {
              console.error('Error clearing chat history:', error)
            }
          },
        },
      ]
    )
  }

  // Handle suggested question tap
  const handleSuggestionTap = (question: string) => {
    sendMessage(question)
  }

  if (isInitializing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading your health assistant...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4CAF50', '#2196F3']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <MaterialCommunityIcons name="robot-happy" size={24} color="#fff" />
            <Text style={styles.headerTitle}>Neuracare AI</Text>
          </View>
          <TouchableOpacity onPress={clearHistory} style={styles.clearButton}>
            <MaterialIcons name="delete-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        {userProfile && (
          <Text style={styles.welcomeText}>
            Hello, {userProfile.fullName.split(' ')[0]}! How can I help you today?
          </Text>
        )}
      </LinearGradient>

      <ScrollView 
        style={styles.chatContainer}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({animated: true})}
      >
        {chatHistory.map(chat => (
          <View key={chat.id}>
            <View
              style={[
                styles.messageContainer,
                chat.type === 'user' ? styles.userMessage : styles.assistantMessage,
              ]}
            >
              {chat.type === 'assistant' && (
                <View style={styles.assistantHeader}>
                  <Image 
                    source={require('../../assets/images/ai-avatar.png')} 
                    style={styles.assistantAvatar}
                    defaultSource={require('../../assets/images/ai-avatar.png')}
                  />
                  <Text style={styles.assistantName}>Neuracare AI</Text>
                </View>
              )}
              <Text style={styles.messageText}>{chat.message}</Text>
              {chat.isRecommendation && (
                <View style={styles.recommendationBadge}>
                  <MaterialIcons name="medical-services" size={14} color="#fff" />
                  <Text style={styles.recommendationText}>Health Recommendation</Text>
                </View>
              )}
            </View>
            <Text style={[
              styles.timestamp,
              chat.type === 'user' ? styles.userTimestamp : styles.assistantTimestamp
            ]}>
              {formatTimestamp(chat.timestamp)}
            </Text>
          </View>
        ))}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <View style={styles.typingIndicator}>
              <View style={styles.typingDot} />
              <View style={[styles.typingDot, {animationDelay: '0.2s'}]} />
              <View style={[styles.typingDot, {animationDelay: '0.4s'}]} />
            </View>
            <Text style={styles.typingText}>Neuracare AI is thinking...</Text>
          </View>
        )}
      </ScrollView>

      {showSuggestions && suggestedQuestions.length > 0 && (
        <Animated.View 
          style={[
            styles.suggestionsContainer,
            { opacity: fadeAnim }
          ]}
        >
          <Text style={styles.suggestionsTitle}>Suggested Questions:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScrollContent}
          >
            {suggestedQuestions.map((question, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionButton}
                onPress={() => handleSuggestionTap(question)}
              >
                <Text style={styles.suggestionText}>{question}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Type your health question..."
          placeholderTextColor="#888"
          multiline
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.sendButton, isLoading && styles.disabledButton]}
          onPress={() => sendMessage()}
          disabled={isLoading}
        >
          <MaterialIcons name="send" size={24} color={isLoading ? "#666" : "#4CAF50"} />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  )
}

// Helper function to format timestamp
const formatTimestamp = (timestamp: Timestamp): string => {
  const date = timestamp.toDate()
  const now = new Date()
  
  // If today, show time only
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  // If this year, show month and day
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
  
  // Otherwise show full date
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 8,
    opacity: 0.9,
  },
  clearButton: {
    padding: 8,
  },
  chatContainer: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    maxWidth: '85%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4CAF50',
    borderTopRightRadius: 4,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#2A2A2A',
    borderTopLeftRadius: 4,
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  assistantAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  assistantName: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  userTimestamp: {
    color: '#888',
    alignSelf: 'flex-end',
    marginRight: 8,
  },
  assistantTimestamp: {
    color: '#888',
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  recommendationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5722',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  recommendationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  input: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    color: '#fff',
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    color: '#4CAF50',
    fontSize: 16,
    marginTop: 12,
  },
  typingIndicator: {
    flexDirection: 'row',
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginHorizontal: 2,
    opacity: 0.6,
  },
  typingText: {
    color: '#888',
    fontSize: 14,
  },
  suggestionsContainer: {
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  suggestionsTitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  suggestionsScrollContent: {
    paddingRight: 16,
  },
  suggestionButton: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  suggestionText: {
    color: '#fff',
    fontSize: 14,
  },
}) 