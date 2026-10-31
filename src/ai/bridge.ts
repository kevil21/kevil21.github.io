/** No SDK imports. Termination is the cancellation boundary even during uninterruptible loads. */
export class WorkerBridge {
  private serial = 0;
  private pending = new Map<number, { resolve: (value: Record<string, unknown>) => void; reject: (reason: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private dead = false;
  constructor(private worker: Worker, private progress: (message: Record<string, unknown>) => void, private failed: () => void) {
    worker.onmessage = (event: MessageEvent<unknown>) => {
      if (this.dead) return;
      if (!event.data || typeof event.data !== 'object') { this.terminate('malformed-worker-reply'); this.failed(); return; }
      const data = event.data as Record<string, unknown>;
      if (data.type === 'fatal') { this.terminate('worker-fatal'); this.failed(); return; }
      if (typeof data.id !== 'number' || !Number.isSafeInteger(data.id) || typeof data.type !== 'string') { this.terminate('malformed-worker-reply'); this.failed(); return; }
      const item = this.pending.get(data.id);
      if (!item) return; // A timed-out, canceled or superseded request cannot render.
      if (data.type === 'progress' || data.type === 'tokens') {
        const value = data.type === 'progress' ? data.progress : data.chunks;
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > (data.type === 'progress' ? 100 : 100000)) {
          this.terminate('malformed-worker-progress'); this.failed(); return;
        }
        this.progress(data); return;
      }
      clearTimeout(item.timer); this.pending.delete(Number(data.id));
      if (data.type === 'error') item.reject(new Error('worker-operation-failed')); else item.resolve(data);
    };
    worker.onerror = (event) => { event.preventDefault(); this.terminate('worker-crashed'); this.failed(); };
    worker.onmessageerror = () => { this.terminate('worker-message-error'); this.failed(); };
  }
  request(data: Record<string, unknown>, timeout = 15000): Promise<Record<string, unknown>> {
    if (this.dead) return Promise.reject(new Error('worker-terminated'));
    if (this.pending.size >= 8) return Promise.reject(new Error('worker-backpressure'));
    const id = ++this.serial;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.terminate('worker-timeout'); this.failed(); }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      try { this.worker.postMessage({ ...data, id }); } catch { this.terminate('worker-send-failed'); }
    });
  }
  terminate(reason = 'canceled'): void {
    if (this.dead) return;
    this.dead = true; this.worker.terminate();
    for (const item of this.pending.values()) { clearTimeout(item.timer); item.reject(new Error(reason)); }
    this.pending.clear();
  }
}