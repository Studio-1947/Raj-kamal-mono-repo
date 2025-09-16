import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Mock rankings data
const productRankings = [
  {
    id: '1',
    name: 'Premium Widget',
    sku: 'PW-001',
    sales: 1250,
    revenue: 37487.50,
    rank: 1,
    change: 0,
  },
  {
    id: '2',
    name: 'Standard Widget',
    sku: 'SW-002',
    sales: 980,
    revenue: 19590.20,
    rank: 2,
    change: 1,
  },
  {
    id: '3',
    name: 'Basic Component',
    sku: 'BC-004',
    sales: 750,
    revenue: 7492.50,
    rank: 3,
    change: -1,
  },
  {
    id: '4',
    name: 'Deluxe Widget',
    sku: 'DW-003',
    sales: 420,
    revenue: 20995.80,
    rank: 4,
    change: 0,
  },
];

const customerRankings = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    totalOrders: 15,
    totalSpent: 2450.75,
    rank: 1,
    change: 0,
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    totalOrders: 12,
    totalSpent: 1890.50,
    rank: 2,
    change: 1,
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    totalOrders: 8,
    totalSpent: 1250.25,
    rank: 3,
    change: -1,
  },
  {
    id: '4',
    name: 'Alice Brown',
    email: 'alice@example.com',
    totalOrders: 6,
    totalSpent: 890.00,
    rank: 4,
    change: 0,
  },
];

const categoryRankings = [
  {
    id: '1',
    name: 'Widgets',
    totalSales: 2650,
    totalRevenue: 85073.50,
    rank: 1,
    change: 0,
  },
  {
    id: '2',
    name: 'Components',
    totalSales: 750,
    totalRevenue: 7492.50,
    rank: 2,
    change: 0,
  },
  {
    id: '3',
    name: 'Accessories',
    totalSales: 0,
    totalRevenue: 0,
    rank: 3,
    change: 0,
  },
];

// Get product rankings
router.get('/products', authenticateToken, (req: AuthRequest, res: Response) => {
  const { limit = 10, sortBy = 'sales' } = req.query;
  
  let sortedProducts = [...productRankings];
  
  if (sortBy === 'revenue') {
    sortedProducts.sort((a, b) => b.revenue - a.revenue);
  } else if (sortBy === 'sales') {
    sortedProducts.sort((a, b) => b.sales - a.sales);
  }
  
  const limitNum = parseInt(limit as string);
  const limitedProducts = sortedProducts.slice(0, limitNum);
  
  res.json({
    success: true,
    data: {
      products: limitedProducts,
      total: productRankings.length,
    }
  });
});

// Get customer rankings
router.get('/customers', authenticateToken, (req: AuthRequest, res: Response) => {
  const { limit = 10, sortBy = 'totalSpent' } = req.query;
  
  let sortedCustomers = [...customerRankings];
  
  if (sortBy === 'totalOrders') {
    sortedCustomers.sort((a, b) => b.totalOrders - a.totalOrders);
  } else if (sortBy === 'totalSpent') {
    sortedCustomers.sort((a, b) => b.totalSpent - a.totalSpent);
  }
  
  const limitNum = parseInt(limit as string);
  const limitedCustomers = sortedCustomers.slice(0, limitNum);
  
  res.json({
    success: true,
    data: {
      customers: limitedCustomers,
      total: customerRankings.length,
    }
  });
});

// Get category rankings
router.get('/categories', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      categories: categoryRankings,
      total: categoryRankings.length,
    }
  });
});

// Get overall rankings summary
router.get('/summary', authenticateToken, (req: AuthRequest, res: Response): void => {
  const topProduct = productRankings[0];
  const topCustomer = customerRankings[0];
  const topCategory = categoryRankings[0];
  
  res.json({
    success: true,
    data: {
      topProduct: topProduct ? {
        name: topProduct.name,
        sales: topProduct.sales,
        revenue: topProduct.revenue,
      } : null,
      topCustomer: topCustomer ? {
        name: topCustomer.name,
        totalSpent: topCustomer.totalSpent,
        totalOrders: topCustomer.totalOrders,
      } : null,
      topCategory: topCategory ? {
        name: topCategory.name,
        totalSales: topCategory.totalSales,
        totalRevenue: topCategory.totalRevenue,
      } : null,
    }
  });
});

export default router;
