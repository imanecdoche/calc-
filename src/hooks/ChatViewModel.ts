import { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '../models/User';
import { Message } from '../models/Message';
import { AuthRepository } from '../repositories/AuthRepository';
import { UserRepository } from '../repositories/UserRepository';
import { ConversationRepository } from '../repositories/ConversationRepository';
import { RealtimeChatService } from '../services/RealtimeChatService';
import { SessionCleaner } from '../services/SessionCleaner';

import { ConnectionManager, ConnectionState } from '../services/ConnectionManager';
import { TypingManager } from '../services/TypingManager';
import { MessageStatusManager } from '../services/MessageStatusManager';

// M3 Phase 3.6 Structure additions
import { ReplyManager, ReplyState } from '../services/ReplyManager';
import { ClipboardManager } from '../services/ClipboardManager';
import { RetryQueue } from '../services/RetryQueue';
import { PaginationManager } from '../services/PaginationManager';
import { OfflineQueueManager } from '../services/OfflineQueueManager';

import { doc, updateDoc, onSnapshot, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/FirebaseModule';

const authRepository = new AuthRepository();
const userRepository = new UserRepository();
const conversationRepository = new ConversationRepository();
const realtimeChatService = new RealtimeChatService();
const sessionCleaner = SessionCleaner.getInstance();

const connectionManager = ConnectionManager.getInstance();
const typingManager = new TypingManager();
const messageStatusManager = new MessageStatusManager();

export function useChatViewModel() {
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [myUserHasPassword, setMyUserHasPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTargetUser, setActiveTargetUser] = useState<User | null>(null);
  
  // Storage for firestore loaded messages
  const [rawMessages, setRawMessages] = useState<Message[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [targetIsTyping, setTargetIsTyping] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [connectingToUser, setConnectingToUser] = useState<boolean>(false);

  // M3 Phase 3.6 State hooks
  const [replyingTo, setReplyingTo] = useState<ReplyState | null>(null);
  const [deletedLocalIds, setDeletedLocalIds] = useState<string[]>([]);
  const [localSendingMessages, setLocalSendingMessages] = useState<Message[]>([]);
  const [failedMessageIds, setFailedMessageIds] = useState<string[]>([]);
  const [isSendingLock, setIsSendingLock] = useState<boolean>(false);
  const [hasMoreHistory, setHasMoreHistory] = useState<boolean>(true);

  // Instances for Managers
  const replyManager = useMemo(() => new ReplyManager(), []);
  const clipboardManager = useMemo(() => ClipboardManager.getInstance(), []);
  const retryQueue = useMemo(() => RetryQueue.getInstance(), []);
  const offlineQueueManager = useMemo(() => OfflineQueueManager.getInstance(), []);
  const paginationManager = useMemo(() => new PaginationManager(50), []);

  // 1. Silent Anonymous Auth and fetch profile on mount
  useEffect(() => {
    let active = true;

    const setupAuthAndProfile = async (uid: string) => {
      if (!active) return;
      setAuthUid(uid);
      try {
        const profile = await userRepository.getUserByUid(uid);
        if (active) {
          if (profile) {
            setMyUsername(profile.username);
            setMyUserHasPassword(!!(profile as any).password);
          } else {
            setMyUsername(null);
            setMyUserHasPassword(false);
          }
        }
      } catch (err) {
        console.error('Error fetching profile for UID:', uid, err);
        if (active) {
          setMyUsername(null);
          setMyUserHasPassword(false);
        }
      }
      if (active) setIsLoading(false);
    };

    const unsubscribeAuth = authRepository.listenToAuthState(async (user) => {
      setIsLoading(true);
      if (user) {
        setupAuthAndProfile(user.uid);
      } else {
        // Sign in anonymously automatically
        try {
          const newUser = await authRepository.loginAnonymously();
          setupAuthAndProfile(newUser.uid);
        } catch (err) {
          console.warn('Firebase silent anonymous sign in restricted, using client-side unique session:', err);
          let fallbackUid = localStorage.getItem('calcplus_anon_fallback_uid');
          if (!fallbackUid) {
            fallbackUid = 'anon_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
            localStorage.setItem('calcplus_anon_fallback_uid', fallbackUid);
          }
          setupAuthAndProfile(fallbackUid);
        }
      }
    });

    return () => {
      active = false;
      unsubscribeAuth();
    };
  }, []);

  // 2. Subscribe to general Connection State
  useEffect(() => {
    const unsubscribe = connectionManager.subscribe((state) => {
      setConnectionState(state);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // 3. Auto flush offline messages on network return
  useEffect(() => {
    if (!myUsername || !activeTargetUser) return;
    const conversationId = conversationRepository.generateConversationId(myUsername, activeTargetUser.username);

    // Auto flush routine
    offlineQueueManager.startAutoFlush(async (offlineMsg) => {
      try {
        await realtimeChatService.sendMessage(
          conversationId,
          offlineMsg.senderId,
          offlineMsg.receiverId,
          offlineMsg.text
        );
        // Remove locally from sending status
        setLocalSendingMessages((prev) => prev.filter((m) => m.id !== offlineMsg.id));
        return true;
      } catch (err) {
        console.error('Failed to flush offline message automatically:', err);
        return false;
      }
    });
  }, [myUsername, activeTargetUser, offlineQueueManager]);

  // Load locally deleted message IDs for current conversation
  useEffect(() => {
    if (activeTargetUser && myUsername) {
      const conversationId = conversationRepository.generateConversationId(myUsername, activeTargetUser.username);
      const saved = localStorage.getItem(`calcplus_deleted_me_${conversationId}`);
      if (saved) {
        try {
          setDeletedLocalIds(JSON.parse(saved));
        } catch (e) {
          setDeletedLocalIds([]);
        }
      } else {
        setDeletedLocalIds([]);
      }
    }
  }, [activeTargetUser, myUsername]);

  // 4. Register user's own unique username
  const registerMyUsername = useCallback(async (username: string, passwordVal: string): Promise<{ success: boolean; error?: string }> => {
    if (!authUid) {
      return { success: false, error: 'Koneksi offline. Silakan coba lagi.' };
    }
    setErrorMsg(null);
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanUsername) {
      return { success: false, error: 'Username tidak boleh kosong.' };
    }
    if (!passwordVal || passwordVal.trim().length < 4) {
      return { success: false, error: 'Password minimal harus 4 karakter.' };
    }

    try {
      const isRegistered = await userRepository.registerUsername(authUid, cleanUsername, passwordVal.trim());
      if (isRegistered) {
        setMyUsername(cleanUsername);
        setMyUserHasPassword(true);
        return { success: true };
      } else {
        return { success: false, error: 'Username sudah digunakan oleh orang lain. Silakan buat yang unik.' };
      }
    } catch (err) {
      console.error('Registration error:', err);
      return { success: false, error: 'Username sudah terdaftar.' };
    }
  }, [authUid]);

  // Login to existing account
  const loginToExistingAccount = useCallback(async (username: string, passwordVal: string): Promise<{ success: boolean; error?: string }> => {
    if (!authUid) {
      return { success: false, error: 'Koneksi offline. Silakan coba lagi.' };
    }
    setErrorMsg(null);
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanUsername || !passwordVal) {
      return { success: false, error: 'Username dan sandi tidak boleh kosong.' };
    }

    try {
      const res = await userRepository.loginToExistingAccount(authUid, cleanUsername, passwordVal);
      if (res.success) {
        setMyUsername(cleanUsername);
        setMyUserHasPassword(true);
        return { success: true };
      } else {
        return { success: false, error: res.error || 'Login gagal.' };
      }
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Gagal menghubungkan. Silakan coba lagi.' };
    }
  }, [authUid]);

  // Update password for existing user
  const updateMyPassword = useCallback(async (passwordVal: string): Promise<{ success: boolean; error?: string }> => {
    if (!authUid || !myUsername) {
      return { success: false, error: 'Sesi aktif tidak ditemukan.' };
    }
    if (!passwordVal || passwordVal.trim().length < 4) {
      return { success: false, error: 'Password minimal 4 karakter.' };
    }

    try {
      const isSuccess = await userRepository.updateUserPassword(authUid, passwordVal.trim());
      if (isSuccess) {
        setMyUserHasPassword(true);
        return { success: true };
      } else {
        return { success: false, error: 'Gagal memperbarui password.' };
      }
    } catch (err) {
      console.error('Update password error:', err);
      return { success: false, error: 'Gagal memperbarui password.' };
    }
  }, [authUid, myUsername]);

  // Disassociate/delete current user registration mapping for Logout
  const logout = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!authUid) {
      return { success: false, error: 'Sesi aktif tidak ditemukan.' };
    }
    try {
      await userRepository.deleteUser(authUid);
      setMyUsername(null);
      setMyUserHasPassword(false);
      setActiveTargetUser(null);
      return { success: true };
    } catch (err: any) {
      console.error('Logout error:', err);
      return { success: false, error: 'Gagal melakukan logout dari server.' };
    }
  }, [authUid]);

  // 5. Connect to a target username with explicit Loading state
  const connectToUser = useCallback(async (targetUsername: string): Promise<boolean> => {
    setErrorMsg(null);
    const cleanTarget = targetUsername.trim().toLowerCase();
    
    if (!myUsername || !authUid) {
      setErrorMsg('Self identity not established.');
      return false;
    }

    if (cleanTarget === myUsername) {
      setErrorMsg('Cannot connect to your own username.');
      return false;
    }

    try {
      setConnectingToUser(true);
      const targetUser = await userRepository.getUserByUsername(cleanTarget);
      
      if (targetUser) {
        // Create or get conversation
        await conversationRepository.getOrCreateConversation(
          myUsername,
          authUid,
          targetUser.username,
          (targetUser as any).uid || ''
        );
        
        setActiveTargetUser(targetUser);
        paginationManager.reset();
        setConnectingToUser(false);
        return true;
      } else {
        setErrorMsg('User not found.');
        setConnectingToUser(false);
        return false;
      }
    } catch (err) {
      console.error('Connect error:', err);
      setErrorMsg('User not found.');
      setConnectingToUser(false);
      return false;
    }
  }, [myUsername, authUid, paginationManager]);

  // 6. Send Message with local Optimistic 'sending' state, Duplicate Protection, Offline Queue
  const sendMessage = useCallback(async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText || !myUsername || !activeTargetUser) return;

    // DUPLICATE PROTECTION: Avoid double triggers on rapid spamming
    if (isSendingLock) return;
    setIsSendingLock(true);

    const conversationId = conversationRepository.generateConversationId(myUsername, activeTargetUser.username);
    const tempId = 'temp_' + Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7);

    // Assemble payload with potential active Reply context
    let payload: Partial<Message> = {
      id: tempId,
      senderId: myUsername,
      receiverId: activeTargetUser.username,
      text: cleanText,
      timestamp: Date.now(),
      status: 'sending'
    };

    // Apply Reply context if exists
    if (replyingTo) {
      payload.replyToId = replyingTo.messageId;
      payload.replyToText = replyingTo.text;
      payload.replyToSender = replyingTo.senderId;
      // Clear reply state
      setReplyingTo(null);
      replyManager.clearReply();
    }

    const tempMessage = payload as Message;

    // Check offline state
    if (connectionState === 'offline') {
      offlineQueueManager.enqueue(tempMessage);
      setLocalSendingMessages((prev) => [...prev, tempMessage]);
      setIsSendingLock(false);
      return;
    }

    // Append to local sending track
    setLocalSendingMessages((prev) => [...prev, tempMessage]);

    try {
      const messagesCollection = collection(db, 'conversations', conversationId, 'messages');
      await addDoc(messagesCollection, {
        senderId: tempMessage.senderId,
        receiverId: tempMessage.receiverId,
        text: tempMessage.text,
        timestamp: tempMessage.timestamp,
        status: 'sent',
        ...(tempMessage.replyToId ? {
          replyToId: tempMessage.replyToId,
          replyToText: tempMessage.replyToText,
          replyToSender: tempMessage.replyToSender
        } : {})
      });

      // Update parent conversation activity
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        lastActivity: tempMessage.timestamp
      });

      // Successfully synced, remove from local temp list
      setLocalSendingMessages((prev) => prev.filter((m) => m.id !== tempId));
    } catch (err) {
      console.error('Error sending message:', err);
      // Move message to failed queue
      retryQueue.addFailedMessage(tempMessage);
      setFailedMessageIds((prev) => [...prev, tempId]);
      
      // Update local message state to failed
      setLocalSendingMessages((prev) => 
        prev.map((m) => m.id === tempId ? { ...m, status: 'failed' } : m)
      );

      setErrorMsg('Failed to send. Click retry option to resend.');
    } finally {
      setIsSendingLock(false);
    }
  }, [myUsername, activeTargetUser, replyingTo, isSendingLock, connectionState, replyManager, offlineQueueManager, retryQueue]);

  // Retry sending a failed message
  const handleRetryMessage = useCallback(async (msg: Message) => {
    if (!activeTargetUser || !myUsername) return;
    const conversationId = conversationRepository.generateConversationId(myUsername, activeTargetUser.username);

    // Update status to sending
    setLocalSendingMessages((prev) => 
      prev.map((m) => m.id === msg.id ? { ...m, status: 'sending' } : m)
    );
    setFailedMessageIds((prev) => prev.filter((id) => id !== msg.id));
    retryQueue.removeFailedMessage(msg.id);

    try {
      const messagesCollection = collection(db, 'conversations', conversationId, 'messages');
      await addDoc(messagesCollection, {
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        text: msg.text,
        timestamp: Date.now(), // Update timestamp to current
        status: 'sent',
        ...(msg.replyToId ? {
          replyToId: msg.replyToId,
          replyToText: msg.replyToText,
          replyToSender: msg.replyToSender
        } : {})
      });

      // Remove from local sending array on success
      setLocalSendingMessages((prev) => prev.filter((m) => m.id !== msg.id));
    } catch (err) {
      console.error('Retry failed:', err);
      retryQueue.addFailedMessage(msg);
      setFailedMessageIds((prev) => [...prev, msg.id]);
      setLocalSendingMessages((prev) => 
        prev.map((m) => m.id === msg.id ? { ...m, status: 'failed' } : m)
      );
      setErrorMsg('Firestore timeout. Retry again.');
    }
  }, [myUsername, activeTargetUser, retryQueue]);

  // 7. Manage Active Reply preview
  const handleSetReply = useCallback((msg: Message) => {
    replyManager.setReplyTo(msg);
    setReplyingTo(replyManager.getActiveReply());
  }, [replyManager]);

  const handleCancelReply = useCallback(() => {
    replyManager.clearReply();
    setReplyingTo(null);
  }, [replyManager]);

  // 8. Copy to Clipboard
  const handleCopyMessage = useCallback(async (msg: Message): Promise<boolean> => {
    const success = await clipboardManager.copyToClipboard(msg.text);
    return success;
  }, [clipboardManager]);

  // 9. Delete messages locally (for current user)
  const handleDeleteForMe = useCallback((msg: Message) => {
    if (!activeTargetUser || !myUsername) return;
    const conversationId = conversationRepository.generateConversationId(myUsername, activeTargetUser.username);
    const updated = [...deletedLocalIds, msg.id];
    setDeletedLocalIds(updated);
    localStorage.setItem(`calcplus_deleted_me_${conversationId}`, JSON.stringify(updated));
  }, [deletedLocalIds, activeTargetUser, myUsername]);

  // 10. Delete message for everyone (Firestore level)
  const handleDeleteForEveryone = useCallback(async (msg: Message) => {
    if (!activeTargetUser || !myUsername) return;
    const conversationId = conversationRepository.generateConversationId(myUsername, activeTargetUser.username);

    try {
      const msgRef = doc(db, 'conversations', conversationId, 'messages', msg.id);
      await updateDoc(msgRef, {
        deletedForEveryone: true,
        text: 'This message was deleted.'
      });
    } catch (err) {
      console.error('Failed to delete for everyone:', err);
      setErrorMsg('Permission denied or network lost.');
    }
  }, [activeTargetUser, myUsername]);

  // 11. Pagination triggers: Load more history
  const loadMoreHistory = useCallback(() => {
    if (!activeTargetUser || !myUsername || !hasMoreHistory) return;
    paginationManager.loadMore();
    // Trigger snapshot refresh by temporarily altering a reload state or let useEffect handle pagination changes
    setHasMoreHistory(paginationManager.getHasMore());
  }, [activeTargetUser, myUsername, hasMoreHistory, paginationManager]);

  // 12. Report typing activity
  const reportTyping = useCallback(() => {
    if (!activeTargetUser || !myUsername) return;
    const conversationId = conversationRepository.generateConversationId(myUsername, activeTargetUser.username);
    typingManager.setTyping(conversationId, myUsername);
  }, [activeTargetUser, myUsername]);

  // 13. Disconnect, clear listener and memory completely (Privacy requirement)
  const disconnect = useCallback(() => {
    sessionCleaner.wipeSession();
    setActiveTargetUser(null);
    setRawMessages([]);
    setLocalSendingMessages([]);
    setFailedMessageIds([]);
    setReplyingTo(null);
    setErrorMsg(null);
    setTargetIsTyping(false);
    connectionManager.setFirestoreConnected(false);
    paginationManager.reset();
  }, [paginationManager]);

  // 14. Realtime Paginated Firestore subscription
  useEffect(() => {
    if (!activeTargetUser || !myUsername) {
      setRawMessages([]);
      return;
    }

    const conversationId = conversationRepository.generateConversationId(myUsername, activeTargetUser.username);
    connectionManager.setFirestoreConnected(false);

    // Build query using pagination manager
    const q = paginationManager.buildQuery(conversationId);

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      connectionManager.setFirestoreConnected(true);

      const loaded: Message[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          text: data.text,
          timestamp: data.timestamp,
          status: data.status || 'sent',
          replyToId: data.replyToId,
          replyToText: data.replyToText,
          replyToSender: data.replyToSender,
          deletedForEveryone: data.deletedForEveryone,
          deletedForMeUids: data.deletedForMeUids,
          audioUrl: data.audioUrl,
          duration: data.duration
        };
      });

      // Because we queried latest ordered descending to support limit pagination, we reverse back to chronological order
      const chronMessages = loaded.reverse();

      // Check if more messages could exist
      paginationManager.updateHasMore(snapshot.docs.length);
      setHasMoreHistory(paginationManager.getHasMore());

      setRawMessages(chronMessages);

      // Automatically mark received messages as delivered
      messageStatusManager.markAsDelivered(conversationId, chronMessages, myUsername);
    }, (error) => {
      console.error('Error in realtime subscription:', error);
      setErrorMsg('Firestore timeout or connection lost.');
    });

    // Subscribe to typing status
    const unsubscribeTyping = typingManager.listenToTyping(
      conversationId,
      activeTargetUser.username,
      (isTyping) => {
        setTargetIsTyping(isTyping);
      }
    );

    sessionCleaner.registerListener(unsubscribeMessages);
    sessionCleaner.registerListener(unsubscribeTyping);

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
    };
  }, [activeTargetUser, myUsername, paginationManager.getLimit()]);

  // 15. Merge raw firestore messages, optimistic local sending arrays, and filter locally deleted messages
  const processedMessages = useMemo(() => {
    // Filter out messages that have been marked deleted locally
    const filteredRaw = rawMessages.filter((m) => !deletedLocalIds.includes(m.id));
    
    // De-duplicate any optimistic local messages that have arrived in firestore raw messages
    const rawTexts = new Set(rawMessages.map((m) => m.text + '_' + Math.floor(m.timestamp / 3000)));
    const pending = localSendingMessages.filter((m) => !rawTexts.has(m.text + '_' + Math.floor(m.timestamp / 3000)));

    return [...filteredRaw, ...pending].sort((a, b) => a.timestamp - b.timestamp);
  }, [rawMessages, localSendingMessages, deletedLocalIds]);

  return {
    authUid,
    myUsername,
    myUserHasPassword,
    isLoading,
    connectingToUser,
    activeTargetUser,
    messages: processedMessages,
    errorMsg,
    targetIsTyping,
    connectionState,
    replyingTo,
    hasMoreHistory,
    registerMyUsername,
    loginToExistingAccount,
    updateMyPassword,
    logout,
    connectToUser,
    sendMessage,
    handleRetryMessage,
    reportTyping,
    disconnect,
    handleSetReply,
    handleCancelReply,
    handleCopyMessage,
    handleDeleteForMe,
    handleDeleteForEveryone,
    loadMoreHistory,
    clearError: () => setErrorMsg(null),
    showManualError: (msg: string) => setErrorMsg(msg)
  };
}

export type ChatViewModelType = ReturnType<typeof useChatViewModel>;
