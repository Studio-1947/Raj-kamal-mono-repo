import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { query } from '../config/database.js';

const router = express.Router();

// Helper function to calculate sales chart data from orders
const getSalesChartData = async () => {
  const salesQuery = `
    SELECT 
      TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as name,
      TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
      SUM(CASE WHEN order_type = 'online' THEN total_amount ELSE 0 END) as online,
      SUM(CASE WHEN order_type = 'offline' THEN total_amount ELSE 0 END) as offline,
      SUM(total_amount) as sales
    FROM orders 
    WHERE created_at >= NOW() - INTERVAL '12 months' 
    AND status IN ('delivered', 'shipped', 'processing')
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at)
  `;
  
  const result = await query(salesQuery);
  return result.rows;
};

// Helper function to get top performing books
const getTopBooks = async () => {
  const topBooksQuery = `
    SELECT 
      b.id,
      b.title_hindi as title,
      a.name_hindi as author,
      COALESCE(SUM(oi.quantity), 0) as sales,
      COALESCE(SUM(oi.total_price), 0) as revenue,
      15.2 as growth  -- Mock growth for now
    FROM books b
    LEFT JOIN authors a ON b.author_id = a.id
    LEFT JOIN order_items oi ON b.id = oi.book_id
    LEFT JOIN orders o ON oi.order_id = o.id
    WHERE o.status IN ('delivered', 'shipped') OR o.status IS NULL
    GROUP BY b.id, b.title_hindi, a.name_hindi
    ORDER BY revenue DESC
    LIMIT 5
  `;
  
  const result = await query(topBooksQuery);
  return result.rows;
};

// Helper function to get recent orders
const getRecentOrders = async () => {
  const ordersQuery = `
    SELECT 
      o.order_number as id,
      c.name as customer,
      o.total_amount as amount,
      o.status,
      o.created_at as date
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.created_at >= NOW() - INTERVAL '30 days'
    ORDER BY o.created_at DESC
    LIMIT 5
  `;
  
  const result = await query(ordersQuery);
  return result.rows;
};

// Helper function to calculate dashboard stats
const getDashboardStats = async () => {
  const statsQuery = `
    SELECT 
      (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status IN ('delivered', 'shipped') AND created_at >= DATE_TRUNC('month', NOW())) as total_sales,
      (SELECT COUNT(*) FROM orders WHERE created_at >= DATE_TRUNC('month', NOW())) as orders,
      (SELECT COUNT(*) FROM customers) as customers,
      (SELECT COUNT(*) FROM orders WHERE status = 'cancelled' AND created_at >= DATE_TRUNC('month', NOW())) as refunds
  `;
  
  const result = await query(statsQuery);
  const stats = result.rows[0];
  
  return {
    totalSales: parseInt(stats.total_sales),
    orders: parseInt(stats.orders),
    customers: parseInt(stats.customers),
    refunds: parseInt(stats.refunds),
    salesGrowth: 2.05, // Mock growth percentages for now
    ordersGrowth: 12.3,
    customersGrowth: 8.7,
    refundsGrowth: -15.2,
  };
};

// Public endpoint for testing database connection and data
router.get('/public/overview', async (req, res) => {
  try {
    const [stats, recentOrders, salesChart, topBooks] = await Promise.all([
      getDashboardStats(),
      getRecentOrders(), 
      getSalesChartData(),
      getTopBooks()
    ]);

    // Get territory performance from database
    const territoryResult = await query('SELECT name as territory, sales_amount as sales, growth_percentage as growth, order_count as orders FROM territories ORDER BY sales_amount DESC LIMIT 5');
    
    res.json({
      success: true,
      message: 'Public dashboard data (for testing)',
      data: {
        stats,
        recentOrders,
        salesChart,
        topBooks,
        territoryPerformance: territoryResult.rows,
      }
    });
  } catch (error) {
    console.error('Public dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

// Get dashboard overview
router.get('/overview', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [stats, recentOrders, salesChart, topBooks] = await Promise.all([
      getDashboardStats(),
      getRecentOrders(), 
      getSalesChartData(),
      getTopBooks()
    ]);

    // Get territory performance from database
    const territoryResult = await query('SELECT name as territory, sales_amount as sales, growth_percentage as growth, order_count as orders FROM territories ORDER BY sales_amount DESC LIMIT 5');
    
    res.json({
      success: true,
      data: {
        stats,
        recentOrders,
        salesChart,
        topBooks,
        territoryPerformance: territoryResult.rows,
      }
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data'
    });
  }
});

// Get sales statistics  
router.get('/sales', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getDashboardStats();
    const salesChart = await getSalesChartData();
    
    res.json({
      success: true,
      data: {
        totalSales: stats.totalSales,
        growth: stats.salesGrowth,
        chartData: salesChart,
        monthlyComparison: {
          currentMonth: stats.totalSales,
          previousMonth: Math.round(stats.totalSales / 1.0205), // Based on growth
          yearOverYear: Math.round(stats.totalSales * 0.9),
        },
      }
    });
  } catch (error) {
    console.error('Sales data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales data'
    });
  }
});

// Get orders statistics
router.get('/orders', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      totalOrders: dashboardStats.orders,
      growth: dashboardStats.ordersGrowth,
      recentOrders,
      ordersByStatus: {
        pending: 124,
        processing: 298,
        shipped: 467,
        delivered: 823,
        cancelled: 35,
      },
    }
  });
});

// Get customer statistics
router.get('/customers', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      totalCustomers: dashboardStats.customers,
      growth: dashboardStats.customersGrowth,
      newCustomers: 156,
      returningCustomers: 1128,
      customerSegments: {
        premium: 89,
        regular: 967,
        occasional: 228,
      },
    }
  });
});

// Get analytics data
router.get('/analytics', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      topBooks: topPerformingBooks,
      territoryPerformance,
      salesTrend: salesChartData.slice(-6), // Last 6 months
      conversionRate: 3.24,
      averageOrderValue: 1734.50,
    }
  });
});

export default router;
