// apps/mobile/src/screens/messages/ChatScreen.tsx
import React, { useReducer, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { useQuery, useMutation } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@telera/convex/_generated/api';
import { useTheme } from '@/providers/ThemeProviders';
import { useAuth } from '@clerk/clerk-expo';
import { MessagesStackParamList } from '@/navigation/types';

type RoutePropType = RouteProp<MessagesStackParamList, 'Chat'>;

interface ChatState {
  message: string;
  isSending: boolean;
  isLoadingMore: boolean;
}

type ChatAction =
  | { type: 'SET_MESSAGE'; message: string }
  | { type: 'SET_SENDING'; value: boolean }
  | { type: 'SET_LOADING_MORE'; value: boolean }
  | { type: 'CLEAR_MESSAGE' };

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_MESSAGE':
      return { ...state, message: action.message };
    case 'SET_SENDING':
      return { ...state, isSending: action.value };
    case 'SET_LOADING_MORE':
      return { ...state, isLoadingMore: action.value };
    case 'CLEAR_MESSAGE':
      return { ...state, message: '' };
    default:
      return state;
  }
};

export function ChatScreen({ route }: { route: RoutePropType }) {
  const { colors, theme } = useTheme();
  const { userId } = useAuth();
  const { threadId } = route.params;
  const flatListRef = useRef<FlatList>(null);

  const [state, dispatch] = useReducer(chatReducer, {
    message: '',
    isSending: false,
    isLoadingMore: false,
  });

  const messages = useQuery(
    api.messages.getMessages,
    { threadId: threadId as any }
  );

  const sendMessage = useMutation(api.messages.sendMessage);
  const markAsRead = useMutation(api.messages.markAsRead);

  const handleSend = useCallback(async () => {
    if (!state.message.trim() || state.isSending) return;

    dispatch({ type: 'SET_SENDING', value: true });

    try {
      await sendMessage({
        threadId: threadId as any,
        body: state.message.trim(),
      });
      
      dispatch({ type: 'CLEAR_MESSAGE' });
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      dispatch({ type: 'SET_SENDING', value: false });
    }
  }, [state.message, state.isSending, threadId, sendMessage]);

  const styles = useMemo(() =>
    StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      messagesList: {
        flex: 1,
        padding: theme.spacing.md,
      },
      messageItem: {
        marginBottom: theme.spacing.md,
      },
      myMessage: {
        alignItems: 'flex-end',
      },
      otherMessage: {
        alignItems: 'flex-start',
      },
      messageBubble: {
        maxWidth: '80%',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
      },
      myBubble: {
        backgroundColor: colors.primary,
      },
      otherBubble: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
      },
      messageText: {
        fontSize: 16,
        fontFamily: theme.fonts.regular,
      },
      myMessageText: {
        color: colors.primaryForeground,
      },
      otherMessageText: {
        color: colors.foreground,
      },
      messageTime: {
        fontSize: 12,
        fontFamily: theme.fonts.regular,
        marginTop: theme.spacing.xs,
      },
      myMessageTime: {
        color: colors.primaryForeground + '99',
      },
      otherMessageTime: {
        color: colors.mutedForeground,
      },
      authorName: {
        fontSize: 12,
        fontFamily: theme.fonts.medium,
        color: colors.mutedForeground,
        marginBottom: theme.spacing.xs,
      },
      inputContainer: {
        flexDirection: 'row',
        padding: theme.spacing.md,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        alignItems: 'flex-end',
      },
      input: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        marginRight: theme.spacing.sm,
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: colors.foreground,
        backgroundColor: colors.input,
        maxHeight: 100,
      },
      sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
      },
      sendButtonDisabled: {
        opacity: 0.5,
      },
    }),
    [colors, theme]
  );

  const renderMessage = useCallback(({ item }: { item: any }) => {
    const isMyMessage = item.author?._id === userId;
    const messageTime = new Date(item.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={[styles.messageItem, isMyMessage ? styles.myMessage : styles.otherMessage]}>
        {!isMyMessage && item.author && (
          <Text style={styles.authorName}>{item.author.name || item.author.email}</Text>
        )}
        
        <View style={[styles.messageBubble, isMyMessage ? styles.myBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
            {item.body}
          </Text>
          <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.otherMessageTime]}>
            {messageTime}
          </Text>
        </View>
      </View>
    );
  }, [styles, userId]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <FlatList
          ref={flatListRef}
          data={messages?.messages || []}
          renderItem={renderMessage}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.messagesList}
          inverted
        />
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={state.message}
            onChangeText={(text) => dispatch({ type: 'SET_MESSAGE', message: text })}
            placeholder="Type a message..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            onSubmitEditing={handleSend}
          />
          
          <TouchableOpacity
            style={[styles.sendButton, state.isSending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={state.isSending || !state.message.trim()}
          >
            <Ionicons name="send" size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}