import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  LogLevel,
} from "@microsoft/signalr";
import { useAuthStore } from "../../../store/useAuthStore";

const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:5239"
).replace(/\/+$/, "");

let connection: HubConnection | null = null;
let startPromise: Promise<HubConnection> | null = null;

function createConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${BACKEND_URL}/hubs/call`, {
      accessTokenFactory: () => useAuthStore.getState().token || "",
      transport:
        HttpTransportType.WebSockets |
        HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(LogLevel.Information)
    .build();
}

export function getCallHub(): HubConnection {
  if (!connection) {
    connection = createConnection();
  }

  return connection;
}

function waitUntilConnected(
  hub: HubConnection,
  timeoutMs = 10000
): Promise<HubConnection> {
  if (hub.state === HubConnectionState.Connected) {
    return Promise.resolve(hub);
  }

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const timer = window.setInterval(() => {
      if (hub.state === HubConnectionState.Connected) {
        window.clearInterval(timer);
        resolve(hub);
        return;
      }

      if (hub.state === HubConnectionState.Disconnected) {
        window.clearInterval(timer);
        reject(new Error("CallHub đã ngắt kết nối."));
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer);
        reject(new Error("Không thể kết nối CallHub."));
      }
    }, 100);
  });
}

export async function startCallHub(): Promise<HubConnection> {
  const hub = getCallHub();

  if (hub.state === HubConnectionState.Connected) {
    return hub;
  }

  if (
    hub.state === HubConnectionState.Connecting ||
    hub.state === HubConnectionState.Reconnecting
  ) {
    return waitUntilConnected(hub);
  }

  if (!startPromise) {
    startPromise = hub
      .start()
      .then(() => hub)
      .finally(() => {
        startPromise = null;
      });
  }

  return startPromise;
}

export async function stopCallHub(): Promise<void> {
  if (!connection) return;

  if (connection.state !== HubConnectionState.Disconnected) {
    await connection.stop();
  }

  connection = null;
  startPromise = null;
}