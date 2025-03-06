import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Switch,
  Modal,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Button,
} from 'react-native'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import DateTimePicker from '@react-native-community/datetimepicker'
import { auth, db } from '../config/firebase'
import {
  doc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { router } from 'expo-router'
import { handleFirebaseError } from '../services/firebase'

const { width } = Dimensions.get('window')

// Types
interface Reminder {
  id: string;
  title: string;
  description?: string;
  date: Timestamp;
  time: string;
  type: 'medication' | 'appointment' | 'exercise' | 'water' | 'other';
  isCompleted: boolean;
  isRecurring: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
  notificationEnabled: boolean;
  createdAt: Timestamp;
}

export default function RemindersScreen() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  
  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date())
  const [time, setTime] = useState('')
  const [type, setType] = useState<Reminder['type']>('medication')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringPattern, setRecurringPattern] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [notificationEnabled, setNotificationEnabled] = useState(true)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active')

  // Check authentication and load reminders
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace('/LoginScreen')
        return
      }
      setUserId(user.uid)
      loadReminders(user.uid)
    })

    return () => unsubscribeAuth()
  }, [])

  // Load reminders from Firestore
  const loadReminders = async (uid: string) => {
    try {
      const remindersRef = collection(db, 'users', uid, 'reminders')
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(
        query(remindersRef, orderBy('date', 'asc')),
        (snapshot) => {
          const remindersList: Reminder[] = []
          snapshot.forEach((doc) => {
            const data = doc.data() as Omit<Reminder, 'id'>
            remindersList.push({
              id: doc.id,
              ...data,
              date: data.date,
              createdAt: data.createdAt || Timestamp.now()
            })
          })
          setReminders(remindersList)
          setLoading(false)
          setRefreshing(false)
        },
        (error) => {
          console.error('Error loading reminders:', error)
          Alert.alert('Error', handleFirebaseError(error))
          setLoading(false)
          setRefreshing(false)
        }
      )
      
      return unsubscribe
    } catch (error) {
      console.error('Error setting up reminders listener:', error)
      Alert.alert('Error', handleFirebaseError(error))
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleAddReminder = async () => {
    if (!userId || !title.trim()) {
      Alert.alert('Error', 'Please enter a title for your reminder')
      return
    }

    try {
      setLoading(true)
      
      // Create the base reminder data
      const reminderData: Record<string, any> = {
        title: title.trim(),
        date: Timestamp.fromDate(date),
        time: time || formatTime(new Date()),
        type,
        isCompleted: false,
        isRecurring,
        notificationEnabled,
        createdAt: Timestamp.now()
      }
      
      // Only add description if it exists
      if (description.trim()) {
        reminderData.description = description.trim();
      }
      
      // Only add recurringPattern if isRecurring is true
      if (isRecurring && recurringPattern) {
        reminderData.recurringPattern = recurringPattern;
      }
      
      if (editingReminder) {
        // Update existing reminder
        await updateDoc(
          doc(db, 'users', userId, 'reminders', editingReminder.id),
          reminderData
        )
      } else {
        // Add new reminder
        await addDoc(
          collection(db, 'users', userId, 'reminders'),
          reminderData
        )
      }
      
      resetForm()
      setModalVisible(false)
    } catch (error) {
      console.error('Error saving reminder:', error)
      Alert.alert('Error', handleFirebaseError(error))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReminder = async (id: string) => {
    if (!userId) return
    
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true)
              await deleteDoc(doc(db, 'users', userId, 'reminders', id))
            } catch (error) {
              console.error('Error deleting reminder:', error)
              Alert.alert('Error', handleFirebaseError(error))
            } finally {
              setLoading(false)
            }
          }
        }
      ]
    )
  }

  const handleToggleComplete = async (reminder: Reminder) => {
    if (!userId) return
    
    try {
      await updateDoc(
        doc(db, 'users', userId, 'reminders', reminder.id),
        { isCompleted: !reminder.isCompleted }
      )
    } catch (error) {
      console.error('Error updating reminder:', error)
      Alert.alert('Error', handleFirebaseError(error))
    }
  }

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder)
    setTitle(reminder.title)
    setDescription(reminder.description || '')
    setDate(reminder.date.toDate())
    setTime(reminder.time)
    setType(reminder.type)
    setIsRecurring(reminder.isRecurring)
    setRecurringPattern(reminder.recurringPattern || 'daily')
    setNotificationEnabled(reminder.notificationEnabled)
    setModalVisible(true)
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setDate(new Date())
    setTime(formatTime(new Date()))
    setType('medication')
    setIsRecurring(false)
    setRecurringPattern('daily')
    setNotificationEnabled(true)
    setEditingReminder(null)
  }

  const onRefresh = useCallback(() => {
    if (!userId) return
    
    setRefreshing(true)
    loadReminders(userId)
  }, [userId])

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate()
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false)
    if (selectedDate) {
      setDate(selectedDate)
    }
  }

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false)
    if (selectedTime) {
      setTime(formatTime(selectedTime))
    }
  }

  const getFilteredReminders = () => {
    switch (filter) {
      case 'active':
        return reminders.filter(r => !r.isCompleted)
      case 'completed':
        return reminders.filter(r => r.isCompleted)
      default:
        return reminders
    }
  }

  const getReminderIcon = (type: Reminder['type']): keyof typeof MaterialCommunityIcons.glyphMap => {
    switch (type) {
      case 'medication':
        return 'pill'
      case 'appointment':
        return 'calendar-clock'
      case 'exercise':
        return 'run'
      case 'water':
        return 'cup-water'
      default:
        return 'bell'
    }
  }

  const getReminderColor = (type: Reminder['type']): string => {
    switch (type) {
      case 'medication':
        return '#FF5722'
      case 'appointment':
        return '#2196F3'
      case 'exercise':
        return '#4CAF50'
      case 'water':
        return '#00BCD4'
      default:
        return '#9C27B0'
    }
  }

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading reminders...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#4CAF50', '#2196F3']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Reminders</Text>
        <Text style={styles.headerSubtitle}>
          Stay on track with your health goals
        </Text>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'active' && styles.activeFilterTab]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterTabText, filter === 'active' && styles.activeFilterTabText]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'completed' && styles.activeFilterTab]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterTabText, filter === 'completed' && styles.activeFilterTabText]}>
            Completed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.activeFilterTabText]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        {getFilteredReminders().length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="notifications-none" size={64} color="#666" />
            <Text style={styles.emptyText}>
              {filter === 'active' 
                ? "You don't have any active reminders" 
                : filter === 'completed' 
                  ? "You don't have any completed reminders"
                  : "You don't have any reminders"}
            </Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to add a new reminder
            </Text>
          </View>
        ) : (
          <View style={styles.remindersList}>
            {getFilteredReminders().map((reminder) => (
              <View key={reminder.id} style={styles.reminderCard}>
                <TouchableOpacity
                  style={[
                    styles.reminderCheckbox,
                    reminder.isCompleted && styles.reminderCheckboxChecked
                  ]}
                  onPress={() => handleToggleComplete(reminder)}
                >
                  {reminder.isCompleted && (
                    <MaterialIcons name="check" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
                
                <View style={styles.reminderContent}>
                  <View style={styles.reminderHeader}>
                    <MaterialCommunityIcons
                      name={getReminderIcon(reminder.type)}
                      size={20}
                      color={getReminderColor(reminder.type)}
                    />
                    <Text style={[
                      styles.reminderTitle,
                      reminder.isCompleted && styles.reminderTitleCompleted
                    ]}>
                      {reminder.title}
                    </Text>
                  </View>
                  
                  {reminder.description && (
                    <Text style={styles.reminderDescription}>
                      {reminder.description}
                    </Text>
                  )}
                  
                  <View style={styles.reminderMeta}>
                    <View style={styles.reminderMetaItem}>
                      <MaterialIcons name="event" size={14} color="#888" />
                      <Text style={styles.reminderMetaText}>
                        {formatDate(reminder.date)}
                      </Text>
                    </View>
                    
                    <View style={styles.reminderMetaItem}>
                      <MaterialIcons name="access-time" size={14} color="#888" />
                      <Text style={styles.reminderMetaText}>
                        {reminder.time}
                      </Text>
                    </View>
                    
                    {reminder.isRecurring && (
                      <View style={styles.reminderMetaItem}>
                        <MaterialIcons name="repeat" size={14} color="#888" />
                        <Text style={styles.reminderMetaText}>
                          {reminder.recurringPattern}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={styles.reminderActions}>
                  <TouchableOpacity
                    style={styles.reminderAction}
                    onPress={() => handleEditReminder(reminder)}
                  >
                    <MaterialIcons name="edit" size={20} color="#2196F3" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.reminderAction}
                    onPress={() => handleDeleteReminder(reminder.id)}
                  >
                    <MaterialIcons name="delete" size={20} color="#F44336" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          resetForm()
          setModalVisible(true)
        }}
      >
        <MaterialIcons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Reminder Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingReminder ? 'Edit Reminder' : 'New Reminder'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter reminder title"
                placeholderTextColor="#666"
              />

              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter description"
                placeholderTextColor="#666"
                multiline
              />

              <Text style={styles.inputLabel}>Date</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialIcons name="event" size={20} color="#4CAF50" />
                <Text style={styles.dateTimeButtonText}>
                  {date.toLocaleDateString()}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                Platform.OS === 'ios' ? (
                  <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerHeader}>
                      <Button 
                        title="Cancel" 
                        onPress={() => setShowDatePicker(false)} 
                      />
                      <Button 
                        title="Done" 
                        onPress={() => setShowDatePicker(false)} 
                      />
                    </View>
                    <DateTimePicker
                          value={date}
                          mode="date"
                          display="spinner"
                          onChange={(event, selectedDate) => {
                            if (selectedDate) {
                              setDate(selectedDate);
                            }
                          }}
                      style={{ backgroundColor: '#2A2A2A' }}
                        />
                  </View>
                ) : (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                            if (selectedDate) {
                              setDate(selectedDate);
                            }
                      }}
                    />
                )
              )}

              <Text style={styles.inputLabel}>Time</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <MaterialIcons name="access-time" size={20} color="#4CAF50" />
                <Text style={styles.dateTimeButtonText}>
                  {time || formatTime(new Date())}
                </Text>
              </TouchableOpacity>

              {showTimePicker && (
                Platform.OS === 'ios' ? (
                  <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerHeader}>
                      <Button 
                        title="Cancel" 
                        onPress={() => setShowTimePicker(false)} 
                      />
                      <Button 
                        title="Done" 
                        onPress={() => setShowTimePicker(false)} 
                      />
                    </View>
                    <DateTimePicker
                          value={date}
                          mode="time"
                          display="spinner"
                          onChange={(event, selectedDate) => {
                            if (selectedDate) {
                              setTime(formatTime(selectedDate));
                            }
                          }}
                      style={{ backgroundColor: '#2A2A2A' }}
                        />
                  </View>
                ) : (
                  <DateTimePicker
                    value={date}
                    mode="time"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowTimePicker(false);
                            if (selectedDate) {
                              setTime(formatTime(selectedDate));
                            }
                      }}
                    />
                )
              )}

              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeSelector}>
                {(['medication', 'appointment', 'exercise', 'water', 'other'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeOption,
                      type === t && { backgroundColor: getReminderColor(t) }
                    ]}
                    onPress={() => setType(t)}
                  >
                    <MaterialCommunityIcons
                      name={getReminderIcon(t)}
                      size={20}
                      color={type === t ? '#fff' : getReminderColor(t)}
                    />
                    <Text style={[
                      styles.typeOptionText,
                      type === t && { color: '#fff' }
                    ]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Recurring Reminder</Text>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{ false: '#333', true: '#4CAF50' }}
                  thumbColor={isRecurring ? '#fff' : '#f4f3f4'}
                />
              </View>

              {isRecurring && (
                <View style={styles.patternSelector}>
                  {(['daily', 'weekly', 'monthly'] as const).map((pattern) => (
                    <TouchableOpacity
                      key={pattern}
                      style={[
                        styles.patternOption,
                        recurringPattern === pattern && styles.patternOptionSelected
                      ]}
                      onPress={() => setRecurringPattern(pattern)}
                    >
                      <Text style={[
                        styles.patternOptionText,
                        recurringPattern === pattern && styles.patternOptionTextSelected
                      ]}>
                        {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Enable Notifications</Text>
                <Switch
                  value={notificationEnabled}
                  onValueChange={setNotificationEnabled}
                  trackColor={{ false: '#333', true: '#4CAF50' }}
                  thumbColor={notificationEnabled ? '#fff' : '#f4f3f4'}
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddReminder}
              >
                <Text style={styles.saveButtonText}>
                  {editingReminder ? 'Update Reminder' : 'Add Reminder'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
    fontSize: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: -16,
    marginBottom: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  filterTabText: {
    color: '#fff',
    fontWeight: '500',
  },
  activeFilterTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  remindersList: {
    gap: 12,
  },
  reminderCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderCheckboxChecked: {
    backgroundColor: '#4CAF50',
  },
  reminderContent: {
    flex: 1,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reminderTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  reminderTitleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  reminderDescription: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
  },
  reminderMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  reminderMetaText: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
  },
  reminderActions: {
    flexDirection: 'column',
    gap: 12,
  },
  reminderAction: {
    padding: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  modalForm: {
    padding: 16,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateTimeButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateTimeButtonText: {
    color: '#fff',
    marginLeft: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: (width - 64) / 2,
  },
  typeOptionText: {
    color: '#fff',
    marginLeft: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    color: '#fff',
    fontSize: 14,
  },
  patternSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  patternOption: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  patternOptionSelected: {
    backgroundColor: '#4CAF50',
  },
  patternOptionText: {
    color: '#fff',
  },
  patternOptionTextSelected: {
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 48,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
  datePickerContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: '#333',
  },
}) 