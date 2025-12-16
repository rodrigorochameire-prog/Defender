import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

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
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return next(new Error("JWT_SECRET not configured"));
      }

      const decoded = jwt.verify(token, jwtSecret) as {
        openId: string;
        role: "admin" | "user";
      };

      socket.userId = decoded.openId;
      socket.userRole = decoded.role;

      // Join user-specific room
      socket.join(`user:${decoded.openId}`);

      // Join role-specific room
      socket.join(`role:${decoded.role}`);

      console.log(`[WebSocket] User ${decoded.openId} (${decoded.role}) connected`);

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
