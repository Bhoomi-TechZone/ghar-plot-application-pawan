// Simple JS event bus for in-app communication (lightweight)
const listeners = {};

export const on = (event, cb) => {
  if (!listeners[event]) listeners[event] = new Set();
  listeners[event].add(cb);
  return () => { listeners[event] && listeners[event].delete(cb); };
};

export const emit = (event, payload) => {
  const set = listeners[event];
  if (!set) return;
  Array.from(set).forEach((cb) => {
    try { cb(payload); } catch (e) { console.warn('eventBus handler error', e); }
  });
};

export const clearEvent = (event) => {
  if (listeners[event]) delete listeners[event];
};

export default { on, emit, clearEvent };
