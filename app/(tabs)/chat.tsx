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
  Easing,
  Modal,
  Dimensions,
  Linking,
} from 'react-native'
import { MaterialIcons, MaterialCommunityIcons, Ionicons, Feather, AntDesign, FontAwesome } from '@expo/vector-icons'
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
  deleteDoc,
  writeBatch,
  updateDoc,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { router } from 'expo-router'
import Constants from 'expo-constants'
import Markdown from 'react-native-markdown-display'

const { GoogleGenerativeAI } = require("@google/generative-ai")

// Get API key from environment variables or use a fallback for development
const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey 
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

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

// Interface for chat session
interface ChatSession {
  id: string;
  title: string;
  createdAt: Timestamp;
  lastUpdated: Timestamp;
  messages: ChatMessage[];
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

// Helper function to format message text with markdown
const formatMessageText = (text: string): string => {
  // Add proper markdown formatting to lists
  let formattedText = text.replace(/^(\d+)\.\s/gm, '$1. ');
  formattedText = formattedText.replace(/^[-*]\s/gm, '- ');
  
  // Enhance headers
  formattedText = formattedText.replace(/^(#+)\s/gm, '$1 ');
  
  // Format bold text that might not be properly formatted
  formattedText = formattedText.replace(/\*\*([^*]+)\*\*/g, '**$1**');
  formattedText = formattedText.replace(/__(.*?)__/g, '**$1**');
  
  // Format italics
  formattedText = formattedText.replace(/\*([^*]+)\*/g, '*$1*');
  formattedText = formattedText.replace(/_([^_]+)_/g, '*$1*');
  
  return formattedText;
};

// Helper function to enhance AI response with markdown
const enhanceResponseWithMarkdown = (text: string): string => {
  let enhancedText = text;
  
  // Add headers to sections that look like headers
  enhancedText = enhancedText.replace(/^(Benefits|Symptoms|Treatment|Prevention|Causes|Risk Factors|Diagnosis|Management|Tips|Advice|Recommendations|Summary|Overview|Conclusion):/gm, '## $1:');
  
  // Add emphasis to important warnings
  enhancedText = enhancedText.replace(/(Note:|Warning:|Important:|Caution:|Disclaimer:)([^.!?]*[.!?])/g, '**$1**$2');
  
  // Format lists better
  enhancedText = enhancedText.replace(/^(\d+)\.\s+/gm, '$1. ');
  enhancedText = enhancedText.replace(/^[-*]\s+/gm, '- ');
  
  // Add blockquotes to disclaimers and important notes
  const disclaimerRegex = /(Disclaimer:|Please note:|Remember:|Important to remember:)([^.!?]*[.!?])/g;
  enhancedText = enhancedText.replace(disclaimerRegex, '> **$1**$2');
  
  return enhancedText;
};

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
  
  // New state for sidebar and sessions
  const [sidebarVisible, setSidebarVisible] = useState(false)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  
  const scrollViewRef = useRef<ScrollView>(null)
  const fadeAnim = useRef(new Animated.Value(1)).current
  const dot1Opacity = useRef(new Animated.Value(0.3)).current
  const dot2Opacity = useRef(new Animated.Value(0.3)).current
  const dot3Opacity = useRef(new Animated.Value(0.3)).current
  const sidebarAnim = useRef(new Animated.Value(-280)).current

  // Check authentication and load user data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/LoginScreen')
        return
      }
      
      setUserId(user.uid)
      
      try {
      await Promise.all([
        loadUserProfile(user.uid),
        loadHealthData(user.uid),
          loadChatSessions(user.uid),
      ])
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
      setIsInitializing(false)
      }
    })
    
    return unsubscribe
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

  // Load chat sessions from Firestore
  const loadChatSessions = async (uid: string) => {
    try {
      const sessionsRef = collection(db, 'users', uid, 'chatSessions')
      const q = query(sessionsRef, orderBy('lastUpdated', 'desc'))
      
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const sessions: ChatSession[] = []
        
        for (const doc of snapshot.docs) {
          const sessionData = doc.data() as Omit<ChatSession, 'messages'>
          
          // Load messages for this session
          const messagesRef = collection(db, 'users', uid, 'chatSessions', doc.id, 'messages')
          const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'))
          const messagesSnapshot = await getDocs(messagesQuery)
          
          const messages: ChatMessage[] = messagesSnapshot.docs.map(msgDoc => ({
            id: msgDoc.id,
            ...msgDoc.data()
          } as ChatMessage))
          
          sessions.push({
            id: doc.id,
            title: sessionData.title,
            createdAt: sessionData.createdAt,
            lastUpdated: sessionData.lastUpdated,
            messages: messages.length > 0 ? messages : [INITIAL_MESSAGE]
          })
        }
        
        setChatSessions(sessions)
        
        // If no sessions exist, create a default one
        if (sessions.length === 0) {
          createNewSession()
        } else if (!currentSessionId || !sessions.find(s => s.id === currentSessionId)) {
          // Set the most recent session as current
          setCurrentSessionId(sessions[0].id)
          setChatHistory(sessions[0].messages)
        }
      })
      
      return unsubscribe
    } catch (error) {
      console.error('Error loading chat sessions:', error)
      return () => {}
    }
  }

  // Create a new chat session
  const createNewSession = async () => {
    if (!userId) return
    
    try {
      const newSession: Omit<ChatSession, 'id' | 'messages'> = {
        title: 'New Chat',
        createdAt: Timestamp.now(),
        lastUpdated: Timestamp.now(),
      }
      
      const sessionsRef = collection(db, 'users', userId, 'chatSessions')
      const docRef = await addDoc(sessionsRef, newSession)
      
      // Save initial message
      const messagesRef = collection(db, 'users', userId, 'chatSessions', docRef.id, 'messages')
      await addDoc(messagesRef, INITIAL_MESSAGE)
      
      // Switch to the new session
      setCurrentSessionId(docRef.id)
      setChatHistory([INITIAL_MESSAGE])
      
      // Close sidebar after creating new chat
      toggleSidebar()
    } catch (error) {
      console.error('Error creating new session:', error)
    }
  }

  // Delete a chat session
  const deleteSession = async (sessionId: string) => {
    if (!userId) return
    
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat? This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the session document
              await deleteDoc(doc(db, 'users', userId, 'chatSessions', sessionId))
              
              // If we deleted the current session, switch to another one
              if (sessionId === currentSessionId) {
                const remainingSessions = chatSessions.filter(s => s.id !== sessionId)
                if (remainingSessions.length > 0) {
                  setCurrentSessionId(remainingSessions[0].id)
                  setChatHistory(remainingSessions[0].messages)
                } else {
                  // If no sessions left, create a new one
                  createNewSession()
                }
              }
            } catch (error) {
              console.error('Error deleting session:', error)
            }
          },
        },
      ]
    )
  }

  // Switch to a different chat session
  const switchSession = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId)
    if (session) {
      setCurrentSessionId(sessionId)
      setChatHistory(session.messages)
      toggleSidebar()
    }
  }

  // Update session title
  const updateSessionTitle = async (sessionId: string, firstMessage: string) => {
    if (!userId) return
    
    try {
      // Generate a title based on the first user message
      let title = firstMessage.substring(0, 20)
      if (firstMessage.length > 20) title += '...'
      
      await updateDoc(doc(db, 'users', userId, 'chatSessions', sessionId), {
        title,
        lastUpdated: Timestamp.now()
      })
    } catch (error) {
      console.error('Error updating session title:', error)
    }
  }

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    if (sidebarVisible) {
      // Hide sidebar
      Animated.timing(sidebarAnim, {
        toValue: -280,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.ease
      }).start(() => setSidebarVisible(false))
    } else {
      // Show sidebar
      setSidebarVisible(true)
      Animated.timing(sidebarAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.ease
      }).start()
    }
  }

  // Save message to current session
  const saveMessage = async (message: Omit<ChatMessage, 'id'>) => {
    if (!userId || !currentSessionId) return
    
    try {
      const messagesRef = collection(db, 'users', userId, 'chatSessions', currentSessionId, 'messages')
      const docRef = await addDoc(messagesRef, message)
      
      // Update session's lastUpdated timestamp
      await updateDoc(doc(db, 'users', userId, 'chatSessions', currentSessionId), {
        lastUpdated: Timestamp.now()
      })
      
      // If this is the first user message, update the session title
      if (message.type === 'user' && chatHistory.length <= 1) {
        updateSessionTitle(currentSessionId, message.message)
      }
      
      return docRef.id
    } catch (error) {
      console.error('Error saving message:', error)
    }
  }

  // Clear current chat history
  const clearHistory = async () => {
    if (!userId || !currentSessionId) return
    
    Alert.alert(
      'Clear Chat History',
      'Are you sure you want to clear this chat? This cannot be undone.',
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
              // Delete all messages in the current session
              const messagesRef = collection(db, 'users', userId, 'chatSessions', currentSessionId, 'messages')
              const messagesSnapshot = await getDocs(messagesRef)
              
              const batch = writeBatch(db)
              messagesSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref)
              })
              
              await batch.commit()
              
              // Add initial message back
              await addDoc(messagesRef, INITIAL_MESSAGE)
              
              // Update local state
              setChatHistory([INITIAL_MESSAGE])
              
              // Update session title and timestamp
              await updateDoc(doc(db, 'users', userId, 'chatSessions', currentSessionId), {
                title: 'New Chat',
                lastUpdated: Timestamp.now()
              })
            } catch (error) {
              console.error('Error clearing chat history:', error)
            }
          },
        },
      ]
    )
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

  // Modified sendMessage function to work with sessions
  const sendMessage = async (text: string = message) => {
    if (!text.trim() || isLoading) return
    
    setIsLoading(true)
    setMessage('')
    Keyboard.dismiss()
    
    // Hide suggestions after sending a message
    if (showSuggestions) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowSuggestions(false)
      })
    }
    
    // Add user message to chat
    const userMessage: Omit<ChatMessage, 'id'> = {
      type: 'user',
      message: text,
      timestamp: Timestamp.now(),
    }
    
    // Save to Firestore and get the ID
    const userMessageId = await saveMessage(userMessage)
    
    // Update local state
    setChatHistory(prev => [...prev, { ...userMessage, id: userMessageId || Date.now().toString() }])
    
    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)

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

      // Enhance the response with better markdown formatting
      const enhancedResponse = enhanceResponseWithMarkdown(response)

      // Check if response contains medication or treatment recommendations
      const isRecommendation = containsRecommendation(enhancedResponse)

      const aiResponse: Omit<ChatMessage, 'id'> = {
        type: 'assistant',
        message: enhancedResponse,
        timestamp: Timestamp.now(),
        isRecommendation,
      }

      // Save AI response to Firestore
      const aiMessageId = await saveMessage(aiResponse)

      // Update local state
      setChatHistory(prev => [...prev, { ...aiResponse, id: aiMessageId || Date.now().toString() }])
    } catch (error) {
      console.error('Error sending message:', error)
      Alert.alert('Error', 'Failed to get a response. Please try again.')
    } finally {
      setIsLoading(false)
      
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
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

  // Animation function for typing indicator
  const animateTypingIndicator = () => {
    // Reset values
    dot1Opacity.setValue(0.3);
    dot2Opacity.setValue(0.3);
    dot3Opacity.setValue(0.3);
    
    // Create sequence of animations
    Animated.loop(
      Animated.sequence([
        // First dot
        Animated.timing(dot1Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.ease
        }),
        // Second dot
        Animated.timing(dot2Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.ease
        }),
        // Third dot
        Animated.timing(dot3Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.ease
        }),
        // Reset all dots
        Animated.timing(dot1Opacity, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.ease
        }),
        Animated.timing(dot2Opacity, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.ease
        }),
        Animated.timing(dot3Opacity, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.ease
        })
      ])
    ).start();
  };
  
  // Start animation when loading state changes
  useEffect(() => {
    if (isLoading) {
      animateTypingIndicator();
    }
  }, [isLoading]);

  if (isInitializing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#00BFFF" />
        <Text style={styles.loadingText}>Loading your health assistant...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Sidebar Overlay */}
      {sidebarVisible && (
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <Animated.View style={[
        styles.sidebar,
        { transform: [{ translateX: sidebarAnim }] }
      ]}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>Chat History</Text>
          <TouchableOpacity 
            style={styles.newChatButton}
            onPress={createNewSession}
          >
            <AntDesign name="plus" size={20} color="#fff" />
            <Text style={styles.newChatText}>New Chat</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.sessionsList}>
          {chatSessions.map(session => (
            <TouchableOpacity
              key={session.id}
              style={[
                styles.sessionItem,
                currentSessionId === session.id && styles.activeSessionItem
              ]}
              onPress={() => switchSession(session.id)}
            >
              <View style={styles.sessionInfo}>
                <MaterialIcons 
                  name="chat-bubble-outline" 
                  size={20} 
                  color={currentSessionId === session.id ? "#00BFFF" : "#888"} 
                />
                <Text 
                  style={[
                    styles.sessionTitle,
                    currentSessionId === session.id && styles.activeSessionTitle
                  ]}
                  numberOfLines={1}
                >
                  {session.title}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteSession(session.id)}
              >
                <MaterialIcons name="delete-outline" size={20} color="#888" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
      
      <View style={styles.headerWrapper}>
        <LinearGradient
          colors={['#00BFFF', '#1E90FF', '#4169E1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerBorder}
        />
        <View style={[styles.header, { paddingVertical:8 }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={toggleSidebar}
            >
              <Feather name="menu" size={24} color="#00BFFF" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <MaterialCommunityIcons name="robot-happy" size={24} color="#00BFFF" />
              <Text style={styles.headerTitle}>Neuracare AI</Text>
            </View>
            <TouchableOpacity onPress={clearHistory} style={styles.clearButton}>
              <MaterialIcons name="delete-outline" size={24} color="#00BFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

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
              
              {chat.type === 'user' ? (
                <Text style={styles.messageText}>{chat.message}</Text>
              ) : (
                <Markdown
                  style={markdownStyles}
                  rules={{
                    link: (node, children, parent, styles) => {
                      return (
                        <TouchableOpacity 
                          key={node.key} 
                          onPress={() => Linking.openURL(node.attributes.href)}
                        >
                          <Text style={markdownStyles.link}>
                            {children}
                          </Text>
                        </TouchableOpacity>
                      )
                    },
                    list_item: (node, children, parent, styles) => {
                      return (
                        <View key={node.key} style={markdownStyles.listItemContainer}>
                          <Text style={markdownStyles.listItemBullet}>•</Text>
                          <View style={markdownStyles.listItemContent}>
                            {children}
                          </View>
                        </View>
                      )
                    },
                  }}
                >
                  {formatMessageText(chat.message)}
                </Markdown>
              )}
              
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
              <Animated.View style={[styles.typingDot, { opacity: dot1Opacity }]} />
              <Animated.View style={[styles.typingDot, { opacity: dot2Opacity }]} />
              <Animated.View style={[styles.typingDot, { opacity: dot3Opacity }]} />
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
                onPress={() => sendMessage(question)}
              >
                <LinearGradient
                  colors={['#00BFFF', '#1E90FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.suggestionButton}
              >
                <Text style={styles.suggestionText}>{question}</Text>
                </LinearGradient>
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
          onPress={() => sendMessage()}
          disabled={isLoading}
        >
          <LinearGradient
            colors={['#00BFFF', '#1E90FF', '#4169E1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.sendButton, isLoading && styles.disabledButton]}
          >
            <MaterialIcons name="send" size={24} color="#fff" />
          </LinearGradient>
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
  headerWrapper: {
    position: 'relative',
    marginBottom: 8,
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
  },
  headerBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    height: Platform.OS === 'ios' ? 100 : 80,
    opacity: 0.2,
  },
  header: {
    padding: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#00BFFF',
    backgroundColor: 'transparent',
    zIndex: 1,
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
    color: '#00BFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  welcomeText: {
    color: '#00BFFF',
    fontSize: 14,
    marginTop: 4,
  },
  clearButton: {
    padding: 8,
  },
  chatContainer: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
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
    backgroundColor: 'rgba(0, 191, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00BFFF',
    borderTopRightRadius: 4,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#1E90FF',
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
    color: '#00BFFF',
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
    backgroundColor: 'rgba(65, 105, 225, 0.8)',
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
    borderWidth: 1,
    borderColor: '#00BFFF',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    color: '#00BFFF',
    fontSize: 16,
    marginTop: 12,
  },
  typingIndicator: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E90FF',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00BFFF',
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginRight: 8,
  },
  suggestionText: {
    color: '#fff',
    fontSize: 14,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#1A1A1A',
    zIndex: 20,
    borderRightWidth: 1,
    borderRightColor: '#333',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  sidebarHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sidebarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00BFFF',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  newChatText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  sessionsList: {
    flex: 1,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  activeSessionItem: {
    backgroundColor: 'rgba(0, 191, 255, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#00BFFF',
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionTitle: {
    color: '#888',
    marginLeft: 12,
    fontSize: 14,
    flex: 1,
  },
  activeSessionTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 8,
  },
  menuButton: {
    padding: 8,
    marginRight: 8,
  },
})

// Add markdown styles at the end of the file
const markdownStyles = StyleSheet.create({
  body: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  heading1: {
    color: '#00BFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 8,
  },
  heading2: {
    color: '#00BFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 6,
  },
  heading3: {
    color: '#00BFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 6,
    marginBottom: 4,
  },
  heading4: {
    color: '#00BFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
    marginBottom: 2,
  },
  heading5: {
    color: '#00BFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
    marginBottom: 1,
  },
  heading6: {
    color: '#00BFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 1,
    marginBottom: 0.5,
  },
  hr: {
    backgroundColor: '#333',
    height: 1,
    marginVertical: 12,
  },
  strong: {
    fontWeight: 'bold',
    color: '#fff',
  },
  em: {
    fontStyle: 'italic',
    color: '#fff',
  },
  link: {
    color: '#00BFFF',
    textDecorationLine: 'underline',
  },
  blockquote: {
    backgroundColor: 'rgba(0, 191, 255, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#00BFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 8,
  },
  code_inline: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: '#00BFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    padding: 4,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: '#00BFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    padding: 8,
    borderRadius: 4,
    marginVertical: 8,
  },
  list_item: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  listItemContainer: {
    flexDirection: 'row',
    marginVertical: 2,
    alignItems: 'flex-start',
  },
  listItemBullet: {
    color: '#00BFFF',
    marginRight: 8,
    fontSize: 16,
    lineHeight: 24,
  },
  listItemContent: {
    flex: 1,
  },
  ordered_list: {
    marginVertical: 8,
  },
  bullet_list: {
    marginVertical: 8,
  },
  table: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 4,
    marginVertical: 8,
  },
  thead: {
    backgroundColor: 'rgba(0, 191, 255, 0.1)',
  },
  th: {
    padding: 8,
    fontWeight: 'bold',
    color: '#00BFFF',
  },
  td: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
}); 