import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import { sdk } from "./sdk";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Support multiple environment variable names (Vercel Supabase integration)
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
const client = databaseUrl ? postgres(databaseUrl) : null;
const db = client ? drizzle(client) : null;

let io: Server | null = null;

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: "admin" | "user";
}

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // In production, restrict to your domain
      methods: ["GET", "POST"],
    },
  } as any);

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      // Verify session token using SDK
      const session = await sdk.verifySession(token);

      if (!session) {
        return next(new Error("Authentication error: Invalid session token"));
      }

      // Get user from database to get role
      if (!db) {
        return next(new Error("Authentication error: Database not available"));
      }
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.open_id, session.openId))
        .limit(1);

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.userId = user.open_id || String(user.id);
      socket.userRole = user.role as "user" | "admin";

      // Join user-specific room
      socket.join(`user:${socket.userId}`);

      // Join role-specific room
      socket.join(`role:${user.role}`);

      console.log(`[WebSocket] User ${socket.userId} (${user.role}) connected`);

      next();
    } catch (error) {
      console.error("[WebSocket] Authentication error:", error);
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  // Connection handler
  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(`[WebSocket] Socket ${socket.id} connected for user ${socket.userId}`);

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`[WebSocket] Socket ${socket.id} disconnected: ${reason}`);
    });

    // Ping/pong for connection health
    socket.on("ping", () => {
      socket.emit("pong");
    });
  });

  return io;
}

/**
 * Get WebSocket server instance
 */
export function getWebSocketServer(): Server | null {
  return io;
}

/**
 * Notification types
 */
export type NotificationType =
  | "booking_request_created"
  | "booking_request_approved"
  | "booking_request_rejected"
  | "booking_request_cancelled"
  | "daily_log_created"
  | "health_reminder"
  | "credit_low"
  | "payment_received";

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
}

/**
 * Send notification to specific user
 */
export function notifyUser(userId: string, notification: NotificationPayload) {
  if (!io) {
    console.warn("[WebSocket] Server not initialized");
    return false;
  }

  io.to(`user:${userId}`).emit("notification", notification);
  console.log(`[WebSocket] Notification sent to user ${userId}:`, notification.type);
  return true;
}

/**
 * Send notification to all admins
 */
export function notifyAdmins(notification: NotificationPayload) {
  if (!io) {
    console.warn("[WebSocket] Server not initialized");
    return false;
  }

  io.to("role:admin").emit("notification", notification);
  console.log(`[WebSocket] Notification sent to all admins:`, notification.type);
  return true;
}

/**
 * Send notification to all users with specific role
 */
export function notifyRole(role: "admin" | "user", notification: NotificationPayload) {
  if (!io) {
    console.warn("[WebSocket] Server not initialized");
    return false;
  }

  io.to(`role:${role}`).emit("notification", notification);
  console.log(`[WebSocket] Notification sent to role ${role}:`, notification.type);
  return true;
}

/**
 * Broadcast notification to all connected users
 */
export function broadcastNotification(notification: NotificationPayload) {
  if (!io) {
    console.warn("[WebSocket] Server not initialized");
    return false;
  }

  io.emit("notification", notification);
  console.log(`[WebSocket] Notification broadcasted:`, notification.type);
  return true;
}

/**
 * Get connected users count
 */
export function getConnectedUsersCount(): number {
  if (!io) return 0;
  return io.sockets.sockets.size;
}

/**
 * Check if user is connected
 */
export async function isUserConnected(userId: string): Promise<boolean> {
  if (!io) return false;

  const sockets = await io.in(`user:${userId}`).fetchSockets();
  return sockets.length > 0;
}
