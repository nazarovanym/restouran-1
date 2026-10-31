import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { soundService } from '../services/soundService';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  activeCalls: any[];
  dismissCall: (id: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinRoom: () => {},
  leaveRoom: () => {},
  activeCalls: [],
  dismissCall: () => {}
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeCalls, setActiveCalls] = useState<any[]>([]);

  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('⚡ WebSocket serverə qoşuldu:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.warn('❌ WebSocket bağlantısı kəsildi');
      setIsConnected(false);
    });

    // Qlobal ofisiant çağırışları
    newSocket.on('waiter:call', (call: any) => {
      soundService.playWaiterBell();
      setActiveCalls((prev) => {
        if (call.status === 'RESOLVED') {
          return prev.filter((c) => c.id !== call.id);
        }
        const exists = prev.some((c) => c.id === call.id);
        if (exists) {
          return prev.map((c) => (c.id === call.id ? call : c));
        }
        return [call, ...prev];
      });
    });

    // Mətbəx səs siqnalı
    newSocket.on('kitchen:new_order', () => {
      soundService.playNewOrderSound();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const joinRoom = (room: string) => {
    if (socket) socket.emit('join_room', room);
  };

  const leaveRoom = (room: string) => {
    if (socket) socket.emit('leave_room', room);
  };

  const dismissCall = (id: string) => {
    setActiveCalls((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinRoom,
        leaveRoom,
        activeCalls,
        dismissCall
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
