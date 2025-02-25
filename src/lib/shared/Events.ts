import { EventQueueAlt, TEvHandler, IRemLOpts, HandlerItem } from "./core/EventQueue_2_1.js";

/**
 * The EventEmitter Class
 */
export class EventEmitter extends EventQueueAlt {
  constructor(private prefix: string = "") {
    super();
  }

  /**
   * Add a single use event listener
   * (the listener gets internally removed from the stack after it has been executed)
   * 
   * ! Warning.. If you use a single-use event listener on a global event
   * 
   * ! then it bugs out the whole global queue!
   * 
   * ! Instead maybe use a normal `<EventEmitter>.on()` method with an if statement
   * 
   * ! To block multiple uses
   */
  public addSingleUseListener(id: string, handler: TEvHandler): HandlerItem {
    const name = this.prefix + id;
    return super.addSingleUseListener(name, handler);
  }

  /**
   * Add an event listener
   */
  public addListener(id: string, handler: TEvHandler): HandlerItem {
    const name = this.prefix + id;
    return super.addListener(name, handler);
  }
  /**
   * Remove an event listener
   * 
   * ! NOTE: This isn't implemented for the global events yet
   */
  public removeListener(
    id: string,
    listeners: string | TEvHandler | string[] | TEvHandler[],
    opts?: IRemLOpts
  ) {
    const name = this.prefix + id;
    super.removeListener(name, listeners, opts);
  }

  /**
   * Add a single use event listener
   * (the listener gets internally removed from the stack after it has been executed)
   * 
   * ! Warning.. If you use a single-use event listener on a global event
   * 
   * ! then it bugs out the whole global queue!
   * 
   * ! Instead maybe use a normal `<EventEmitter>.on()` method with an if statement
   * 
   * ! To block multiple uses
   */
  public once(id: string, handler: TEvHandler): HandlerItem {
    const name = this.prefix + id;
    return super.addSingleUseListener(name, handler);
  }
  /**
   * Add an event listener
   */
  public on(id: string, handler: TEvHandler): HandlerItem {
    const name = this.prefix + id;
    return super.addListener(name, handler);
  }
  /**
   * Remove an event listener
   *
   * ! NOTE: This isn't implemented for the global events yet
   */
  public off(
    id: string,
    listeners: string | TEvHandler | string[] | TEvHandler[],
    opts?: IRemLOpts
  ) {
    const name = this.prefix + id;
    super.removeListener(name, listeners, opts);
  }
  /**
   * Remove all event listeners belogning to the specified event
   * 
   * ! NOTE: This isn't implemented for the global events yet
   */
  public removeAllListeners(name: string): void {
    super.removeAllListeners(name);
  }
  /**
   * Emit an event
   */
  public emit(id: string, ..._data: any | any[]) {
    const name = this.prefix + id;
    return super.emit(name, ..._data);
  }
}

export const EventEmitter2 = EventEmitter