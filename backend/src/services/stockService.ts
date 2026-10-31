import { PrismaClient } from '@prisma/client';
import { socketService } from './socketService';

const prisma = new PrismaClient();

export class StockService {
  /**
   * Sifariş təsdiq edildikdə və ya mətbəx tərəfindən qəbul edildikdə:
   * Sifarişdəki bütün məhsulların reseptlərinə uyğun olaraq ərzaqları anbardan çıxır.
   */
  public static async deductStockForOrder(orderId: string): Promise<boolean> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                recipeItems: {
                  include: {
                    ingredient: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!order || order.stockDeducted) {
      return false; // Əgər artıq çıxılıbsa, təkrar çıxma!
    }

    // Əməliyyatları tranzaksiya daxilində icra edirik
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        for (const recipe of item.menuItem.recipeItems) {
          const totalIngredientQuantity = recipe.quantityNeeded * item.quantity;
          const ingredient = recipe.ingredient;

          const previousStock = ingredient.currentStock;
          const newStock = Math.max(0, previousStock - totalIngredientQuantity);

          // Anbar qalığını yeniləyirik
          const updatedIngredient = await tx.ingredient.update({
            where: { id: ingredient.id },
            data: { currentStock: newStock }
          });

          // Hərəkət jurnalına yazırıq
          await tx.stockTransaction.create({
            data: {
              ingredientId: ingredient.id,
              type: 'OUTGOING_USAGE',
              quantity: totalIngredientQuantity,
              previousStock,
              newStock,
              unitCost: ingredient.purchasePricePerUnit,
              totalCost: totalIngredientQuantity * ingredient.purchasePricePerUnit,
              note: `Sifariş #${order.orderNumber} avtomatik resept sərfi (${item.menuItem.name} x${item.quantity})`
            }
          });

          // Əgər minimum həddən aşağı düşübsə xəbərdarlıq göndəririk
          if (newStock <= updatedIngredient.minStockThreshold) {
            socketService.notifyStockAlert({
              ingredientId: updatedIngredient.id,
              name: updatedIngredient.name,
              currentStock: updatedIngredient.currentStock,
              minStockThreshold: updatedIngredient.minStockThreshold,
              unit: updatedIngredient.unit,
              message: `DİQQƏT: "${updatedIngredient.name}" anbar qalığı kritik həddə çatdı (${updatedIngredient.currentStock} ${updatedIngredient.unit})!`
            });
          }
        }
      }

      // Sifarişdə anbar çıxışı qeyd edildi
      await tx.order.update({
        where: { id: orderId },
        data: { stockDeducted: true }
      });
    });

    return true;
  }

  /**
   * Sifariş ləğv edildikdə və ya geri qaytarıldıqda:
   * Əgər ərzaqlar anbardan çıxarılmışdısa, onları anbara geri qaytarır.
   */
  public static async revertStockForOrder(orderId: string, reason?: string): Promise<boolean> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                recipeItems: {
                  include: {
                    ingredient: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!order || !order.stockDeducted) {
      return false; // Əgər çıxılmayıbsa geri qaytarmağa ehtiyac yoxdur
    }

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        for (const recipe of item.menuItem.recipeItems) {
          const totalIngredientQuantity = recipe.quantityNeeded * item.quantity;
          const ingredient = recipe.ingredient;

          const previousStock = ingredient.currentStock;
          const newStock = previousStock + totalIngredientQuantity;

          await tx.ingredient.update({
            where: { id: ingredient.id },
            data: { currentStock: newStock }
          });

          await tx.stockTransaction.create({
            data: {
              ingredientId: ingredient.id,
              type: 'RETURN_REVERSAL',
              quantity: totalIngredientQuantity,
              previousStock,
              newStock,
              unitCost: ingredient.purchasePricePerUnit,
              totalCost: totalIngredientQuantity * ingredient.purchasePricePerUnit,
              note: `Sifariş #${order.orderNumber} ləğv edildi, ərzaqlar anbara qaytarıldı. Səbəb: ${reason || 'Göstərilməyib'}`
            }
          });
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: { stockDeducted: false }
      });
    });

    return true;
  }
}
