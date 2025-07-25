import { trpcClient } from "@/utils/trpc";

class DocumentCleanupService {
  private cleanupQueue: string[] = [];
  private isProcessing = false;

  constructor() {
    // Set up cleanup on page unload
    this.setupCleanupListeners();
  }

  private setupCleanupListeners() {
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      this.processCleanupQueue();
    });

    // Clean up when page becomes hidden (tab switch, minimize, etc.)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.processCleanupQueue();
      }
    });

    // Clean up on page focus loss
    window.addEventListener('blur', () => {
      this.processCleanupQueue();
    });

    // Clean up on session storage changes (from other tabs)
    window.addEventListener('storage', (e) => {
      if (e.key === 'cleanupDocument' && e.newValue) {
        this.addToCleanupQueue(e.newValue);
      }
    });
  }

  addToCleanupQueue(documentId: string) {
    if (!this.cleanupQueue.includes(documentId)) {
      this.cleanupQueue.push(documentId);
      console.log('Added document to cleanup queue:', documentId);
    }
  }

  // Remove document from cleanup queue (when user is actively using it)
  removeFromCleanupQueue(documentId: string) {
    const index = this.cleanupQueue.indexOf(documentId);
    if (index > -1) {
      this.cleanupQueue.splice(index, 1);
      console.log('Removed document from cleanup queue:', documentId);
    }
  }

  private async processCleanupQueue() {
    if (this.isProcessing || this.cleanupQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const documentsToCleanup = [...this.cleanupQueue];
    this.cleanupQueue = [];

    console.log('Processing cleanup queue:', documentsToCleanup);

    // Use the new cleanup endpoint that only cleans up guest documents
    try {
      const result = await trpcClient.document.cleanupGuestDocuments.mutate({ 
        documentIds: documentsToCleanup 
      });
      
      console.log('Cleanup results:', result.results);
      
      // Log cleanup results
      result.results.forEach((result) => {
        if (result.success) {
          console.log('Successfully cleaned up document:', result.id);
        } else {
          console.error('Failed to cleanup document:', result.id);
        }
      });
    } catch (error) {
      console.error('Failed to process cleanup queue:', error);
    }

    this.isProcessing = false;
  }

  // Force cleanup of a specific document
  async cleanupDocument(documentId: string) {
    try {
      await trpcClient.document.deleteDocument.mutate({ id: documentId });
      console.log('Successfully cleaned up document:', documentId);
      return true;
    } catch (error) {
      console.error('Failed to cleanup document:', documentId, error);
      return false;
    }
  }

  // Get current cleanup queue
  getCleanupQueue() {
    return [...this.cleanupQueue];
  }
}

// Create singleton instance
export const documentCleanupService = new DocumentCleanupService();

// Export for use in components
export const addToCleanupQueue = (documentId: string) => {
  documentCleanupService.addToCleanupQueue(documentId);
};

export const removeFromCleanupQueue = (documentId: string) => {
  documentCleanupService.removeFromCleanupQueue(documentId);
};

export const cleanupDocument = (documentId: string) => {
  return documentCleanupService.cleanupDocument(documentId);
}; 