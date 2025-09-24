import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { query } from '../config/database.js';

const router = express.Router();

// Enhanced inventory items with Hindi book data
const inventoryItems = [
  {
    id: '1',
    name: 'गोदान',
    sku: 'RK-GODAN-001',
    category: 'उपन्यास',
    quantity: 450,
    price: 100,
    cost: 75,
    status: 'in_stock' as const,
    lastUpdated: new Date('2024-01-15'),
    author: 'मुंशी प्रेमचंद',
    isbn: '978-81-267-0001-1',
    publisher: 'राजकमल प्रकाशन',
    reorderLevel: 50,
    maxStock: 500,
  },
  {
    id: '2',
    name: 'हरी घास के ये दिन',
    sku: 'RK-HGKYD-002',
    category: 'कहानी संग्रह',
    quantity: 23,
    price: 100,
    cost: 75,
    status: 'low_stock' as const,
    lastUpdated: new Date('2024-01-14'),
    author: 'फणीश्वरनाथ रेणु',
    isbn: '978-81-267-0002-2',
    publisher: 'राजकमल प्रकाशन',
    reorderLevel: 25,
    maxStock: 200,
  },
  {
    id: '3',
    name: 'चित्रलेखा',
    sku: 'RK-CHITRA-003',
    category: 'उपन्यास',
    quantity: 89,
    price: 100,
    cost: 75,
    status: 'in_stock' as const,
    lastUpdated: new Date('2024-01-13'),
    author: 'भगवतीचरण वर्मा',
    isbn: '978-81-267-0003-3',
    publisher: 'राजकमल प्रकाशन',
    reorderLevel: 30,
    maxStock: 150,
  },
  {
    id: '4',
    name: 'तमस',
    sku: 'RK-TAMAS-004',
    category: 'उपन्यास',
    quantity: 0,
    price: 100,
    cost: 75,
    status: 'out_of_stock' as const,
    lastUpdated: new Date('2024-01-12'),
    author: 'भीष्म साहनी',
    isbn: '978-81-267-0004-4',
    publisher: 'राजकमल प्रकाशन',
    reorderLevel: 25,
    maxStock: 120,
  },
  {
    id: '5',
    name: 'आग का दरिया',
    sku: 'RK-AAGKA-005',
    category: 'उपन्यास',
    quantity: 78,
    price: 100,
    cost: 75,
    status: 'in_stock' as const,
    lastUpdated: new Date('2024-01-11'),
    author: 'कुर्रतुल ऐन हैदर',
    isbn: '978-81-267-0005-5',
    publisher: 'राजकमल प्रकाशन',
    reorderLevel: 20,
    maxStock: 100,
  },
  {
    id: '6',
    name: 'कफन',
    sku: 'RK-KAFAN-006',
    category: 'कहानी',
    quantity: 234,
    price: 100,
    cost: 75,
    status: 'in_stock' as const,
    lastUpdated: new Date('2024-01-10'),
    author: 'मुंशी प्रेमचंद',
    isbn: '978-81-267-0006-6',
    publisher: 'राजकमल प्रकाशन',
    reorderLevel: 40,
    maxStock: 300,
  },
  {
    id: '7',
    name: 'गबन',
    sku: 'RK-GABAN-007',
    category: 'उपन्यास',
    quantity: 15,
    price: 100,
    cost: 75,
    status: 'low_stock' as const,
    lastUpdated: new Date('2024-01-09'),
    author: 'मुंशी प्रेमचंद',
    isbn: '978-81-267-0007-7',
    publisher: 'राजकमल प्रकाशन',
    reorderLevel: 20,
    maxStock: 150,
  },
  {
    id: '8',
    name: 'रामधारी सिंह दिनकर काव्य संग्रह',
    sku: 'RK-RSD-008',
    category: 'काव्य संग्रह',
    quantity: 156,
    price: 120,
    cost: 90,
    status: 'in_stock' as const,
    lastUpdated: new Date('2024-01-08'),
    author: 'रामधारी सिंह दिनकर',
    isbn: '978-81-267-0008-8',
    publisher: 'राजकमल प्रकाशन',
    reorderLevel: 30,
    maxStock: 200,
  },
  {
    id: '9',
    name: 'अंधेर नगरी',
    sku: 'RK-ANDHER-009',
    category: 'नाटक',
    quantity: 67,
    price: 80,
    cost: 60,
    status: 'in_stock' as const,
    lastUpdated: new Date('2024-01-07'),
    author: 'भारतेंदु हरिश्चंद्र',
    isbn: '978-81-267-0009-9',
    publisher: 'राजकमल प्रकाशन',
    reorderLevel: 15,
    maxStock: 100,
  },
  {
    id: '10',
    name: 'अपना देश',
    sku: 'RK-APNA-010',
    category: 'आत्मकथा',
    quantity: 0,
    price: 150,
    cost: 110,
    status: 'discontinued' as const,
    lastUpdated: new Date('2024-01-06'),
    author: 'जवाहरलाल नेहरू',
    isbn: '978-81-267-0010-0',
    publisher: 'राजकमल प्रकाशन',
    reorderLevel: 0,
    maxStock: 0,
  },
];

// Categories with comprehensive data
const categories = [
  {
    id: '1',
    name: 'उपन्यास',
    itemCount: 145,
    totalValue: 1245000,
    description: 'हिंदी साहित्य के प्रसिद्ध उपन्यास',
  },
  {
    id: '2',
    name: 'कहानी संग्रह',
    itemCount: 87,
    totalValue: 623000,
    description: 'हिंदी कहानियों के संग्रह',
  },
  {
    id: '3',
    name: 'काव्य संग्रह',
    itemCount: 56,
    totalValue: 445000,
    description: 'हिंदी काव्य और कविताएं',
  },
  {
    id: '4',
    name: 'नाटक',
    itemCount: 34,
    totalValue: 189000,
    description: 'हिंदी नाटक और रंगमंच',
  },
  {
    id: '5',
    name: 'आत्मकथा',
    itemCount: 23,
    totalValue: 167000,
    description: 'व्यक्तिगत जीवन कथाएं',
  },
  {
    id: '6',
    name: 'कहानी',
    itemCount: 45,
    totalValue: 234000,
    description: 'व्यक्तिगत हिंदी कहानियां',
  },
];

// Calculate inventory summary
const calculateInventorySummary = () => {
  const totalItems = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = inventoryItems.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
  const lowStockItems = inventoryItems.filter(item => item.status === 'low_stock').length;
  const outOfStockItems = inventoryItems.filter(item => item.status === 'out_of_stock').length;
  const inStockItems = inventoryItems.filter(item => item.status === 'in_stock').length;
  const discontinuedItems = inventoryItems.filter(item => item.status === 'discontinued').length;

  return {
    totalItems,
    totalValue,
    lowStockItems,
    outOfStockItems,
    inStockItems,
    discontinuedItems,
    totalProducts: inventoryItems.length,
    averageValue: totalValue / inventoryItems.length,
  };
};

// Public endpoint for testing inventory data
router.get('/public/items', async (req, res) => {
  try {
    const inventoryQuery = `
      SELECT 
        b.id,
        b.title_hindi as name,
        b.isbn as sku,
        c.name_hindi as category,
        b.stock_quantity as quantity,
        b.price,
        b.cost,
        b.status,
        b.updated_at as "lastUpdated",
        a.name_hindi as author,
        b.isbn,
        'राजकमल प्रकाशन' as publisher,
        b.reorder_level as "reorderLevel",
        b.max_stock as "maxStock"
      FROM books b
      LEFT JOIN authors a ON b.author_id = a.id
      LEFT JOIN categories c ON b.category_id = c.id
      ORDER BY b.title_hindi
      LIMIT 10
    `;
    
    const result = await query(inventoryQuery);
    
    res.json({
      success: true,
      message: 'Public inventory data (for testing)',
      data: result.rows,
      meta: {
        total: result.rows.length,
        limit: 10,
      }
    });
  } catch (error) {
    console.error('Public inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inventory data',
      error: error.message
    });
  }
});

// Get all inventory items
router.get('/items', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { category, status, search, page = 1, limit = 20, sortBy = 'title', sortOrder = 'asc' } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Build WHERE clause
    if (category) {
      whereConditions.push(`c.name = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }
    
    if (status) {
      whereConditions.push(`b.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (search) {
      whereConditions.push(`(b.title_hindi ILIKE $${paramIndex} OR a.name_hindi ILIKE $${paramIndex} OR b.isbn LIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Validate sortBy to prevent SQL injection
    const validSortFields = ['title', 'title_hindi', 'stock_quantity', 'price', 'created_at'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'title_hindi';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const inventoryQuery = `
      SELECT 
        b.id,
        b.title_hindi as name,
        b.isbn as sku,
        c.name_hindi as category,
        b.stock_quantity as quantity,
        b.price,
        b.cost,
        b.status,
        b.updated_at as "lastUpdated",
        a.name_hindi as author,
        b.isbn,
        'राजकमल प्रकाशन' as publisher,
        b.reorder_level as "reorderLevel",
        b.max_stock as "maxStock"
      FROM books b
      LEFT JOIN authors a ON b.author_id = a.id
      LEFT JOIN categories c ON b.category_id = c.id
      ${whereClause}
      ORDER BY b.${sortField} ${order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, (Number(page) - 1) * Number(limit));
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM books b
      LEFT JOIN authors a ON b.author_id = a.id  
      LEFT JOIN categories c ON b.category_id = c.id
      ${whereClause}
    `;
    
    const [itemsResult, countResult] = await Promise.all([
      query(inventoryQuery, queryParams),
      query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset params
    ]);
    
    res.json({
      success: true,
      data: itemsResult.rows,
      meta: {
        total: parseInt(countResult.rows[0].total),
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(countResult.rows[0].total / Number(limit)),
        filters: { category, status, search },
        sortBy,
        sortOrder,
      }
    });
  } catch (error) {
    console.error('Inventory items error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inventory items'
    });
  }
});

// Get inventory categories
router.get('/categories', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const categoriesQuery = `
      SELECT 
        c.id,
        c.name_hindi as name,
        COUNT(b.id) as "itemCount",
        COALESCE(SUM(b.stock_quantity * b.cost), 0) as "totalValue",
        c.description
      FROM categories c
      LEFT JOIN books b ON c.id = b.category_id
      GROUP BY c.id, c.name_hindi, c.description
      ORDER BY c.name_hindi
    `;
    
    const result = await query(categoriesQuery);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories'
    });
  }
});

// Get inventory summary
router.get('/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const summaryQuery = `
      SELECT 
        SUM(stock_quantity) as "totalItems",
        SUM(stock_quantity * cost) as "totalValue",
        COUNT(CASE WHEN status = 'low_stock' THEN 1 END) as "lowStockItems",
        COUNT(CASE WHEN status = 'out_of_stock' THEN 1 END) as "outOfStockItems", 
        COUNT(CASE WHEN status = 'in_stock' THEN 1 END) as "inStockItems",
        COUNT(CASE WHEN status = 'discontinued' THEN 1 END) as "discontinuedItems",
        COUNT(*) as "totalProducts"
      FROM books
    `;
    
    const result = await query(summaryQuery);
    const summary = result.rows[0];
    
    res.json({
      success: true,
      data: {
        ...summary,
        totalItems: parseInt(summary.totalItems || 0),
        totalValue: parseFloat(summary.totalValue || 0),
        lowStockItems: parseInt(summary.lowStockItems || 0),
        outOfStockItems: parseInt(summary.outOfStockItems || 0),
        inStockItems: parseInt(summary.inStockItems || 0),
        discontinuedItems: parseInt(summary.discontinuedItems || 0),
        totalProducts: parseInt(summary.totalProducts || 0),
        averageValue: parseFloat(summary.totalValue || 0) / parseInt(summary.totalProducts || 1),
      }
    });
  } catch (error) {
    console.error('Inventory summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inventory summary'
    });
  }
});

// Get low stock items
router.get('/low-stock', authenticateToken, (req: AuthRequest, res: Response) => {
  const lowStockItems = inventoryItems.filter(item => 
    item.status === 'low_stock' || item.quantity <= item.reorderLevel
  );
  
  res.json({
    success: true,
    data: lowStockItems
  });
});

// Get inventory alerts
router.get('/alerts', authenticateToken, (req: AuthRequest, res: Response) => {
  const alerts = [
    {
      id: '1',
      type: 'low_stock',
      title: 'Low Stock Alert',
      message: 'हरी घास के ये दिन - Only 23 copies remaining',
      item: inventoryItems.find(item => item.sku === 'RK-HGKYD-002'),
      priority: 'high',
      createdAt: new Date('2024-01-15'),
    },
    {
      id: '2',
      type: 'out_of_stock',
      title: 'Out of Stock',
      message: 'तमस - Completely out of stock',
      item: inventoryItems.find(item => item.sku === 'RK-TAMAS-004'),
      priority: 'critical',
      createdAt: new Date('2024-01-12'),
    },
    {
      id: '3',
      type: 'low_stock',
      title: 'Low Stock Alert',
      message: 'गबन - Only 15 copies remaining',
      item: inventoryItems.find(item => item.sku === 'RK-GABAN-007'),
      priority: 'medium',
      createdAt: new Date('2024-01-09'),
    },
  ];
  
  res.json({
    success: true,
    data: alerts
  });
});

// Get inventory overview (dashboard data)
router.get('/overview', authenticateToken, (req: AuthRequest, res: Response) => {
  const summary = calculateInventorySummary();
  const lowStockItems = inventoryItems.filter(item => item.status === 'low_stock').slice(0, 5);
  const recentUpdates = inventoryItems
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 5);
  
  res.json({
    success: true,
    data: {
      summary,
      lowStockItems,
      recentUpdates,
      categories: categories.slice(0, 6),
    }
  });
});

export default router;
