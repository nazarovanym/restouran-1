import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

class SocketService {
  private io: SocketIOServer | null = null;

  public init(server: HttpServer, corsOrigin: string) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*', // allows both web and electron/desktop
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
      }
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`[WebSocket] Yeni müştəri qoşuldu: ${socket.id}`);

      // Otaqlara qoşulma (məs: 'kitchen', 'pos', 'waiter', 'table:token')
      socket.on('join_room', (room: string) => {
        socket.join(room);
        console.log(`[WebSocket] ${socket.id} '${room}' otağına qoşuldu.`);
      });

      socket.on('leave_room', (room: string) => {
        socket.leave(room);
        console.log(`[WebSocket] ${socket.id} '${room}' otağını tərk etdi.`);
      });

      socket.on('disconnect', () => {
        console.log(`[WebSocket] Müştəri ayrıldı: ${socket.id}`);
      });
    });
  }

  // Bütün sistemə və ya xüsusi otağa hadisə göndərmə
  public emit(event: string, data: any, room?: string) {
    if (!this.io) {
      console.warn('[WebSocket] Xəbərdarlıq: Socket.IO initialized deyil.');
      return;
    }

    if (room) {
      this.io.to(room).emit(event, data);
    } else {
      this.io.emit(event, data);
    }
  }

  // Real-time RESTORAN hadisələri üçün köməkçi metodlar
  public notifyNewOrder(order: any) {
    this.emit('order:new', order); // Bütün kassa və ofisiantlara
    this.emit('kitchen:new_order', order, 'kitchen'); // Xüsusi olaraq mətbəxə
    if (order.table?.token) {
      this.emit('table:order_update', order, `table:${order.table.token}`);
    }
  }

  public notifyOrderStatusChanged(order: any) {
    this.emit('order:status_change', order);
    this.emit('kitchen:order_update', order, 'kitchen');
    if (order.table?.token) {
      this.emit('table:order_update', order, `table:${order.table.token}`);
    }
  }

  public notifyTableStatusChanged(table: any) {
    this.emit('table:status_change', table);
  }

  public notifyWaiterCall(call: any) {
    this.emit('waiter:call', call);
  }

  public notifyStockAlert(ingredient: any) {
    this.emit('stock:low_alert', ingredient);
  }
}

export const socketService = new SocketService();
