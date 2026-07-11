import { Message } from '../models/Message';

type MessageListener = (msg: Message) => void;

export class ChatRepository {
  private messages: Message[] = [];
  private listeners: Set<MessageListener> = new Set();
  private simulatedTypingListeners: Set<(isTyping: boolean) => void> = new Set();

  public getMessagesBetween(userA: string, userB: string): Message[] {
    return this.messages.filter(
      m => (m.senderId === userA && m.receiverId === userB) ||
           (m.senderId === userB && m.receiverId === userA)
    );
  }

  public sendMessage(senderId: string, receiverId: string, text: string): Message {
    const msg: Message = {
      id: Math.random().toString(36).substring(2, 9),
      senderId,
      receiverId,
      text,
      timestamp: Date.now()
    };
    this.messages.push(msg);
    
    // Notify local listeners
    this.listeners.forEach(listener => listener(msg));

    // Handle automated simulation from fake users
    this.triggerSimulatedReply(receiverId, senderId, text);

    return msg;
  }

  public subscribe(listener: MessageListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeTyping(listener: (isTyping: boolean) => void): () => void {
    this.simulatedTypingListeners.add(listener);
    return () => {
      this.simulatedTypingListeners.delete(listener);
    };
  }

  public clearSession(): void {
    this.messages = [];
  }

  private triggerSimulatedReply(fromUsername: string, toUsername: string, userMessage: string) {
    const textLower = userMessage.toLowerCase();
    let replyText = '';

    // Specialized responses based on contact to make the app incredibly immersive and high-fidelity!
    if (fromUsername === 'ismael') {
      if (textLower.includes('halo') || textLower.includes('hi') || textLower.includes('hello')) {
        replyText = 'Hi. Channel secure on your side?';
      } else if (textLower.includes('status') || textLower.includes('aman') || textLower.includes('secure')) {
        replyText = 'Status green. We are monitoring the peripheral grid. No anomalies detected.';
      } else if (textLower.includes('lokasi') || textLower.includes('di mana') || textLower.includes('where')) {
        replyText = 'Currently stationed at sector 7. Ready for coordinates.';
      } else if (textLower.includes('sandi') || textLower.includes('password') || textLower.includes('kode') || textLower.includes('key')) {
        replyText = 'Do not write any password or access keys here. Keep them inside the encrypted Vault tabs.';
      } else {
        const customReplies = [
          'Understood. Make sure to lock the Calculator once we are finished.',
          'Copy that. Awaiting next command.',
          'Acknowledged. Let’s keep this brief and secure.',
          'I checked the log database, everything is running on the local isolated thread.',
          'Keep an eye on the clock. We have exactly 5 minutes before auto-expiry.'
        ];
        replyText = customReplies[Math.floor(Math.random() * customReplies.length)];
      }
    } else if (fromUsername === 'fernandez') {
      if (textLower.includes('halo') || textLower.includes('hi') || textLower.includes('hello')) {
        replyText = 'Awaiting briefing. Speak in clear codes.';
      } else if (textLower.includes('siap') || textLower.includes('ready')) {
        replyText = 'Excellent. Team is ready. Move only on my signal.';
      } else if (textLower.includes('data') || textLower.includes('file') || textLower.includes('info')) {
        replyText = 'The classified documents are safe in the secondary container. Do you want to initiate export?';
      } else if (textLower.includes('batal') || textLower.includes('cancel') || textLower.includes('abort')) {
        replyText = 'Operation aborted. Clear the local chats immediately.';
      } else {
        const customReplies = [
          'Proceed with extreme caution. The network has traces of activity.',
          'Signal is encrypted. Let me know if you need backups.',
          'I am wiping my local temporary cache now. Stand by.',
          'Let’s schedule the main execution on the production channel tomorrow.',
          'Affirmative. Fernandez out.'
        ];
        replyText = customReplies[Math.floor(Math.random() * customReplies.length)];
      }
    } else if (fromUsername === 'alex01') {
      if (textLower.includes('halo') || textLower.includes('hi') || textLower.includes('hello')) {
        replyText = 'System architect online. What do you need built?';
      } else if (textLower.includes('error') || textLower.includes('bug') || textLower.includes('crash')) {
        replyText = 'I am scanning the source build. MVVM structure is intact and responsive.';
      } else if (textLower.includes('database') || textLower.includes('simpan') || textLower.includes('storage')) {
        replyText = 'Warning: This Messenger operates in-memory only. No records are kept in local database.';
      } else {
        const customReplies = [
          'Calculations verified. Perfect mathematical precision.',
          'Let me adjust the telemetry parameters for safety.',
          'Everything builds correctly. Ready for Phase 3 whenever you are.',
          'Clean interface, no horizontal overflows detected. Top tier work.',
          'All systems functioning in strict sandboxed container mode.'
        ];
        replyText = customReplies[Math.floor(Math.random() * customReplies.length)];
      }
    } else {
      replyText = 'Message received. Transmission successful.';
    }

    // Simulate Typing State first, then append message
    setTimeout(() => {
      this.simulatedTypingListeners.forEach(listener => listener(true));
      
      const typingDuration = Math.min(1500, Math.max(800, replyText.length * 30));
      
      setTimeout(() => {
        this.simulatedTypingListeners.forEach(listener => listener(false));
        
        const replyMsg: Message = {
          id: Math.random().toString(36).substring(2, 9),
          senderId: fromUsername,
          receiverId: toUsername,
          text: replyText,
          timestamp: Date.now()
        };
        
        this.messages.push(replyMsg);
        this.listeners.forEach(listener => listener(replyMsg));
      }, typingDuration);
      
    }, 600);
  }
}
