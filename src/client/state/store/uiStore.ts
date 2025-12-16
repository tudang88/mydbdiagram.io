/**
 * UI State interface
 */
export interface UIState {
  selectedTableId: string | null;
  selectedRelationshipId: string | null;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  showGrid: boolean;
  showSidebar: boolean;
}

/**
 * Observer function type
 */
export type Observer<T> = (value: T) => void;

/**
 * Unsubscribe function
 */
export type Unsubscribe = () => void;

/**
 * Store for UI state
 */
export class UIStore {
  private state: UIState = {
    selectedTableId: null,
    selectedRelationshipId: null,
    zoomLevel: 1,
    panOffset: { x: 0, y: 0 },
    showGrid: true,
    showSidebar: true,
  };

  private observers: Array<Observer<UIState>> = [];

  /**
   * Get current state
   */
  getState(): UIState {
    return { ...this.state };
  }

  /**
   * Set state (partial update)
   */
  setState(updates: Partial<UIState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyObservers();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(observer: Observer<UIState>): Unsubscribe {
    this.observers.push(observer);

    // Immediately notify with current state
    observer(this.getState());

    // Return unsubscribe function
    return () => {
      const index = this.observers.indexOf(observer);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  /**
   * Notify all observers
   */
  private notifyObservers(): void {
    const currentState = this.getState();
    this.observers.forEach(observer => observer(currentState));
  }
}
