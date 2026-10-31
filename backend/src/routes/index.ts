import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { TableController } from '../controllers/tableController';
import { MenuController } from '../controllers/menuController';
import { OrderController } from '../controllers/orderController';
import { PaymentController } from '../controllers/paymentController';
import { InventoryController } from '../controllers/inventoryController';
import { ReportController } from '../controllers/reportController';
import { WaiterCallController } from '../controllers/waiterCallController';
import { SettingsController } from '../controllers/settingsController';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

// ================= AUTH ROUTES =================
router.post('/auth/login', AuthController.login);
router.get('/auth/me', authenticateToken, AuthController.getCurrentUser);
router.get('/auth/users', authenticateToken, requireRoles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN), AuthController.getUsers);
router.post('/auth/users', authenticateToken, requireRoles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN), AuthController.createUser);

// ================= TABLE ROUTES =================
router.get('/tables', TableController.getAllTables);
router.get('/tables/token/:token', TableController.getTableByToken); // QR Menyu üçün açıq endpoint
router.post('/tables', authenticateToken, requireRoles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN), TableController.createTable);
router.patch('/tables/:id/status', TableController.updateTableStatus);
router.post('/tables/:id/regenerate-token', authenticateToken, requireRoles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN), TableController.regenerateToken);

// ================= MENU & CATEGORIES ROUTES =================
router.get('/menu', MenuController.getFullMenu); // Açıq: Müştəri və işçilər
router.get('/menu/all', authenticateToken, MenuController.getAllMenuItems);
router.get('/categories', MenuController.getCategories);
router.post('/categories', authenticateToken, requireRoles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN), MenuController.createCategory);
router.post('/menu', authenticateToken, requireRoles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN), MenuController.createMenuItem);
router.put('/menu/:id', authenticateToken, requireRoles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN), MenuController.updateMenuItem);
router.patch('/menu/:id/toggle-availability', authenticateToken, requireRoles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN, UserRole.CASHIER, UserRole.KITCHEN_STAFF), MenuController.toggleAvailability);

// ================= ORDER ROUTES =================
router.get('/orders', authenticateToken, OrderController.getOrders);
router.get('/orders/kitchen', authenticateToken, OrderController.getKitchenOrders);
router.post('/orders', OrderController.createOrder); // QR kodla müştəri və ya kassa/ofisiant tərəfindən
router.patch('/orders/:id/status', OrderController.updateOrderStatus);
router.post('/orders/:id/items', OrderController.addItemToOrder);
router.delete('/orders/:id/items/:itemId', OrderController.removeItemFromOrder);

// ================= PAYMENT & POS ROUTES =================
router.post('/payments/:orderId/apply-discount', authenticateToken, requireRoles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN, UserRole.CASHIER), PaymentController.applyDiscount);
router.post('/payments/:orderId/process', authenticateToken, requireRoles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN, UserRole.CASHIER), PaymentController.processPayment);
router.get('/payments/:orderId/receipt', PaymentController.getReceipt);
router.get('/payments/daily-report', authenticateToken, requireRoles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN, UserRole.CASHIER), PaymentController.getDailyCashierReport);

// ================= INVENTORY & RECIPES ROUTES =================
router.get('/inventory', authenticateToken, requireRoles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN, UserRole.STOCK_MANAGER), InventoryController.getAllIngredients);
router.post('/inventory', authenticateToken, requireRoles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN, UserRole.STOCK_MANAGER), InventoryController.createIngredient);
router.post('/inventory/purchase', authenticateToken, requireRoles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN, UserRole.STOCK_MANAGER), InventoryController.recordPurchase);
router.post('/inventory/adjust', authenticateToken, requireRoles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN, UserRole.STOCK_MANAGER), InventoryController.manualStockAdjustment);
router.get('/inventory/transactions', authenticateToken, requireRoles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN, UserRole.STOCK_MANAGER), InventoryController.getTransactions);

// ================= REPORTS & ANALYTICS ROUTES =================
router.get('/reports/analytics', authenticateToken, requireRoles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN), ReportController.getAnalytics);
router.get('/reports/export-csv', authenticateToken, requireRoles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN), ReportController.exportReportData);

// ================= WAITER CALL ROUTES =================
router.post('/waiter-calls', WaiterCallController.createCall); // Müştəri üçün açıq
router.get('/waiter-calls', WaiterCallController.getActiveCalls);
router.patch('/waiter-calls/:id/resolve', WaiterCallController.resolveCall);

// ================= RESTAURANT SETTINGS ROUTES =================
router.get('/settings', SettingsController.getSettings);
router.put('/settings', authenticateToken, requireRoles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN), SettingsController.updateSettings);

export default router;
