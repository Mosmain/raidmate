import { onBeforeUnmount } from 'vue';
import {
  mapChangeMessage,
  positionMessage,
  type MapChangeMessage,
  type PositionMessage,
} from '@/shared/messages';

// Game events reach the map only through here. Today's source is the browser
// folder watcher (features/game); the Game Bar widget host will feed it too.

interface HostEvents {
  position: PositionMessage;
  'map-change': MapChangeMessage;
}

type Handler<K extends keyof HostEvents> = (msg: HostEvents[K]) => void;

const SCHEMAS = { position: positionMessage, 'map-change': mapChangeMessage } as const;
const handlers: { [K in keyof HostEvents]: Set<Handler<K>> } = {
  position: new Set(),
  'map-change': new Set(),
};

/** Subscribe for the lifetime of the calling component. */
export function onHostEvent<K extends keyof HostEvents>(type: K, handler: Handler<K>): void {
  handlers[type].add(handler);
  onBeforeUnmount(() => handlers[type].delete(handler));
}

export function emitHostEvent<K extends keyof HostEvents>(type: K, payload: unknown): void {
  const parsed = SCHEMAS[type].safeParse(payload);
  if (!parsed.success) {
    console.warn(`[host] bad ${type} payload`, parsed.error.issues);
    return;
  }
  for (const h of handlers[type]) h(parsed.data as HostEvents[K]);
}
