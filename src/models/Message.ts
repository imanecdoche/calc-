export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
  replyToId?: string;
  replyToText?: string;
  replyToSender?: string;
  deletedForEveryone?: boolean;
  deletedForMeUids?: string[];
  audioUrl?: string;
  duration?: number;
}
