import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { OrderStatus } from '../types';

const prisma = new PrismaClient();

export class ReportController {
  public static async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      let dateFilter: any = {};
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        dateFilter = { gte: start, lte: end };
      } else {
        // Son 30 gün default
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        dateFilter = { gte: thirtyDaysAgo };
      }

      // 1. Bütün sifarişlər (filtr üzrə)
      const allOrders = await prisma.order.findMany({
        where: { createdAt: dateFilter },
        include: {
          table: true,
          waiter: true,
          cashier: true,
          payments: true,
          items: {
            include: { menuItem: true }
          }
        }
      });

      // 2. Tamamlanmış və ləğv edilmiş sifarişlərin ayrılması
      const completedOrders = allOrders.filter(o => o.status === OrderStatus.COMPLETED);
      const cancelledOrders = allOrders.filter(o => o.status === OrderStatus.CANCELLED);

      // 3. Maliyyə statistikası
      let totalRevenue = 0;
      let totalCash = 0;
      let totalCard = 0;
      let totalDiscount = 0;
      let totalServiceFee = 0;

      for (const order of completedOrders) {
        totalRevenue += order.totalAmount;
        totalDiscount += order.discountAmount;
        totalServiceFee += order.serviceFee;

        for (const p of order.payments) {
          if (p.method === 'CASH') totalCash += p.amount;
          else if (p.method === 'CARD_TERMINAL') totalCard += p.amount;
        }
      }

      // 4. Məhsul satış sayı və gəlirləri (Top & Least selling)
      const productStatsMap = new Map<string, { id: string; name: string; quantity: number; revenue: number }>();
      for (const order of completedOrders) {
        for (const item of order.items) {
          const key = item.menuItemId;
          const current = productStatsMap.get(key) || {
            id: key,
            name: item.menuItem.name,
            quantity: 0,
            revenue: 0
          };
          current.quantity += item.quantity;
          current.revenue += item.totalPrice;
          productStatsMap.set(key, current);
        }
      }

      const productsArray = Array.from(productStatsMap.values());
      const topSellingProducts = [...productsArray].sort((a, b) => b.quantity - a.quantity).slice(0, 8);
      const leastSellingProducts = [...productsArray].sort((a, b) => a.quantity - b.quantity).slice(0, 8);

      // 5. Masalar üzrə satışlar
      const tableStatsMap = new Map<string, { tableNumber: string; section: string; ordersCount: number; totalAmount: number }>();
      for (const order of completedOrders) {
        const tNum = order.table.tableNumber;
        const current = tableStatsMap.get(tNum) || {
          tableNumber: tNum,
          section: order.table.section,
          ordersCount: 0,
          totalAmount: 0
        };
        current.ordersCount += 1;
        current.totalAmount += order.totalAmount;
        tableStatsMap.set(tNum, current);
      }
      const tableSales = Array.from(tableStatsMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);

      // 6. İşçilər üzrə satışlar (Kassir & Ofisiant)
      const staffStatsMap = new Map<string, { name: string; role: string; ordersCount: number; totalAmount: number }>();
      for (const order of completedOrders) {
        const staff = order.cashier || order.waiter;
        if (staff) {
          const current = staffStatsMap.get(staff.id) || {
            name: staff.fullName,
            role: staff.role,
            ordersCount: 0,
            totalAmount: 0
          };
          current.ordersCount += 1;
          current.totalAmount += order.totalAmount;
          staffStatsMap.set(staff.id, current);
        }
      }
      const staffSales = Array.from(staffStatsMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);

      // 7. Günlük satış dinamikası (qrafik üçün)
      const dailyMap = new Map<string, { date: string; revenue: number; orderCount: number }>();
      for (const order of completedOrders) {
        const dayStr = order.createdAt.toISOString().slice(0, 10);
        const cur = dailyMap.get(dayStr) || { date: dayStr, revenue: 0, orderCount: 0 };
        cur.revenue += order.totalAmount;
        cur.orderCount += 1;
        dailyMap.set(dayStr, cur);
      }
      const dailySalesTrend = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      // 8. Anbar qalıqları xülasəsi
      const ingredients = await prisma.ingredient.findMany();
      const totalInventoryValuation = ingredients.reduce((sum, ing) => sum + (ing.currentStock * ing.purchasePricePerUnit), 0);
      const lowStockItems = ingredients.filter(i => i.currentStock <= i.minStockThreshold);

      res.json({
        success: true,
        summary: {
          totalOrders: allOrders.length,
          completedOrdersCount: completedOrders.length,
          cancelledOrdersCount: cancelledOrders.length,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalCash: parseFloat(totalCash.toFixed(2)),
          totalCard: parseFloat(totalCard.toFixed(2)),
          totalDiscount: parseFloat(totalDiscount.toFixed(2)),
          totalServiceFee: parseFloat(totalServiceFee.toFixed(2)),
          totalInventoryValuation: parseFloat(totalInventoryValuation.toFixed(2)),
          lowStockCount: lowStockItems.length
        },
        topSellingProducts,
        leastSellingProducts,
        tableSales,
        staffSales,
        dailySalesTrend,
        cancelledOrders: cancelledOrders.map(o => ({
          id: o.id,
          orderNumber: o.orderNumber,
          tableNumber: o.table.tableNumber,
          totalAmount: o.totalAmount,
          createdAt: o.createdAt,
          reason: o.notes || 'Səbəb qeyd edilməyib'
        })),
        lowStockItems: lowStockItems.map(i => ({
          id: i.id,
          name: i.name,
          currentStock: i.currentStock,
          minStockThreshold: i.minStockThreshold,
          unit: i.unit
        }))
      });
    } catch (error: any) {
      console.error('Report error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Hesabatın CSV/Excel formatında ixrac edilməsi üçün xam data
  public static async exportReportData(req: Request, res: Response): Promise<void> {
    try {
      const orders = await prisma.order.findMany({
        include: {
          table: true,
          cashier: true,
          payments: true
        },
        orderBy: { createdAt: 'desc' }
      });

      // CSV formatına çevirmə
      let csv = 'Sifaris_No,Masa,Tarix,Mebleg,Endirim,Xidmet,Yekun,Status,Odenis_Novu,Kassir\n';
      for (const o of orders) {
        const paymentMethods = o.payments.map(p => p.method).join(';');
        csv += `"${o.orderNumber}","${o.table.tableNumber}","${o.createdAt.toISOString()}","${o.subtotal}","${o.discountAmount}","${o.serviceFee}","${o.totalAmount}","${o.status}","${paymentMethods}","${o.cashier?.fullName || ''}"\n`;
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=hesabat_restoran.csv');
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
