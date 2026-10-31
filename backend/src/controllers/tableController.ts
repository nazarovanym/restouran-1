import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { QRService } from '../services/qrService';
import { socketService } from '../services/socketService';
import { config } from '../config';

const prisma = new PrismaClient();

export class TableController {
  public static async getAllTables(req: Request, res: Response): Promise<void> {
    try {
      const tables = await prisma.table.findMany({
        where: { isActive: true },
        include: {
          orders: {
            where: {
              status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED'] }
            },
            include: {
              items: {
                include: { menuItem: true }
              }
            }
          },
          waiterCalls: {
            where: { status: 'PENDING' }
          }
        },
        orderBy: { tableNumber: 'asc' }
      });

      // Hər masa üçün QR kod DataURL əlavə edirik
      const baseUrl = config.frontendUrl;
      const tablesWithQR = await Promise.all(
        tables.map(async (t) => ({
          ...t,
          qrCodeUrl: await QRService.generateQRCodeDataUrl(baseUrl, t.token),
          activeOrder: t.orders[0] || null
        }))
      );

      res.json({ success: true, tables: tablesWithQR });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async getTableByToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const table = await prisma.table.findUnique({
        where: { token },
        include: {
          orders: {
            where: {
              status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED'] }
            },
            include: {
              items: {
                include: { menuItem: true }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      if (!table || !table.isActive) {
        res.status(404).json({ success: false, message: 'Masa tapılmadı və ya qeyri-aktivdir' });
        return;
      }

      const settings = await prisma.restaurantSetting.findFirst();

      res.json({
        success: true,
        table: {
          id: table.id,
          tableNumber: table.tableNumber,
          section: table.section,
          status: table.status,
          token: table.token,
          activeOrder: table.orders[0] || null
        },
        restaurant: settings
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async createTable(req: Request, res: Response): Promise<void> {
    try {
      const { tableNumber, capacity, section } = req.body;
      if (!tableNumber) {
        res.status(400).json({ success: false, message: 'Masa nömrəsi daxil edilməlidir' });
        return;
      }

      const token = QRService.generateTableToken(tableNumber);
      const table = await prisma.table.create({
        data: {
          tableNumber,
          capacity: parseInt(capacity, 10) || 4,
          section: section || 'Əsas Zal',
          token
        }
      });

      const qrCodeUrl = await QRService.generateQRCodeDataUrl(config.frontendUrl, token);
      socketService.notifyTableStatusChanged(table);

      res.status(201).json({ success: true, table: { ...table, qrCodeUrl }, message: 'Masa yaradıldı' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async updateTableStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const table = await prisma.table.update({
        where: { id },
        data: { status }
      });

      socketService.notifyTableStatusChanged(table);
      res.json({ success: true, table, message: 'Masa statusu yeniləndi' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async regenerateToken(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const existing = await prisma.table.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ success: false, message: 'Masa tapılmadı' });
        return;
      }

      const newToken = QRService.generateTableToken(existing.tableNumber);
      const table = await prisma.table.update({
        where: { id },
        data: { token: newToken }
      });

      const qrCodeUrl = await QRService.generateQRCodeDataUrl(config.frontendUrl, newToken);
      res.json({ success: true, table: { ...table, qrCodeUrl }, message: 'Masa üçün yeni təhlükəsiz QR kod yaradıldı' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
