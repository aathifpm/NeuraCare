import { StyleSheet, Dimensions } from 'react-native'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 300,
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRightWidth: 1,
    borderRightColor: '#333',
    zIndex: 1000,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  drawerHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  newChatButton: {
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
  },
  sessionsList: {
    flex: 1,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  activeSession: {
    backgroundColor: '#2A2A2A',
  },
  sessionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  sessionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sessionLastMessage: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
    marginRight: 8,
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
  chatContainer: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
    marginBottom: 4,
  },
  userMessage: {
    backgroundColor: '#2196F3',
    alignSelf: 'flex-end',
    borderTopRightRadius: 4,
  },
  assistantMessage: {
    backgroundColor: '#333',
    alignSelf: 'flex-start',
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
    color: '#fff',
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
    marginBottom: 12,
  },
  userTimestamp: {
    color: '#888',
    textAlign: 'right',
    marginRight: 8,
  },
  assistantTimestamp: {
    color: '#888',
    marginLeft: 8,
  },
  recommendationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  recommendationText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  loadingContainer: {
    padding: 16,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginHorizontal: 2,
  },
  typingText: {
    color: '#888',
    fontSize: 14,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#1E1E1E',
  },
  input: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
  },
  disabledButton: {
    opacity: 0.5,
  },
})

export default styles