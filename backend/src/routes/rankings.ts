import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { query } from '../config/database.js';

const router = express.Router();

// Get product rankings
router.get('/products', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 10, sortBy = 'sales' } = req.query;
    
    const validSortFields = ['sales', 'revenue', 'title_hindi'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'revenue';
    
    const rankingsQuery = `
      WITH book_sales AS (
        SELECT 
          b.id,
          b.title_hindi as name,
          b.isbn as sku,
          COALESCE(SUM(oi.quantity), 0) as sales,
          COALESCE(SUM(oi.total_price), 0) as revenue,
          ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(oi.total_price), 0) DESC) as rank,
          0 as change, -- Mock change for now
          a.name_hindi as author,
          c.name_hindi as category,
          b.price,
          b.stock_quantity as "stockLevel"
        FROM books b
        LEFT JOIN authors a ON b.author_id = a.id
        LEFT JOIN categories c ON b.category_id = c.id
        LEFT JOIN order_items oi ON b.id = oi.book_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('delivered', 'shipped')
        GROUP BY b.id, b.title_hindi, b.isbn, a.name_hindi, c.name_hindi, b.price, b.stock_quantity
      )
      SELECT * FROM book_sales
      ORDER BY ${sortField === 'sales' ? 'sales' : sortField === 'title_hindi' ? 'name' : 'revenue'} DESC
      LIMIT $1
    `;
    
    const result = await query(rankingsQuery, [limit]);
    
    res.json({
      success: true,
      data: result.rows,
      meta: {
        total: result.rows.length,
        limit: Number(limit),
        sortBy,
      }
    });
  } catch (error) {
    console.error('Product rankings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product rankings'
    });
  }
});

// Get customer rankings
router.get('/customers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 10, sortBy = 'totalSpent' } = req.query;
    
    const validSortFields = ['totalSpent', 'totalOrders', 'name'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'totalSpent';
    
    const customersQuery = `
      SELECT 
        c.id,
        c.name,
        c.email,
        c.total_orders as "totalOrders",
        c.total_spent as "totalSpent",
        ROW_NUMBER() OVER (ORDER BY c.total_spent DESC) as rank,
        0 as change,
        c.city as location,
        c.created_at::date as "joinDate",
        (SELECT MAX(created_at)::date FROM orders WHERE customer_id = c.id) as "lastOrderDate",
        c.customer_type as "customerType"
      FROM customers c
      ORDER BY ${sortField === 'totalOrders' ? 'c.total_orders' : sortField === 'name' ? 'c.name' : 'c.total_spent'} DESC
      LIMIT $1
    `;
    
    const result = await query(customersQuery, [limit]);
    
    res.json({
      success: true,
      data: result.rows,
      meta: {
        total: result.rows.length,
        limit: Number(limit),
        sortBy,
      }
    });
  } catch (error) {
    console.error('Customer rankings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer rankings'
    });
  }
});

// Get category rankings
router.get('/categories', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 10, sortBy = 'totalSales' } = req.query;
    
    const categoriesQuery = `
      WITH category_sales AS (
        SELECT 
          c.id,
          c.name_hindi as name,
          COALESCE(SUM(oi.quantity), 0) as "totalSales",
          COALESCE(SUM(oi.total_price), 0) as "totalRevenue",
          ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(oi.total_price), 0) DESC) as rank,
          0 as change,
          COUNT(DISTINCT b.id) as "totalBooks",
          COALESCE(AVG(b.price), 0) as "avgPrice",
          15.2 as "growthRate", -- Mock growth rate
          (
            SELECT b2.title_hindi 
            FROM books b2 
            JOIN order_items oi2 ON b2.id = oi2.book_id 
            WHERE b2.category_id = c.id 
            GROUP BY b2.id, b2.title_hindi 
            ORDER BY SUM(oi2.quantity) DESC 
            LIMIT 1
          ) as "topSellingBook"
        FROM categories c
        LEFT JOIN books b ON c.id = b.category_id
        LEFT JOIN order_items oi ON b.id = oi.book_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('delivered', 'shipped')
        GROUP BY c.id, c.name_hindi
      )
      SELECT * FROM category_sales
      ORDER BY ${sortBy === 'totalRevenue' ? '"totalRevenue"' : sortBy === 'name' ? 'name' : '"totalSales"'} DESC
      LIMIT $1
    `;
    
    const result = await query(categoriesQuery, [limit]);
    
    res.json({
      success: true,
      data: result.rows,
      meta: {
        total: result.rows.length,
        limit: Number(limit),
        sortBy,
      }
    });
  } catch (error) {
    console.error('Category rankings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category rankings'
    });
  }
});

// Get rankings summary
router.get('/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Get top product
    const topProductQuery = `
      SELECT 
        b.title_hindi as name,
        COALESCE(SUM(oi.quantity), 0) as sales,
        COALESCE(SUM(oi.total_price), 0) as revenue,
        a.name_hindi as author,
        15.2 as growth
      FROM books b
      LEFT JOIN authors a ON b.author_id = a.id
      LEFT JOIN order_items oi ON b.id = oi.book_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('delivered', 'shipped')
      GROUP BY b.id, b.title_hindi, a.name_hindi
      ORDER BY revenue DESC
      LIMIT 1
    `;
    
    // Get top customer
    const topCustomerQuery = `
      SELECT 
        name,
        total_spent as "totalSpent",
        total_orders as "totalOrders",
        city as location,
        95 as "loyaltyScore"
      FROM customers
      ORDER BY total_spent DESC
      LIMIT 1
    `;
    
    // Get top category
    const topCategoryQuery = `
      SELECT 
        c.name_hindi as name,
        COALESCE(SUM(oi.quantity), 0) as "totalSales",
        COALESCE(SUM(oi.total_price), 0) as "totalRevenue",
        48.5 as "marketShare",
        15.2 as growth
      FROM categories c
      LEFT JOIN books b ON c.id = b.category_id
      LEFT JOIN order_items oi ON b.id = oi.book_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('delivered', 'shipped')
      GROUP BY c.id, c.name_hindi
      ORDER BY "totalRevenue" DESC
      LIMIT 1
    `;
    
    const [topProduct, topCustomer, topCategory] = await Promise.all([
      query(topProductQuery),
      query(topCustomerQuery),
      query(topCategoryQuery)
    ]);
    
    res.json({
      success: true,
      data: {
        topProduct: topProduct.rows[0] || {},
        topCustomer: topCustomer.rows[0] || {},
        topCategory: topCategory.rows[0] || {},
      }
    });
  } catch (error) {
    console.error('Rankings summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rankings summary'
    });
  }
});

// Get all rankings (overview)
router.get('/overview', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [products, customers, categories, summary] = await Promise.all([
      query(`
        WITH book_sales AS (
          SELECT 
            b.id,
            b.title_hindi as name,
            b.isbn as sku,
            COALESCE(SUM(oi.quantity), 0) as sales,
            COALESCE(SUM(oi.total_price), 0) as revenue,
            ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(oi.total_price), 0) DESC) as rank,
            0 as change,
            a.name_hindi as author,
            c.name_hindi as category,
            b.price,
            b.stock_quantity as "stockLevel"
          FROM books b
          LEFT JOIN authors a ON b.author_id = a.id
          LEFT JOIN categories c ON b.category_id = c.id
          LEFT JOIN order_items oi ON b.id = oi.book_id
          LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('delivered', 'shipped')
          GROUP BY b.id, b.title_hindi, b.isbn, a.name_hindi, c.name_hindi, b.price, b.stock_quantity
        )
        SELECT * FROM book_sales ORDER BY revenue DESC LIMIT 5
      `),
      query(`
        SELECT 
          c.id,
          c.name,
          c.email,
          c.total_orders as "totalOrders",
          c.total_spent as "totalSpent",
          ROW_NUMBER() OVER (ORDER BY c.total_spent DESC) as rank,
          0 as change,
          c.city as location,
          c.created_at::date as "joinDate",
          (SELECT MAX(created_at)::date FROM orders WHERE customer_id = c.id) as "lastOrderDate",
          c.customer_type as "customerType"
        FROM customers c
        ORDER BY c.total_spent DESC
        LIMIT 5
      `),
      query(`
        WITH category_sales AS (
          SELECT 
            c.id,
            c.name_hindi as name,
            COALESCE(SUM(oi.quantity), 0) as "totalSales",
            COALESCE(SUM(oi.total_price), 0) as "totalRevenue",
            ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(oi.total_price), 0) DESC) as rank,
            0 as change,
            COUNT(DISTINCT b.id) as "totalBooks",
            COALESCE(AVG(b.price), 0) as "avgPrice",
            15.2 as "growthRate"
          FROM categories c
          LEFT JOIN books b ON c.id = b.category_id
          LEFT JOIN order_items oi ON b.id = oi.book_id
          LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('delivered', 'shipped')
          GROUP BY c.id, c.name_hindi
        )
        SELECT * FROM category_sales ORDER BY "totalRevenue" DESC LIMIT 5
      `),
      // Summary query would go here - using a simple mock for now
      Promise.resolve({ rows: [{ 
        topProduct: { name: 'गोदान' },
        topCustomer: { name: 'राजेश कुमार शर्मा' },
        topCategory: { name: 'उपन्यास' }
      }] })
    ]);
    
    res.json({
      success: true,
      data: {
        products: products.rows,
        customers: customers.rows,
        categories: categories.rows,
        summary: summary.rows[0],
      }
    });
  } catch (error) {
    console.error('Rankings overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rankings overview'
    });
  }
});

export default router;
