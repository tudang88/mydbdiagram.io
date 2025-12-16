import { Diagram } from '../../core/diagram/Diagram';

/**
 * Observer function type
 */
export type Observer<T> = (value: T) => void;

/**
 * Unsubscribe function
 */
export type Unsubscribe = () => void;

/**
 * Store for Diagram state
 */
export class DiagramStore {
  private currentDiagram: Diagram | null = null;
  private observers: Array<Observer<Diagram | null>> = [];

  /**
   * Set current diagram
   */
  setDiagram(diagram: Diagram | null): void {
    this.currentDiagram = diagram;
    this.notifyObservers();
  }

  /**
   * Get current diagram
   */
  getDiagram(): Diagram | null {
    return this.currentDiagram;
  }

  /**
   * Subscribe to diagram changes
   */
  subscribe(observer: Observer<Diagram | null>): Unsubscribe {
    this.observers.push(observer);

    // Immediately notify with current value
    observer(this.currentDiagram);

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
    this.observers.forEach((observer) => observer(this.currentDiagram));
  }
}

