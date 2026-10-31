import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { socketService } from '../services/socketService';
import { TableStatus } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export class WaiterCallController {
  // Müştəri ofisiant çağırışı göndərir (QR Menyu vasitəsilə)
  public static async createCall(req: Request, res: Response): Promise<void> {
    try {
      const { tableToken, callType } = req.body;

      if (!tableToken) {
        res.status(400).json({ success: false, message: 'Masa tokeni daxil edilməlidir' });
        return;
      }

      const table = await prisma.table.findUnique({ where: { token: tableToken } });
      if (!table) {
        res.status(404).json({ success: false, message: 'Masa tapılmadı' });
        return;
      }

      // Əgər həmin masadan artıq gözləyən çağırış varsa, təkrar yaratmırıq
      const existing = await prisma.waiterCall.findFirst({
        where: {
          tableId: table.id,
          status: { in: ['PENDING', 'ACKNOWLEDGED'] }
        }
      });

      if (existing) {
        res.json({
          success: true,
          call: existing,
          message: 'Ofisiant çağırışınız artıq qəbul olunub və personal masanıza yaxınlaşır'
        });
        return;
      }

      const call = await prisma.waiterCall.create({
        data: {
          tableId: table.id,
          callType: callType || 'ASSISTANCE',
          status: 'PENDING'
        },
        include: { table: true }
      });

      // Əgər hesab istənibsə, masa statusunu BILL_PENDING edirik
      if (callType === 'BILL_REQUEST') {
        await prisma.table.update({
          where: { id: table.id },
          data: { status: TableStatus.BILL_PENDING }
        });
      }

      socketService.notifyWaiterCall(call);

      res.status(201).json({
        success: true,
        call,
        message: 'Ofisiant çağırıldı. Zəhmət olmasa gözləyin, personal dərhal yaxınlaşacaq'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Bütün aktiv çağırışlar (Ofisiant və Kassa paneli üçün)
  public static async getActiveCalls(req: Request, res: Response): Promise<void> {
    try {
      const calls = await prisma.waiterCall.findMany({
        where: { status: { in: ['PENDING', 'ACKNOWLEDGED'] } },
        include: { table: true },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, calls });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Çağırışı tamamlamaq / ləğv etmək
  public static async resolveCall(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body; // 'ACKNOWLEDGED' və ya 'RESOLVED'

      const call = await prisma.waiterCall.update({
        where: { id },
        data: {
          status: status || 'RESOLVED',
          resolvedAt: status === 'RESOLVED' ? new Date() : undefined,
          resolvedById: req.user?.id || null
        },
        include: { table: true }
      });

      socketService.notifyWaiterCall(call);
      res.json({ success: true, call, message: 'Çağırış statusu yeniləndi' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
