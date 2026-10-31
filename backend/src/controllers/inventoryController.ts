import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export class InventoryController {
  // Bütün ərzaqlar və onların mövcud qalıqları
  public static async getAllIngredients(req: Request, res: Response): Promise<void> {
    try {
      const ingredients = await prisma.ingredient.findMany({
        include: {
          recipeItems: {
            include: { menuItem: true }
          }
        },
        orderBy: { name: 'asc' }
      });

      // Kritik ehtiyat xəbərdarlığı olanlar
      const lowStockCount = ingredients.filter(i => i.currentStock <= i.minStockThreshold).length;

      res.json({
        success: true,
        ingredients,
        lowStockCount
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Yeni ərzaq əlavə etmə
  public static async createIngredient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, unit, minStockThreshold, purchasePricePerUnit, initialStock } = req.body;

      if (!name || !unit) {
        res.status(400).json({ success: false, message: 'Ərzaq adı və ölçü vahidi daxil edilməlidir' });
        return;
      }

      const initialQty = parseFloat(initialStock) || 0;
      const unitCost = parseFloat(purchasePricePerUnit) || 0;

      const ingredient = await prisma.ingredient.create({
        data: {
          name,
          unit,
          minStockThreshold: parseFloat(minStockThreshold) || 5,
          purchasePricePerUnit: unitCost,
          currentStock: initialQty
        }
      });

      if (initialQty > 0) {
        await prisma.stockTransaction.create({
          data: {
            ingredientId: ingredient.id,
            type: 'INCOMING',
            quantity: initialQty,
            previousStock: 0,
            newStock: initialQty,
            unitCost,
            totalCost: initialQty * unitCost,
            note: 'İlkin qalıq daxilolması'
          }
        });
      }

      res.status(201).json({ success: true, ingredient, message: 'Yeni ərzaq qeydə alındı' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Anbara yeni ərzaq alışı / daxilolma qeydi (Purchase)
  public static async recordPurchase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { ingredientId, quantity, unitCost, supplier, invoiceNumber, note } = req.body;

      if (!ingredientId || !quantity || quantity <= 0) {
        res.status(400).json({ success: false, message: 'Ərzaq və düzgün miqdar seçilməlidir' });
        return;
      }

      const ingredient = await prisma.ingredient.findUnique({ where: { id: ingredientId } });
      if (!ingredient) {
        res.status(404).json({ success: false, message: 'Ərzaq tapılmadı' });
        return;
      }

      const addedQty = parseFloat(quantity);
      const cost = unitCost !== undefined ? parseFloat(unitCost) : ingredient.purchasePricePerUnit;
      const previousStock = ingredient.currentStock;
      const newStock = previousStock + addedQty;

      await prisma.$transaction([
        prisma.ingredient.update({
          where: { id: ingredientId },
          data: {
            currentStock: newStock,
            purchasePricePerUnit: cost
          }
        }),
        prisma.stockTransaction.create({
          data: {
            ingredientId,
            type: 'INCOMING',
            quantity: addedQty,
            previousStock,
            newStock,
            unitCost: cost,
            totalCost: addedQty * cost,
            supplier: supplier || null,
            invoiceNumber: invoiceNumber || null,
            note: note || 'Anbara daxilolma'
          }
        })
      ]);

      res.json({
        success: true,
        message: `${addedQty} ${ingredient.unit} "${ingredient.name}" anbara əlavə edildi`
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Əl ilə anbar düzəlişi (İnventarizasiya)
  public static async manualStockAdjustment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { ingredientId, newQuantity, note } = req.body;

      if (!ingredientId || newQuantity === undefined) {
        res.status(400).json({ success: false, message: 'Ərzaq və yeni miqdar daxil edilməlidir' });
        return;
      }

      const ingredient = await prisma.ingredient.findUnique({ where: { id: ingredientId } });
      if (!ingredient) {
        res.status(404).json({ success: false, message: 'Ərzaq tapılmadı' });
        return;
      }

      const previousStock = ingredient.currentStock;
      const targetStock = parseFloat(newQuantity);
      const diff = targetStock - previousStock;

      await prisma.$transaction([
        prisma.ingredient.update({
          where: { id: ingredientId },
          data: { currentStock: targetStock }
        }),
        prisma.stockTransaction.create({
          data: {
            ingredientId,
            type: 'MANUAL_CORRECTION',
            quantity: diff,
            previousStock,
            newStock: targetStock,
            unitCost: ingredient.purchasePricePerUnit,
            totalCost: Math.abs(diff) * ingredient.purchasePricePerUnit,
            note: note || 'İnventarizasiya düzəlişi'
          }
        })
      ]);

      res.json({
        success: true,
        message: `"${ingredient.name}" qalığı ${targetStock} ${ingredient.unit} olaraq yeniləndi`
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Anbar hərəkətləri jurnalı (History)
  public static async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { ingredientId, type, limit } = req.query;

      const whereClause: any = {};
      if (ingredientId) whereClause.ingredientId = ingredientId as string;
      if (type) whereClause.type = type as string;

      const transactions = await prisma.stockTransaction.findMany({
        where: whereClause,
        include: { ingredient: true },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10) || 100
      });

      res.json({ success: true, transactions });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
