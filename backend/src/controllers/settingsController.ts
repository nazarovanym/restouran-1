import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export class SettingsController {
  public static async getSettings(req: Request, res: Response): Promise<void> {
    try {
      let settings = await prisma.restaurantSetting.findFirst();
      if (!settings) {
        settings = await prisma.restaurantSetting.create({
          data: {
            id: 'default-settings',
            name: 'Naxçıvan Restoran & Lounge',
            address: 'Bakı şəhəri, Nizami küç. 42',
            phone: '+994 (12) 498-88-99',
            tin: '1402394821',
            currency: 'AZN',
            vatPercentage: 0,
            serviceFeePercentage: 5,
            terminalType: 'SIMULATED_POS'
          }
        });
      }
      res.json({ success: true, settings });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, address, phone, tin, currency, vatPercentage, serviceFeePercentage, terminalType, terminalConfig } = req.body;

      let settings = await prisma.restaurantSetting.findFirst();
      if (!settings) {
        settings = await prisma.restaurantSetting.create({
          data: { id: 'default-settings' }
        });
      }

      const updated = await prisma.restaurantSetting.update({
        where: { id: settings.id },
        data: {
          name: name !== undefined ? name : undefined,
          address: address !== undefined ? address : undefined,
          phone: phone !== undefined ? phone : undefined,
          tin: tin !== undefined ? tin : undefined,
          currency: currency !== undefined ? currency : undefined,
          vatPercentage: vatPercentage !== undefined ? parseFloat(vatPercentage) : undefined,
          serviceFeePercentage: serviceFeePercentage !== undefined ? parseFloat(serviceFeePercentage) : undefined,
          terminalType: terminalType !== undefined ? terminalType : undefined,
          terminalConfig: terminalConfig !== undefined ? (typeof terminalConfig === 'string' ? terminalConfig : JSON.stringify(terminalConfig)) : undefined
        }
      });

      res.json({ success: true, settings: updated, message: 'Restoran parametrləri yeniləndi' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
