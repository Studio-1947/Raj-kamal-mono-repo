import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Mock inventory data
const inventoryItems = [
  {
    id: '1',
    name: 'Premium Widget',
    sku: 'PW-001',
    category: 'Widgets',
    quantity: 150,
    price: 29.99,
    cost: 15.00,
    status: 'in_stock',
    lastUpdated: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Standard Widget',
    sku: 'SW-002',
    category: 'Widgets',
    quantity: 75,
    price: 19.99,
    cost: 10.00,
    status: 'low_stock',
    lastUpdated: new Date('2024-01-14'),
  },
  {
    id: '3',
    name: 'Deluxe Widget',
    sku: 'DW-003',
    category: 'Widgets',
    quantity: 0,
    price: 49.99,
    cost: 25.00,
    status: 'out_of_stock',
    lastUpdated: new Date('2024-01-13'),
  },
  {
    id: '4',
    name: 'Basic Component',
    sku: 'BC-004',
    category: 'Components',
    quantity: 300,
    price: 9.99,
    cost: 5.00,
    status: 'in_stock',
    lastUpdated: new Date('2024-01-12'),
  },
];

const categories = [
  { id: '1', name: 'Widgets', itemCount: 3 },
  { id: '2', name: 'Components', itemCount: 1 },
  { id: '3', name: 'Accessories', itemCount: 0 },
];

// Get all inventory items
router.get('/items', authenticateToken, (req: AuthRequest, res: Response) => {
  const { category, status, search } = req.query;
  
  let filteredItems = [...inventoryItems];
  
  if (category) {
    filteredItems = filteredItems.filter(item => item.category === category);
  }
  
  if (status) {
    filteredItems = filteredItems.filter(item => item.status === status);
  }
  
  if (search) {
    const searchTerm = (search as string).toLowerCase();
    filteredItems = filteredItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm) ||
      item.sku.toLowerCase().includes(searchTerm)
    );
  }
  
  res.json({
    success: true,
    data: {
      items: filteredItems,
      total: filteredItems.length,
    }
  });
});

// Get inventory item by ID
router.get('/items/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const item = inventoryItems.find(item => item.id === id);
  
  if (!item) {
    return res.status(404).json({
      success: false,
      error: 'Item not found'
    });
  }
  
  res.json({
    success: true,
    data: { item }
  });
});

// Get inventory categories
router.get('/categories', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: { categories }
  });
});

// Get inventory summary
router.get('/summary', authenticateToken, (req: AuthRequest, res: Response) => {
  const totalItems = inventoryItems.length;
  const totalValue = inventoryItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const lowStockItems = inventoryItems.filter(item => item.status === 'low_stock').length;
  const outOfStockItems = inventoryItems.filter(item => item.status === 'out_of_stock').length;
  
  res.json({
    success: true,
    data: {
      totalItems,
      totalValue,
      lowStockItems,
      outOfStockItems,
      inStockItems: totalItems - lowStockItems - outOfStockItems,
    }
  });
});

export default router;
