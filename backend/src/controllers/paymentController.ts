import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { TerminalAdapterFactory, ReceiptService } from '../services/paymentService';
import { socketService } from '../services/socketService';
import { StockService } from '../services/stockService';
import { OrderStatus, TableStatus } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export class PaymentController {
  // Endirim tətbiq etmə
  public static async applyDiscount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { discountAmount, discountPercent, reason } = req.body;

      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) {
        res.status(404).json({ success: false, message: 'Sifariş tapılmadı' });
        return;
      }

      let finalDiscount = 0;
      if (discountPercent !== undefined && discountPercent > 0) {
        finalDiscount = (order.subtotal * parseFloat(discountPercent)) / 100;
      } else if (discountAmount !== undefined && discountAmount > 0) {
        finalDiscount = parseFloat(discountAmount);
      }

      finalDiscount = Math.min(order.subtotal, Math.max(0, finalDiscount));

      const settings = await prisma.restaurantSetting.findFirst();
      const servicePercent = settings?.serviceFeePercentage || 0;
      const subAfterDiscount = Math.max(0, order.subtotal - finalDiscount);
      const serviceFee = parseFloat(((subAfterDiscount * servicePercent) / 100).toFixed(2));
      const totalAmount = parseFloat((subAfterDiscount + serviceFee).toFixed(2));

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          discountAmount: finalDiscount,
          discountReason: reason || 'Kassir endirimi',
          serviceFee,
          totalAmount
        },
        include: { table: true, items: { include: { menuItem: true } } }
      });

      socketService.notifyOrderStatusChanged(updated);
      res.json({ success: true, order: updated, message: `${finalDiscount.toFixed(2)} AZN endirim tətbiq edildi` });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Ödəniş qəbulu və Hesabın Bağlanması
  public static async processPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { method, cashGiven, payments: splitPayments } = req.body;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          table: true,
          items: { include: { menuItem: true } }
        }
      });

      if (!order) {
        res.status(404).json({ success: false, message: 'Sifariş tapılmadı' });
        return;
      }

      if (order.status === OrderStatus.COMPLETED) {
        res.status(400).json({ success: false, message: 'Bu sifariş artıq ödənilib və tamamlanıb' });
        return;
      }

      const cashierId = req.user?.id || null;
      const createdPayments: any[] = [];
      const terminalAdapter = await TerminalAdapterFactory.getAdapter();

      // 1. BÖLÜNMÜŞ (SPLIT) ÖDƏNİŞ
      if (method === 'SPLIT' && Array.isArray(splitPayments)) {
        let splitTotal = 0;
        for (const p of splitPayments) {
          splitTotal += parseFloat(p.amount);
        }

        if (Math.abs(splitTotal - order.totalAmount) > 0.05) {
          res.status(400).json({
            success: false,
            message: `Bölünmüş məbləğlərin cəmi (${splitTotal.toFixed(2)} AZN) sifarişin yekun məbləğinə (${order.totalAmount.toFixed(2)} AZN) bərabər olmalıdır`
          });
          return;
        }

        for (const p of splitPayments) {
          if (p.method === 'CARD_TERMINAL') {
            const termResult = await terminalAdapter.processPayment(p.amount, 'AZN', order.orderNumber);
            if (!termResult.success) {
              res.status(400).json({
                success: false,
                message: `POS Terminal kart ödənişi uğursuz oldu: ${termResult.errorMessage}`
              });
              return;
            }

            const rec = await prisma.payment.create({
              data: {
                orderId: order.id,
                amount: p.amount,
                method: 'CARD_TERMINAL',
                terminalReference: termResult.referenceNumber,
                terminalStatus: 'SUCCESS',
                processedById: cashierId
              }
            });
            createdPayments.push(rec);
          } else {
            // Nağd
            const cash = parseFloat(p.cashGiven || p.amount);
            const change = Math.max(0, cash - p.amount);
            const rec = await prisma.payment.create({
              data: {
                orderId: order.id,
                amount: p.amount,
                method: 'CASH',
                cashGiven: cash,
                changeGiven: change,
                terminalStatus: 'SUCCESS',
                processedById: cashierId
              }
            });
            createdPayments.push(rec);
          }
        }
      }
      // 2. KART (POS TERMINAL) ÖDƏNİŞİ
      else if (method === 'CARD_TERMINAL') {
        const termResult = await terminalAdapter.processPayment(order.totalAmount, 'AZN', order.orderNumber);
        if (!termResult.success) {
          res.status(400).json({
            success: false,
            message: `POS Terminal kart ödənişi rədd edildi: ${termResult.errorMessage}`
          });
          return;
        }

        const rec = await prisma.payment.create({
          data: {
            orderId: order.id,
            amount: order.totalAmount,
            method: 'CARD_TERMINAL',
            terminalReference: termResult.referenceNumber,
            terminalStatus: 'SUCCESS',
            processedById: cashierId
          }
        });
        createdPayments.push(rec);
      }
      // 3. NAĞD ÖDƏNİŞ
      else {
        const given = cashGiven !== undefined ? parseFloat(cashGiven) : order.totalAmount;
        if (given < order.totalAmount) {
          res.status(400).json({
            success: false,
            message: `Verilən nağd məbləğ (${given.toFixed(2)} AZN) hesabdan (${order.totalAmount.toFixed(2)} AZN) azdır`
          });
          return;
        }

        const change = parseFloat((given - order.totalAmount).toFixed(2));
        const rec = await prisma.payment.create({
          data: {
            orderId: order.id,
            amount: order.totalAmount,
            method: 'CASH',
            cashGiven: given,
            changeGiven: change,
            terminalStatus: 'SUCCESS',
            processedById: cashierId
          }
        });
        createdPayments.push(rec);
      }

      // Əgər anbar hələ çıxılmayıbsa (məsələn birbaşa kassada ödənildikdə)
      if (!order.stockDeducted) {
        await StockService.deductStockForOrder(order.id);
      }

      // Sifarişi COMPLETED edirik
      const completedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.COMPLETED,
          cashierId: cashierId,
          updatedAt: new Date()
        },
        include: {
          table: true,
          items: { include: { menuItem: true } },
          cashier: true,
          payments: true
        }
      });

      // Masanı təmizləyirik (EMPTY)
      const updatedTable = await prisma.table.update({
        where: { id: order.tableId },
        data: { status: TableStatus.EMPTY }
      });

      // Restoran məlumatı və termo qəbz generasiyası
      const settings = await prisma.restaurantSetting.findFirst();
      const receiptText = ReceiptService.generateReceiptText(completedOrder, settings, createdPayments);

      // Audit log
      if (req.user) {
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'PAYMENT_PROCESSED',
            details: `Sifariş #${order.orderNumber} üçün ${order.totalAmount} AZN ödəniş qəbul edildi (${method})`
          }
        });
      }

      socketService.notifyOrderStatusChanged(completedOrder);
      socketService.notifyTableStatusChanged(updatedTable);

      res.json({
        success: true,
        order: completedOrder,
        payments: createdPayments,
        receiptText,
        message: 'Ödəniş uğurla qəbul edildi və hesab bağlandı'
      });
    } catch (error: any) {
      console.error('Payment error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Qəbzin təkrar çapı və ya görüntülənməsi
  public static async getReceipt(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          table: true,
          items: { include: { menuItem: true } },
          cashier: true,
          payments: true
        }
      });

      if (!order) {
        res.status(404).json({ success: false, message: 'Sifariş tapılmadı' });
        return;
      }

      const settings = await prisma.restaurantSetting.findFirst();
      const receiptText = ReceiptService.generateReceiptText(order, settings, order.payments);

      res.json({
        success: true,
        receiptText,
        order,
        restaurant: settings
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Gündəlik Kassa Hesabatı (Z-Hesabat)
  public static async getDailyCashierReport(req: Request, res: Response): Promise<void> {
    try {
      const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);
      const startOfDay = new Date(dateStr);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);

      const payments = await prisma.payment.findMany({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay }
        },
        include: {
          order: {
            include: { table: true }
          },
          processedBy: true
        }
      });

      let totalCash = 0;
      let totalCard = 0;
      let totalRevenue = 0;

      for (const p of payments) {
        totalRevenue += p.amount;
        if (p.method === 'CASH') {
          totalCash += p.amount;
        } else if (p.method === 'CARD_TERMINAL') {
          totalCard += p.amount;
        }
      }

      res.json({
        success: true,
        date: dateStr,
        totalOrdersPaid: payments.length,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalCash: parseFloat(totalCash.toFixed(2)),
        totalCard: parseFloat(totalCard.toFixed(2)),
        payments
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
