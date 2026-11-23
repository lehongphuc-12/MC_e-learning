import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  LogLevel,
} from '@microsoft/signalr';
import { useAuthStore } from '../../../store/useAuthStore';

const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:5239'
).replace(/\/+$/, '');

export interface SpeakingAssignmentUpdatedEvent {
  courseId: number;
  moduleId?: number | null;
  lessonId?: number | null;
  scriptId: number;
  speakingScriptId?: number;
  action?: string;
}

let connection: HubConnection | null = null;
let startPromise: Promise<HubConnection> | null = null;

function createConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${BACKEND_URL}/hubs/learning`, {
      accessTokenFactory: () => useAuthStore.getState().token || '',
      transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(LogLevel.Warning)
    .build();
}

export function getLearningHub(): HubConnection {
  if (!connection) connection = createConnection();
  return connection;
}

export async function startLearningHub(): Promise<HubConnection> {
  const hub = getLearningHub();

  if (hub.state === HubConnectionState.Connected) return hub;

  if (
    hub.state === HubConnectionState.Connecting ||
    hub.state === HubConnectionState.Reconnecting
  ) {
    if (startPromise) return startPromise;
  }

  startPromise = (async () => {
    try {
      if (hub.state === HubConnectionState.Disconnected) {
        await hub.start();
      }
      return hub;
    } catch (err) {
      console.warn('SignalR learning hub connection error:', err);
      throw err;
    } finally {
      startPromise = null;
    }
  })();

  return startPromise;
}

export async function joinCourseGroup(courseId: number): Promise<void> {
  if (!courseId) return;
  try {
    const hub = await startLearningHub();
    if (hub.state === HubConnectionState.Connected) {
      await hub.invoke('JoinCourse', courseId);
    }
  } catch (err) {
    console.warn('Could not join course SignalR group:', err);
  }
}

export async function leaveCourseGroup(courseId: number): Promise<void> {
  if (!courseId) return;
  try {
    const hub = getLearningHub();
    if (hub.state === HubConnectionState.Connected) {
      await hub.invoke('LeaveCourse', courseId);
    }
  } catch (err) {
    console.warn('Could not leave course SignalR group:', err);
  }
}
