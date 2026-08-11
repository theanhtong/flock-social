import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket | null {
    const token = useAuthStore.getState().token;
    if (!token) return null;

    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(`${API_BASE_URL}/ws/messages`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    if (!this.socket || !this.socket.connected) {
      return this.connect();
    }
    return this.socket;
  }

  joinConversation(conversationId: string) {
    const s = this.getSocket();
    s?.emit('join_conversation', { conversationId });
  }

  leaveConversation(conversationId: string) {
    const s = this.getSocket();
    s?.emit('leave_conversation', { conversationId });
  }

  sendTypingStart(conversationId: string) {
    const s = this.getSocket();
    s?.emit('typing_start', { conversationId });
  }

  sendTypingStop(conversationId: string) {
    const s = this.getSocket();
    s?.emit('typing_stop', { conversationId });
  }
}

export const socketService = new SocketService();
