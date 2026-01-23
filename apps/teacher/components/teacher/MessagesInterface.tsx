'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useRealtimeMessages, type MessageStatus } from '@/hooks/useRealtimeMessages'
import { useTypingIndicator } from '@/hooks/useTypingIndicator'
import { usePresence } from '@/hooks/usePresence'
import { TypingIndicator } from '@/components/ui/TypingIndicator'
import { ReadReceiptTicks, getMessageStatus } from '@/components/ui/ReadReceiptTicks'
import { OnlineStatus } from '@/components/ui/OnlineIndicator'

interface MessagesInterfaceProps {
  teacherId: string
  profileId: string
  schoolId: string
}

interface Conversation {
  partner_profile_id: string
  partner_name: string
  partner_avatar_url?: string
  partner_role: 'teacher' | 'student'
  last_message_body: string
  last_message_at: string
  last_message_sender_type: 'teacher' | 'student'
  unread_count: number
  total_messages: number
  student_id?: string
  section_name?: string
  grade_level?: string
}

interface Message {
  id: string
  from_profile_id: string
  to_profile_id: string
  body: string
  sender_type: 'teacher' | 'student'
  is_read: boolean
  read_at?: string | null
  delivered_at?: string | null
  created_at: string
  tempId?: string
  from_user?: {
    id: string
    full_name: string
    avatar_url?: string
  }
}

interface StudentForMessaging {
  id: string
  profile_id: string
  profile: {
    id: string
    full_name: string
    avatar_url?: string
  }
  section?: {
    id: string
    name: string
    grade_level: string
  }
  grade_level?: string
}

export default function MessagesInterface({ teacherId, profileId, schoolId }: MessagesInterfaceProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [availableStudents, setAvailableStudents] = useState<StudentForMessaging[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Real-time hooks
  const {
    subscribeToConversation,
    unsubscribeFromConversation,
    markAsDelivered,
    markAsRead,
    newMessage,
    updatedMessages,
  } = useRealtimeMessages(profileId)

  const {
    isPartnerTyping,
    partnerTypingState,
    notifyTyping,
    connect: connectTyping,
    disconnect: disconnectTyping,
  } = useTypingIndicator(profileId)

  const { isOnline, getLastSeen } = usePresence(profileId, schoolId)

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load messages and subscribe to real-time when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.partner_profile_id)

      // Subscribe to real-time updates for this conversation
      subscribeToConversation(selectedConversation.partner_profile_id)
      connectTyping(selectedConversation.partner_profile_id, 'Teacher')

      // Mark messages as delivered when opening conversation
      markAsDelivered(selectedConversation.partner_profile_id)
    }

    return () => {
      unsubscribeFromConversation()
      disconnectTyping()
    }
  }, [selectedConversation?.partner_profile_id, subscribeToConversation, connectTyping, markAsDelivered, unsubscribeFromConversation, disconnectTyping])

  // Handle new real-time messages
  useEffect(() => {
    if (newMessage && selectedConversation) {
      // Check if message belongs to current conversation
      const isFromPartner = newMessage.from_profile_id === selectedConversation.partner_profile_id
      const isToPartner = newMessage.to_profile_id === selectedConversation.partner_profile_id

      if (isFromPartner || isToPartner) {
        setMessages((prev) => {
          // Check if message already exists (avoid duplicates)
          const exists = prev.some((m) => m.id === newMessage.id)
          if (exists) return prev
          return [...prev, newMessage as Message]
        })

        // If message is from partner, mark it as read immediately
        if (isFromPartner) {
          markAsRead(selectedConversation.partner_profile_id)
        }

        // Update conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c.partner_profile_id === selectedConversation.partner_profile_id
              ? { ...c, last_message_body: newMessage.body, last_message_at: newMessage.created_at }
              : c
          )
        )
      }
    }
  }, [newMessage, selectedConversation?.partner_profile_id])

  // Handle read receipt updates
  useEffect(() => {
    if (updatedMessages.size > 0) {
      setMessages((prev) =>
        prev.map((msg) => {
          const updated = updatedMessages.get(msg.id)
          if (updated) {
            return {
              ...msg,
              is_read: updated.is_read,
              read_at: updated.read_at,
              delivered_at: updated.delivered_at,
            }
          }
          return msg
        })
      )
    }
  }, [updatedMessages])

  // Notify typing when user types
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessageInput(e.target.value)
      if (selectedConversation && e.target.value.trim()) {
        notifyTyping(true)
      }
    },
    [selectedConversation, notifyTyping]
  )

  const loadConversations = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/messages')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMessages = async (studentProfileId: string) => {
    try {
      const res = await fetch(`/api/messages/${studentProfileId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
        // Update conversation unread count
        setConversations(prev =>
          prev.map(c =>
            c.partner_profile_id === studentProfileId
              ? { ...c, unread_count: 0 }
              : c
          )
        )
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const loadAvailableStudents = async () => {
    try {
      const res = await fetch('/api/messages/students')
      if (res.ok) {
        const data = await res.json()
        setAvailableStudents(data.students || [])
      }
    } catch (error) {
      console.error('Error loading students:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedConversation || !messageInput.trim() || isSending) return

    const messageBody = messageInput.trim()
    const tempId = `temp-${Date.now()}`

    // Stop typing indicator
    notifyTyping(false)

    // Optimistic update - add message with "sending" status
    const optimisticMessage: Message = {
      id: tempId,
      from_profile_id: profileId,
      to_profile_id: selectedConversation.partner_profile_id,
      body: messageBody,
      sender_type: 'teacher',
      is_read: false,
      created_at: new Date().toISOString(),
      tempId, // Flag as optimistic
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setMessageInput('')
    setIsSending(true)

    try {
      const res = await fetch(`/api/messages/${selectedConversation.partner_profile_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageBody }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        // Replace optimistic message with real one
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, id: data.message_id, tempId: undefined }
              : m
          )
        )

        // Update conversation list
        setConversations(prev =>
          prev.map(c =>
            c.partner_profile_id === selectedConversation.partner_profile_id
              ? {
                  ...c,
                  last_message_body: messageBody,
                  last_message_at: new Date().toISOString(),
                  last_message_sender_type: 'teacher' as const,
                }
              : c
          )
        )
      } else {
        // Error - remove optimistic message
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        alert('Failed to send message. Please try again.')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      alert('Failed to send message. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const startNewConversation = (student: StudentForMessaging) => {
    // Check if conversation exists
    const existing = conversations.find(c => c.partner_profile_id === student.profile_id)
    if (existing) {
      setSelectedConversation(existing)
      setShowNewConversation(false)
      return
    }

    // Create new conversation
    const newConversation: Conversation = {
      partner_profile_id: student.profile_id,
      partner_name: student.profile?.full_name || 'Student',
      partner_avatar_url: student.profile?.avatar_url,
      partner_role: 'student',
      last_message_body: '',
      last_message_at: new Date().toISOString(),
      last_message_sender_type: 'teacher',
      unread_count: 0,
      total_messages: 0,
      student_id: student.id,
      section_name: student.section?.name,
      grade_level: student.grade_level || student.section?.grade_level,
    }

    setConversations([newConversation, ...conversations])
    setSelectedConversation(newConversation)
    setMessages([])
    setShowNewConversation(false)
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const filteredStudents = availableStudents.filter(student =>
    student.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.section?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Messages
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Communicate with your students
          </p>
        </div>
        <Button onClick={() => {
          setShowNewConversation(true)
          loadAvailableStudents()
        }}>
          <span className="material-symbols-outlined text-lg">add</span>
          New Message
        </Button>
      </div>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Conversations
            </h2>
            {unreadCount > 0 && (
              <Badge variant="info">
                {unreadCount} unread
              </Badge>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <span className="material-symbols-outlined text-5xl mb-3">chat</span>
              <p>No conversations yet</p>
              <p className="text-sm mt-1">Start by messaging a student</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <button
                  key={conversation.partner_profile_id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`w-full p-4 rounded-lg text-left transition-colors ${
                    selectedConversation?.partner_profile_id === conversation.partner_profile_id
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {conversation.partner_avatar_url ? (
                        <img
                          src={conversation.partner_avatar_url}
                          alt={conversation.partner_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-primary font-semibold">
                          {getInitials(conversation.partner_name)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {conversation.partner_name}
                        </h3>
                        {conversation.unread_count > 0 && (
                          <Badge variant="info" className="ml-2">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                      {(conversation.section_name || conversation.grade_level) && (
                        <p className="text-xs text-slate-500 truncate">
                          {conversation.section_name} {conversation.grade_level && `• ${conversation.grade_level}`}
                        </p>
                      )}
                      <p className={`text-sm truncate mt-1 ${
                        conversation.unread_count > 0
                          ? 'text-slate-900 dark:text-slate-100 font-medium'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {conversation.last_message_sender_type === 'teacher' ? 'You: ' : ''}
                        {conversation.last_message_body || 'No messages yet'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        {formatTime(conversation.last_message_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Chat View */}
        <Card className="lg:col-span-2">
          {selectedConversation ? (
            <div className="flex flex-col h-[600px]">
              {/* Chat Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      {selectedConversation.partner_avatar_url ? (
                        <img
                          src={selectedConversation.partner_avatar_url}
                          alt={selectedConversation.partner_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-primary font-semibold text-lg">
                          {getInitials(selectedConversation.partner_name)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {selectedConversation.partner_name}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Student {selectedConversation.section_name && `• ${selectedConversation.section_name}`}
                      {selectedConversation.grade_level && ` • ${selectedConversation.grade_level}`}
                    </p>
                    <OnlineStatus
                      isOnline={isOnline(selectedConversation.partner_profile_id)}
                      lastSeen={getLastSeen(selectedConversation.partner_profile_id)}
                    />
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <span className="material-symbols-outlined text-5xl mb-3">waving_hand</span>
                    <p>Start the conversation!</p>
                    <p className="text-sm mt-1">Send your first message to this student</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = message.sender_type === 'teacher'
                    const status: MessageStatus = getMessageStatus(message)

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                          <div
                            className={`px-4 py-3 rounded-2xl ${
                              isOwnMessage
                                ? 'bg-primary text-white rounded-br-md'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-md'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{message.body}</p>
                          </div>
                          <div
                            className={`flex items-center gap-1 mt-1 ${
                              isOwnMessage ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <span className="text-xs text-slate-500 dark:text-slate-500">
                              {formatTime(message.created_at)}
                            </span>
                            {isOwnMessage && <ReadReceiptTicks status={status} small />}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}

                {/* Typing Indicator */}
                {isPartnerTyping && selectedConversation && (
                  <div className="flex items-end gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold text-xs">
                        {getInitials(selectedConversation.partner_name)}
                      </span>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3">
                      <TypingIndicator size="sm" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-end gap-3">
                  <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <span className="material-symbols-outlined">attach_file</span>
                  </button>
                  <textarea
                    value={messageInput}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Type a message... (Shift+Enter for new line)"
                    rows={2}
                    className="flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    disabled={isSending}
                  />
                  <Button onClick={handleSendMessage} disabled={isSending || !messageInput.trim()}>
                    {isSending ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : (
                      <span className="material-symbols-outlined">send</span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center">
                <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">
                  chat
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  Select a conversation to start messaging
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Message a Student
              </h2>
              <button
                onClick={() => setShowNewConversation(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4">
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary mb-4"
              />

              <div className="overflow-y-auto max-h-[50vh] space-y-2">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
                    <p>No students found</p>
                  </div>
                ) : (
                  filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => startNewConversation(student)}
                      className="w-full p-4 text-left rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {student.profile?.avatar_url ? (
                            <img
                              src={student.profile.avatar_url}
                              alt={student.profile.full_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-primary font-semibold text-sm">
                              {getInitials(student.profile?.full_name || 'S')}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {student.profile?.full_name || 'Student'}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {student.section?.name} {student.grade_level && `• ${student.grade_level}`}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
