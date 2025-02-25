/**
 * The back-end of the EventEmitter class,
 * Usually it's not recommended to interact with this directly
 * since the EventEmitter class is there to provide a fixed layout to this class that may change majorly over time
 */
export class EventClass {
  private queue: QueueItem[] = [];
  private handlers = new Map<string, { handler: TEvHandler }[]>();
  private oneTimeHandlers = new Map<string, { handler: TEvHandler }[]>();
  constructor() {
    setInterval(() => {
      if (this.queue.length < 1) return;
      else {
        const { name, data } = this.queue[this.queue.length - 1];
        this.Handle(name, data);
        this.queue.pop();
      }
    }, 1);
  }
  public emit(name: string, ..._data: any | any[]): QueueItem {
    const obj = {
      name,
      data: _data ? _data : undefined,
    };
    this.queue.push(obj);
    return obj;
  }
  public addSingleUseListener(name: string, handler: TEvHandler): void {
    let handlers = [];
    if (this.oneTimeHandlers.has(name))
      handlers = this.oneTimeHandlers.get(name);
    handlers.push({ handler });
    this.oneTimeHandlers.set(name, handlers);
  }
  public addListener(name: string, handler: TEvHandler): void {
    let handlers = [];
    if (this.handlers.has(name)) handlers = this.handlers.get(name);
    handlers.push({ handler });
    this.handlers.set(name, handlers);
  }
  public removeListener(name: string, handler: TEvHandler) {
    let handlers = [];
    let arr2 = [];
    if (this.handlers.has(name)) handlers = this.handlers.get(name);
    for (const handle of handlers) {
      if (handle.handler == handler) return;
      else arr2.push(handle);
    }
    this.handlers.set(name, arr2);
  }
  public removeAllListeners(name: string) {
    this.handlers.delete(name);
  }
  private Handle(name: string, data: any) {
    if (this.handlers.has(name)) {
      const handlers = this.handlers.get(name);
      for (const handelen of handlers) {
        handelen.handler(data);
      }
    }
    if (this.oneTimeHandlers.has(name)) {
      const handlers = this.oneTimeHandlers.get(name);
      for (const handelen of handlers) {
        handelen.handler(data);
      }
      this.oneTimeHandlers.delete(name);
    }
  }
}

export interface QueueItem {
  name: string;
  data?: any | any[];
}

export type TEvHandler = (data?: any | any[]) => any;