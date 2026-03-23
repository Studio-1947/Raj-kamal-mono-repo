import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/authPrisma.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard statistics and overview
 */

/**
 * @swagger
 * /api/dashboard/overview:
 *   get:
 *     summary: Get dashboard overview data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview stats, recent orders, and chart data
 *       401:
 *         description: Unauthorized
 */

// Mock dashboard data
const dashboardStats = {
  totalSales: 24320,
  orders: 1284,
  customers: 842,
  refunds: 12,
  salesGrowth: 8.2,
  ordersGrowth: 2.1,
  customersGrowth: 4.7,
  refundsGrowth: -0.6,
};

const recentOrders = [
  {
    id: '1',
    customer: 'John Doe',
    amount: 299.99,
    status: 'completed',
    date: new Date('2024-01-15'),
  },
  {
    id: '2',
    customer: 'Jane Smith',
    amount: 149.50,
    status: 'pending',
    date: new Date('2024-01-14'),
  },
  {
    id: '3',
    customer: 'Bob Johnson',
    amount: 89.99,
    status: 'shipped',
    date: new Date('2024-01-13'),
  },
];

const salesChartData = [
  { month: 'Jan', sales: 4000 },
  { month: 'Feb', sales: 3000 },
  { month: 'Mar', sales: 5000 },
  { month: 'Apr', sales: 4500 },
  { month: 'May', sales: 6000 },
  { month: 'Jun', sales: 5500 },
];

// Get dashboard overview
router.get('/overview', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      stats: dashboardStats,
      recentOrders,
      salesChart: salesChartData,
    }
  });
});

/**
 * @swagger
 * /api/dashboard/sales:
 *   get:
 *     summary: Get sales statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales growth and chart data
 *       401:
 *         description: Unauthorized
 */
// Get sales statistics
router.get('/sales', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      totalSales: dashboardStats.totalSales,
      growth: dashboardStats.salesGrowth,
      chartData: salesChartData,
    }
  });
});

/**
 * @swagger
 * /api/dashboard/orders:
 *   get:
 *     summary: Get orders statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order growth and recent orders
 *       401:
 *         description: Unauthorized
 */
// Get orders statistics
router.get('/orders', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      totalOrders: dashboardStats.orders,
      growth: dashboardStats.ordersGrowth,
      recentOrders,
    }
  });
});

/**
 * @swagger
 * /api/dashboard/customers:
 *   get:
 *     summary: Get customer statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer growth and total count
 *       401:
 *         description: Unauthorized
 */
// Get customer statistics
router.get('/customers', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      totalCustomers: dashboardStats.customers,
      growth: dashboardStats.customersGrowth,
    }
  });
});

export default router;
