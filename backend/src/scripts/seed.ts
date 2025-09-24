import { ensureAdminExists } from '../lib/bootstrap.js';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

async function seedCategories() {
  const categories = [
    { name: 'Novel', description: 'हिंदी साहित्य के प्रसिद्ध उपन्यास' },
    { name: 'Short Story Collection', description: 'हिंदी कहानियों के संग्रह' },
    { name: 'Poetry Collection', description: 'हिंदी काव्य और कविताएं' },
    { name: 'Drama', description: 'हिंदी नाटक और रंगमंच' },
    { name: 'History', description: 'ऐतिहासिक ग्रंथ और पुस्तकें' },
    { name: 'Autobiography', description: 'व्यक्तिगत जीवन कथाएं' },
    { name: 'Short Story', description: 'व्यक्तिगत हिंदी कहानियां' },
    { name: 'Essay', description: 'साहित्यिक और सामाजिक निबंध' },
    { name: 'Biography', description: 'महान व्यक्तित्वों की जीवनी' }
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category
    });
  }
  
  console.log('✅ Categories seeded');
}

async function seedProducts() {
  const categories = await prisma.category.findMany();

  const products = [
    { name: 'Godan', sku: 'RKP-GOD-001', price: 100.00, cost: 75.00, quantity: 450, categoryName: 'Novel', description: 'गोदान - A masterpiece by Munshi Premchand' },
    { name: 'Hari Ghas Ke Ye Din', sku: 'RKP-HGD-002', price: 100.00, cost: 75.00, quantity: 23, categoryName: 'Short Story Collection', description: 'हरी घास के ये दिन - By Phanishwarnath Renu' },
    { name: 'Chitralekha', sku: 'RKP-CHI-003', price: 100.00, cost: 75.00, quantity: 89, categoryName: 'Novel', description: 'चित्रलेखा - By Bhagwaticharan Verma' },
    { name: 'Tamas', sku: 'RKP-TAM-004', price: 100.00, cost: 75.00, quantity: 0, categoryName: 'Novel', description: 'तमस - By Bhishma Sahni' },
    { name: 'Aag Ka Darya', sku: 'RKP-AKD-005', price: 100.00, cost: 75.00, quantity: 78, categoryName: 'Novel', description: 'आग का दरिया - By Qurratulain Hyder' },
    { name: 'Kafan', sku: 'RKP-KAF-006', price: 100.00, cost: 75.00, quantity: 234, categoryName: 'Short Story', description: 'कफन - By Munshi Premchand' },
    { name: 'Gaban', sku: 'RKP-GAB-007', price: 100.00, cost: 75.00, quantity: 15, categoryName: 'Novel', description: 'गबन - By Munshi Premchand' },
    { name: 'Dinkar Kavya Sangrah', sku: 'RKP-RSD-008', price: 120.00, cost: 90.00, quantity: 156, categoryName: 'Poetry Collection', description: 'रामधारी सिंह दिनकर काव्य संग्रह' },
    { name: 'Andher Nagri', sku: 'RKP-AND-009', price: 80.00, cost: 60.00, quantity: 67, categoryName: 'Drama', description: 'अंधेर नगरी - By Bharatendu Harishchandra' },
    { name: 'Discovery of India', sku: 'RKP-DOI-010', price: 150.00, cost: 110.00, quantity: 0, categoryName: 'History', description: 'भारत एक खोज - By Jawaharlal Nehru' }
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: {
        name: product.name,
        sku: product.sku,
        description: product.description,
        category: product.categoryName,
        price: product.price,
        cost: product.cost,
        quantity: product.quantity,
        status: product.quantity > 0 ? (product.quantity < 30 ? 'LOW_STOCK' : 'IN_STOCK') : 'OUT_OF_STOCK'
      }
    });
  }
  
  console.log('✅ Products seeded');
}

async function seedUsers() {
  const users = [
    { email: 'rajesh.sharma@example.com', name: 'राजेश कुमार शर्मा', role: 'USER' },
    { email: 'sunita.gupta@example.com', name: 'सुनीता देवी गुप्ता', role: 'USER' },
    { email: 'amit.singh@example.com', name: 'अमित कुमार सिंह', role: 'USER' },
    { email: 'priya.yadav@example.com', name: 'प्रिया यादव', role: 'USER' },
    { email: 'vikas.chandra@example.com', name: 'विकास चंद्र', role: 'USER' },
    { email: 'rita.sharma@example.com', name: 'रीता शर्मा', role: 'USER' },
    { email: 'sanjay.kumar@example.com', name: 'संजय कुमार', role: 'USER' },
    { email: 'meera.devi@example.com', name: 'मीरा देवी', role: 'USER' }
  ];

  const defaultPassword = await bcrypt.hash('user123', 10);

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        name: user.name,
        password: defaultPassword,
        role: user.role as any
      }
    });
  }
  
  console.log('✅ Users seeded');
}

async function seedOrders() {
  const users = await prisma.user.findMany({ where: { role: 'USER' } });
  const products = await prisma.product.findMany();

  if (users.length === 0 || products.length === 0) {
    console.log('⚠️ Skipping orders - no users or products found');
    return;
  }

  // Create some sample orders
  for (let i = 0; i < 10; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomProducts = products.slice(0, Math.floor(Math.random() * 3) + 1);
    
    const totalAmount = randomProducts.reduce((sum, product) => sum + Number(product.price), 0);

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-2024-${String(i + 1).padStart(3, '0')}`,
        userId: randomUser.id,
        status: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'][Math.floor(Math.random() * 5)] as any,
        totalAmount: totalAmount,
        shippingAddress: {
          street: '123 Sample Street',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          country: 'India'
        }
      }
    });

    // Create order items
    for (const product of randomProducts) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          quantity: Math.floor(Math.random() * 3) + 1,
          price: Number(product.price)
        }
      });
    }
  }
  
  console.log('✅ Orders seeded');
}

async function seed() {
  try {
    console.log('🌱 Starting comprehensive database seeding...');
    
    // Ensure admin user exists first
    await ensureAdminExists();
    
    // Seed all other data
    await seedCategories();
    await seedProducts();
    await seedUsers();
    await seedOrders();
    
    // Show summary
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.category.count(),
      prisma.product.count(),
      prisma.order.count()
    ]);

    console.log('📊 Database Summary:');
    console.log(`   Users: ${counts[0]}`);
    console.log(`   Categories: ${counts[1]}`);
    console.log(`   Products: ${counts[2]}`);
    console.log(`   Orders: ${counts[3]}`);
    
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();