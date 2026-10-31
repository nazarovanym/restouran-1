import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { socketService } from '../services/socketService';
import { StockService } from '../services/stockService';
import { TableStatus, OrderStatus } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export class OrderController {
  // Bütün aktiv sifarişlər (Kassa və POS üçün)
  public static async getOrders(req: Request, res: Response): Promise<void> {
    try {
      const { status, tableId, date } = req.query;

      const whereClause: any = {};
      if (status) {
        whereClause.status = status as string;
      }
      if (tableId) {
        whereClause.tableId = tableId as string;
      }
      if (date) {
        const startOfDay = new Date(date as string);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date as string);
        endOfDay.setHours(23, 59, 59, 999);
        whereClause.createdAt = { gte: startOfDay, lte: endOfDay };
      }

      const orders = await prisma.order.findMany({
        where: whereClause,
        include: {
          table: true,
          items: {
            include: { menuItem: true }
          },
          waiter: { select: { id: true, fullName: true } },
          cashier: { select: { id: true, fullName: true } },
          payments: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, orders });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Mətbəx Ekranı (KDS) üçün sifarişlər: yalnız aktiv mətbəx statusları
  public static async getKitchenOrders(req: Request, res: Response): Promise<void> {
    try {
      const orders = await prisma.order.findMany({
        where: {
          status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY] }
        },
        include: {
          table: true,
          items: {
            include: { menuItem: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      res.json({ success: true, orders });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Yeni sifariş yaratma (QR menyu və ya Kassa / Ofisiant tərəfindən)
  public static async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const { tableId, tableToken, items, notes, source, discountAmount, discountReason } = req.body;

      let targetTableId = tableId;

      // Əgər QR menyudan masa tokeni ilə gəlirsə masanı tapırıq
      if (!targetTableId && tableToken) {
        const table = await prisma.table.findUnique({ where: { token: tableToken } });
        if (!table) {
          res.status(404).json({ success: false, message: 'Keçərsiz masa tokeni' });
          return;
        }
        targetTableId = table.id;
      }

      if (!targetTableId) {
        res.status(400).json({ success: false, message: 'Masa təyin edilməlidir' });
        return;
      }

      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ success: false, message: 'Səbət boşdur. Ən azı bir məhsul seçilməlidir' });
        return;
      }

      // Restoran tənzimləmələri (xidmət haqqı və s.)
      const settings = await prisma.restaurantSetting.findFirst();
      const servicePercent = settings?.serviceFeePercentage || 0;

      // Qiymətləri verilənlər bazasından təkrar yoxlayırıq (təhlükəsizlik üçün)
      let subtotal = 0;
      const orderItemsToCreate: any[] = [];

      for (const item of items) {
        const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
        if (!menuItem || !menuItem.isAvailable) {
          res.status(400).json({
            success: false,
            message: `"${menuItem ? menuItem.name : 'Məhsul'}" hal-hazırda satışda deyil`
          });
          return;
        }

        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        const itemTotal = menuItem.price * qty;
        subtotal += itemTotal;

        orderItemsToCreate.push({
          menuItemId: menuItem.id,
          quantity: qty,
          unitPrice: menuItem.price,
          totalPrice: itemTotal,
          specialInstructions: item.specialInstructions || null,
          status: 'PENDING'
        });
      }

      const disc = Math.max(0, parseFloat(discountAmount) || 0);
      const subAfterDiscount = Math.max(0, subtotal - disc);
      const serviceFee = parseFloat(((subAfterDiscount * servicePercent) / 100).toFixed(2));
      const totalAmount = parseFloat((subAfterDiscount + serviceFee).toFixed(2));

      // Sifariş nömrəsi formalaşdırırıq: ORD-YYYYMMDD-XXXX
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const countToday = await prisma.order.count();
      const orderNumber = `ORD-${todayStr}-${(countToday + 1).toString().padStart(4, '0')}`;

      // Əgər masada artıq aktiv bir sifariş varsa, onun üzərinə əlavə edirik və ya yeni açırıq
      const createdOrder = await prisma.order.create({
        data: {
          orderNumber,
          tableId: targetTableId,
          status: OrderStatus.PENDING,
          subtotal,
          discountAmount: disc,
          discountReason: discountReason || null,
          serviceFee,
          totalAmount,
          source: source || 'QR_CODE',
          notes: notes || null,
          items: {
            create: orderItemsToCreate
          }
        },
        include: {
          table: true,
          items: {
            include: { menuItem: true }
          }
        }
      });

      // Masa statusunu yeniləyirik: ORDER_PENDING
      const updatedTable = await prisma.table.update({
        where: { id: targetTableId },
        data: { status: TableStatus.ORDER_PENDING }
      });

      // Real-time bildirişlər
      socketService.notifyNewOrder(createdOrder);
      socketService.notifyTableStatusChanged(updatedTable);

      res.status(201).json({
        success: true,
        order: createdOrder,
        message: 'Sifariş uğurla göndərildi və mətbəxə çatdırıldı'
      });
    } catch (error: any) {
      console.error('Create order error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Sifarişin statusunu dəyişmə (Mətbəx və ya Kassa)
  public static async updateOrderStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, cancelReason } = req.body;

      const order = await prisma.order.findUnique({
        where: { id },
        include: { table: true }
      });

      if (!order) {
        res.status(404).json({ success: false, message: 'Sifariş tapılmadı' });
        return;
      }

      // Əgər status CONFIRMED və ya PREPARING olursa, resept üzrə anbardan avtomatik çıxılır!
      if (
        (status === OrderStatus.CONFIRMED || status === OrderStatus.PREPARING) &&
        !order.stockDeducted
      ) {
        await StockService.deductStockForOrder(order.id);
      }

      // Əgər status CANCELLED olursa və anbar əvvəlcədən çıxılmışdısa, geri qaytarılır!
      if (status === OrderStatus.CANCELLED && order.stockDeducted) {
        await StockService.revertStockForOrder(order.id, cancelReason);
      }

      // Uyğun masa statusunu müəyyən edirik
      let newTableStatus = order.table.status;
      if (status === OrderStatus.PREPARING) {
        newTableStatus = TableStatus.ORDER_PREPARING;
      } else if (status === OrderStatus.READY) {
        newTableStatus = TableStatus.SERVICE_PENDING;
      } else if (status === OrderStatus.COMPLETED) {
        newTableStatus = TableStatus.PAID;
      } else if (status === OrderStatus.CANCELLED) {
        // Digər aktiv sifariş varmı yoxlayırıq
        const remainingOrders = await prisma.order.count({
          where: {
            tableId: order.tableId,
            id: { not: order.id },
            status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED'] }
          }
        });
        if (remainingOrders === 0) {
          newTableStatus = TableStatus.EMPTY;
        }
      }

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          status,
          updatedAt: new Date()
        },
        include: {
          table: true,
          items: {
            include: { menuItem: true }
          }
        }
      });

      const updatedTable = await prisma.table.update({
        where: { id: order.tableId },
        data: { status: newTableStatus }
      });

      // Audit jurnalı
      if (req.user) {
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'ORDER_STATUS_CHANGED',
            details: `Sifariş #${order.orderNumber} statusu dəyişdi: ${order.status} -> ${status}. ${cancelReason ? 'Səbəb: ' + cancelReason : ''}`
          }
        });
      }

      socketService.notifyOrderStatusChanged(updatedOrder);
      socketService.notifyTableStatusChanged(updatedTable);

      res.json({ success: true, order: updatedOrder, message: 'Sifariş statusu yeniləndi' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Sifarişə yeni məhsul əlavə etmək və ya miqdarı dəyişmək (Kassir / Ofisiant)
  public static async addItemToOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { menuItemId, quantity, specialInstructions } = req.body;

      const order = await prisma.order.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!order) {
        res.status(404).json({ success: false, message: 'Sifariş tapılmadı' });
        return;
      }

      if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
        res.status(400).json({ success: false, message: 'Tamamlanmış və ya ləğv edilmiş sifarişə məhsul əlavə edilə bilməz' });
        return;
      }

      const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
      if (!menuItem) {
        res.status(404).json({ success: false, message: 'Yemək tapılmadı' });
        return;
      }

      const qty = Math.max(1, parseInt(quantity, 10) || 1);
      const itemTotal = menuItem.price * qty;

      await prisma.orderItem.create({
        data: {
          orderId: id,
          menuItemId,
          quantity: qty,
          unitPrice: menuItem.price,
          totalPrice: itemTotal,
          specialInstructions: specialInstructions || null,
          status: 'PENDING'
        }
      });

      // Yenilənmiş yekun məbləğləri hesablayırıq
      const allItems = await prisma.orderItem.findMany({ where: { orderId: id } });
      const newSubtotal = allItems.reduce((sum, item) => sum + item.totalPrice, 0);

      const settings = await prisma.restaurantSetting.findFirst();
      const servicePercent = settings?.serviceFeePercentage || 0;
      const subAfterDiscount = Math.max(0, newSubtotal - order.discountAmount);
      const newServiceFee = parseFloat(((subAfterDiscount * servicePercent) / 100).toFixed(2));
      const newTotal = parseFloat((subAfterDiscount + newServiceFee).toFixed(2));

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          subtotal: newSubtotal,
          serviceFee: newServiceFee,
          totalAmount: newTotal
        },
        include: {
          table: true,
          items: {
            include: { menuItem: true }
          }
        }
      });

      socketService.notifyOrderStatusChanged(updatedOrder);
      res.json({ success: true, order: updatedOrder, message: 'Məhsul sifarişə əlavə edildi' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Sifarişdən məhsul silmək
  public static async removeItemFromOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id, itemId } = req.params;

      const order = await prisma.order.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!order) {
        res.status(404).json({ success: false, message: 'Sifariş tapılmadı' });
        return;
      }

      if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
        res.status(400).json({ success: false, message: 'Bağlanmış sifarişdə dəyişiklik edilə bilməz' });
        return;
      }

      await prisma.orderItem.delete({
        where: { id: itemId }
      });

      const allItems = await prisma.orderItem.findMany({ where: { orderId: id } });
      const newSubtotal = allItems.reduce((sum, item) => sum + item.totalPrice, 0);

      const settings = await prisma.restaurantSetting.findFirst();
      const servicePercent = settings?.serviceFeePercentage || 0;
      const subAfterDiscount = Math.max(0, newSubtotal - order.discountAmount);
      const newServiceFee = parseFloat(((subAfterDiscount * servicePercent) / 100).toFixed(2));
      const newTotal = parseFloat((subAfterDiscount + newServiceFee).toFixed(2));

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          subtotal: newSubtotal,
          serviceFee: newServiceFee,
          totalAmount: newTotal
        },
        include: {
          table: true,
          items: {
            include: { menuItem: true }
          }
        }
      });

      socketService.notifyOrderStatusChanged(updatedOrder);
      res.json({ success: true, order: updatedOrder, message: 'Məhsul sifarişdən çıxarıldı' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
