import { Message } from '../models/Message';

export interface ReplyState {
  messageId: string;
  senderId: string;
  text: string;
}

export class ReplyManager {
  private activeReply: ReplyState | null = null;

  public setReplyTo(message: Message) {
    this.activeReply = {
      messageId: msgId(message),
      senderId: message.senderId,
      text: message.deletedForEveryone ? 'This message was deleted.' : message.text
    };
  }

  public getActiveReply(): ReplyState | null {
    return this.activeReply;
  }

  public clearReply() {
    this.activeReply = null;
  }

  /**
   * Appends reply context properties to a message payload.
   */
  public applyReplyToMessage(messagePayload: Partial<Message>): Partial<Message> {
    if (this.activeReply) {
      const updated = {
        ...messagePayload,
        replyToId: this.activeReply.messageId,
        replyToText: this.activeReply.text,
        replyToSender: this.activeReply.senderId
      };
      this.clearReply();
      return updated;
    }
    return messagePayload;
  }
}

// Helper to get safe ID
function msgId(msg: Message): string {
  return msg.id || '';
}
