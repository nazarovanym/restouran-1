import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class MenuController {
  // Bütün menyu (Kateqoriyalar və məhsulları ilə birlikdə)
  public static async getFullMenu(req: Request, res: Response): Promise<void> {
    try {
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        include: {
          items: {
            where: { isAvailable: true },
            include: {
              recipeItems: {
                include: { ingredient: true }
              }
            },
            orderBy: { displayOrder: 'asc' }
          }
        },
        orderBy: { displayOrder: 'asc' }
      });

      res.json({ success: true, categories });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Admin üçün menyu (bütün məhsullar, deaktiv olanlar da daxil)
  public static async getAllMenuItems(req: Request, res: Response): Promise<void> {
    try {
      const items = await prisma.menuItem.findMany({
        include: {
          category: true,
          recipeItems: {
            include: { ingredient: true }
          }
        },
        orderBy: [{ categoryId: 'asc' }, { displayOrder: 'asc' }]
      });

      res.json({ success: true, items });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Kateqoriyalar
  public static async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { displayOrder: 'asc' }
      });
      res.json({ success: true, categories });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const { name, icon, displayOrder } = req.body;
      if (!name) {
        res.status(400).json({ success: false, message: 'Kateqoriya adı mütləqdir' });
        return;
      }

      const category = await prisma.category.create({
        data: {
          name,
          icon: icon || 'Utensils',
          displayOrder: parseInt(displayOrder, 10) || 0
        }
      });

      res.status(201).json({ success: true, category, message: 'Kateqoriya yaradıldı' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async createMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const { categoryId, name, description, price, imageUrl, preparationTimeMinutes, recipes } = req.body;

      if (!categoryId || !name || price === undefined) {
        res.status(400).json({ success: false, message: 'Kateqoriya, ad və qiymət mütləqdir' });
        return;
      }

      const item = await prisma.menuItem.create({
        data: {
          categoryId,
          name,
          description: description || null,
          price: parseFloat(price),
          imageUrl: imageUrl || null,
          preparationTimeMinutes: parseInt(preparationTimeMinutes, 10) || 15
        }
      });

      // Əgər resept təyin edilibsə
      if (Array.isArray(recipes) && recipes.length > 0) {
        for (const r of recipes) {
          if (r.ingredientId && r.quantityNeeded > 0) {
            await prisma.recipeItem.create({
              data: {
                menuItemId: item.id,
                ingredientId: r.ingredientId,
                quantityNeeded: parseFloat(r.quantityNeeded)
              }
            });
          }
        }
      }

      res.status(201).json({ success: true, item, message: 'Məhsul əlavə edildi' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async updateMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, price, imageUrl, categoryId, isAvailable, isTemporarilyUnavailable, preparationTimeMinutes, recipes } = req.body;

      const updated = await prisma.menuItem.update({
        where: { id },
        data: {
          name: name !== undefined ? name : undefined,
          description: description !== undefined ? description : undefined,
          price: price !== undefined ? parseFloat(price) : undefined,
          imageUrl: imageUrl !== undefined ? imageUrl : undefined,
          categoryId: categoryId !== undefined ? categoryId : undefined,
          isAvailable: isAvailable !== undefined ? isAvailable : undefined,
          isTemporarilyUnavailable: isTemporarilyUnavailable !== undefined ? isTemporarilyUnavailable : undefined,
          preparationTimeMinutes: preparationTimeMinutes !== undefined ? parseInt(preparationTimeMinutes, 10) : undefined
        }
      });

      // Resept yenilənməsi
      if (Array.isArray(recipes)) {
        await prisma.recipeItem.deleteMany({ where: { menuItemId: id } });
        for (const r of recipes) {
          if (r.ingredientId && r.quantityNeeded > 0) {
            await prisma.recipeItem.create({
              data: {
                menuItemId: id,
                ingredientId: r.ingredientId,
                quantityNeeded: parseFloat(r.quantityNeeded)
              }
            });
          }
        }
      }

      res.json({ success: true, item: updated, message: 'Məhsul məlumatları yeniləndi' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async toggleAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isAvailable, isTemporarilyUnavailable } = req.body;

      const item = await prisma.menuItem.update({
        where: { id },
        data: {
          isAvailable: isAvailable !== undefined ? isAvailable : undefined,
          isTemporarilyUnavailable: isTemporarilyUnavailable !== undefined ? isTemporarilyUnavailable : undefined
        }
      });

      res.json({ success: true, item, message: 'Satış statusu dəyişdirildi' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
