import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  Query, 
  DocumentData 
} from 'firebase/firestore';
import { db } from '../firebase/FirebaseModule';

export class PaginationManager {
  private currentLimit: number = 50;
  private pageSize: number = 50;
  private hasMore: boolean = true;
  private lastMessageCount: number = 0;

  constructor(pageSize: number = 50) {
    this.pageSize = pageSize;
    this.currentLimit = pageSize;
  }

  public getLimit(): number {
    return this.currentLimit;
  }

  public reset() {
    this.currentLimit = this.pageSize;
    this.hasMore = true;
    this.lastMessageCount = 0;
  }

  /**
   * Increments the limit to load the next page.
   */
  public loadMore(): number {
    if (!this.hasMore) return this.currentLimit;
    this.currentLimit += this.pageSize;
    return this.currentLimit;
  }

  /**
   * Evaluates if more messages are available based on returned document counts.
   */
  public updateHasMore(returnedCount: number) {
    // If the returned count is less than our current limit, we have fetched all messages
    if (returnedCount < this.currentLimit) {
      this.hasMore = false;
    } else {
      this.hasMore = true;
    }
    this.lastMessageCount = returnedCount;
  }

  public getHasMore(): boolean {
    return this.hasMore;
  }

  /**
   * Build the Firestore Query for the current conversation and limit.
   */
  public buildQuery(conversationId: string): Query<DocumentData> {
    const messagesCollection = collection(db, 'conversations', conversationId, 'messages');
    return query(
      messagesCollection, 
      orderBy('timestamp', 'desc'), 
      limit(this.currentLimit)
    );
  }
}
