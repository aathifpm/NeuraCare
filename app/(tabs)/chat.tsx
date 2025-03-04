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
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { GEMINI_API_KEY } from '@env'
const { GoogleGenerativeAI } = require("@google/generative-ai")

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

// Constants for local storage
const CHAT_HISTORY_KEY = 'health_chat_history'
const USER_HEALTH_PROFILE_KEY = 'user_health_profile'

// Add types for chat messages
interface ChatMessage {
  id: number;
  type: 'user' | 'assistant';
  message: string;
}

// Initial system prompt to make the AI act as a health assistant
const HEALTH_SYSTEM_PROMPT = `You are a virtual health assistant. Your role is to:
1. Provide general health advice and information
2. Help track symptoms and health conditions
3. Offer lifestyle and wellness recommendations
4. Remind users that you're not a replacement for professional medical care
5. Handle health-related queries with empathy and professionalism

Important: Always include a disclaimer when providing health-related advice.`

const INITIAL_MESSAGE: ChatMessage = {
  id: 1,
  type: 'assistant',
  message: 'Hello! I\'m your Neuracare AI Health Assistant. I can help you with general health information, symptom tracking, and wellness advice. Please note that I\'m not a replacement for professional medical care. How can I assist you today?',
}

export default function ChatScreen() {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([INITIAL_MESSAGE])
  const scrollViewRef = useRef<ScrollView>(null)

  // Load chat history from local storage
  useEffect(() => {
    loadChatHistory()
  }, [])

  const loadChatHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem(CHAT_HISTORY_KEY)
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory) as ChatMessage[]
        setChatHistory(parsed)
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
    }
  }

  const saveChatHistory = async (history: ChatMessage[]) => {
    try {
      await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history))
    } catch (error) {
      console.error('Error saving chat history:', error)
    }
  }

  const sendMessage = async () => {
    if (message.trim()) {
      const userMessage: ChatMessage = {
        id: Date.now(),
        type: 'user',
        message: message.trim()
      }
      const updatedHistory = [...chatHistory, userMessage]
      setChatHistory(updatedHistory)
      setMessage('')
      setIsLoading(true)

      try {
        // Prepare context for the AI
        const conversationContext = chatHistory
          .slice(-5) // Get last 5 messages for context
          .map(msg => msg.message)
          .join('\n')

        // Combine system prompt, context, and user message
        const prompt = `${HEALTH_SYSTEM_PROMPT}\n\nPrevious conversation:\n${conversationContext}\n\nUser: ${userMessage.message}\n\nAssistant:`

        const result = await model.generateContent(prompt)
        const response = await result.response.text()

        const aiResponse: ChatMessage = {
          id: Date.now(),
          type: 'assistant',
          message: response,
        }

        const newHistory = [...updatedHistory, aiResponse]
        setChatHistory(newHistory)
        await saveChatHistory(newHistory)

      } catch (error) {
        console.error('Error getting AI response:', error)
        const errorMessage: ChatMessage = {
          id: Date.now(),
          type: 'assistant',
          message: 'I apologize, but I encountered an error. Please try again or rephrase your question. Remember, for any urgent medical concerns, please contact a healthcare professional.',
        }
        const newHistory = [...updatedHistory, errorMessage]
        setChatHistory(newHistory)
        await saveChatHistory(newHistory)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const clearHistory = async () => {
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
              await AsyncStorage.removeItem(CHAT_HISTORY_KEY)
              setChatHistory([INITIAL_MESSAGE])
            } catch (error) {
              console.error('Error clearing chat history:', error)
            }
          },
        },
      ]
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4CAF50', '#2196F3']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Health Assistant</Text>
          <TouchableOpacity onPress={clearHistory} style={styles.clearButton}>
            <MaterialIcons name="delete-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.chatContainer}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({animated: true})}
      >
        {chatHistory.map(chat => (
          <View
            key={chat.id}
            style={[
              styles.messageContainer,
              chat.type === 'user' ? styles.userMessage : styles.assistantMessage,
            ]}
          >
            <Text style={styles.messageText}>{chat.message}</Text>
          </View>
        ))}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#4CAF50" />
          </View>
        )}
      </ScrollView>

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
          onPress={sendMessage}
          disabled={isLoading}
        >
          <MaterialIcons name="send" size={24} color={isLoading ? "#666" : "#4CAF50"} />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
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
    marginVertical: 8,
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4CAF50',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#2196F3',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    color: '#fff',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  loadingContainer: {
    padding: 10,
    alignItems: 'center',
  },
}) 