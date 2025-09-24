-- Seed data for Raj Kamal Publishing Database

-- Insert Authors
INSERT INTO authors (name, name_hindi, birth_date, death_date, biography) VALUES
('Munshi Premchand', 'मुंशी प्रेमचंद', '1880-07-31', '1936-10-08', 'Greatest writer of Hindi literature, known for realistic portrayal of rural India'),
('Phanishwarnath Renu', 'फणीश्वरनाथ रेणु', '1921-03-04', '1977-04-11', 'Pioneer of the Anchalikata movement in Hindi literature'),
('Bhagwaticharan Verma', 'भगवतीचरण वर्मा', '1903-08-30', '1981-10-05', 'Famous for historical and social novels'),
('Bhishma Sahni', 'भीष्म साहनी', '1915-08-08', '2003-07-11', 'Prominent progressive writer, known for Partition literature'),
('Qurratulain Hyder', 'कुर्रतुल ऐन हैदर', '1927-01-20', '2007-08-21', 'Pioneering Urdu novelist who wrote in Hindi as well'),
('Ramdhari Singh Dinkar', 'रामधारी सिंह दिनकर', '1908-09-23', '1974-04-24', 'National poet of India, known for patriotic poetry'),
('Bharatendu Harishchandra', 'भारतेंदु हरिश्चंद्र', '1850-09-09', '1885-01-06', 'Father of modern Hindi literature and theatre'),
('Jawaharlal Nehru', 'जवाहरलाल नेहरू', '1889-11-14', '1964-05-27', 'First Prime Minister of India, prolific writer'),
('Vinod Kumar Shukla', 'विनोद कुमार शुक्ल', '1937-01-01', NULL, 'Contemporary poet and novelist known for unique style'),
('Mahadevi Verma', 'महादेवी वर्मा', '1907-03-26', '1987-09-11', 'One of the four pillars of Chhayavad movement');

-- Insert Categories  
INSERT INTO categories (name, name_hindi, description) VALUES
('Novel', 'उपन्यास', 'हिंदी साहित्य के प्रसिद्ध उपन्यास'),
('Short Story Collection', 'कहानी संग्रह', 'हिंदी कहानियों के संग्रह'),
('Poetry Collection', 'काव्य संग्रह', 'हिंदी काव्य और कविताएं'),
('Drama', 'नाटक', 'हिंदी नाटक और रंगमंच'),
('Autobiography', 'आत्मकथा', 'व्यक्तिगत जीवन कथाएं'),
('Short Story', 'कहानी', 'व्यक्तिगत हिंदी कहानियां'),
('Essay', 'निबंध', 'साहित्यिक और सामाजिक निबंध'),
('Biography', 'जीवनी', 'महान व्यक्तित्वों की जीवनी');

-- Insert Books
INSERT INTO books (title, title_hindi, author_id, category_id, isbn, price, cost, stock_quantity, reorder_level, max_stock, status, publication_date, pages) VALUES
('Godan', 'गोदान', 1, 1, '978-81-267-0001-1', 100.00, 75.00, 450, 50, 500, 'in_stock', '1936-01-01', 424),
('Hari Ghas Ke Ye Din', 'हरी घास के ये दिन', 2, 2, '978-81-267-0002-2', 100.00, 75.00, 23, 25, 200, 'low_stock', '1952-01-01', 234),
('Chitralekha', 'चित्रलेखा', 3, 1, '978-81-267-0003-3', 100.00, 75.00, 89, 30, 150, 'in_stock', '1934-01-01', 356),
('Tamas', 'तमस', 4, 1, '978-81-267-0004-4', 100.00, 75.00, 0, 25, 120, 'out_of_stock', '1973-01-01', 298),
('Aag Ka Darya', 'आग का दरिया', 5, 1, '978-81-267-0005-5', 100.00, 75.00, 78, 20, 100, 'in_stock', '1959-01-01', 789),
('Kafan', 'कफन', 1, 6, '978-81-267-0006-6', 100.00, 75.00, 234, 40, 300, 'in_stock', '1936-01-01', 45),
('Gaban', 'गबन', 1, 1, '978-81-267-0007-7', 100.00, 75.00, 15, 20, 150, 'low_stock', '1931-01-01', 234),
('Ramdhari Singh Dinkar Kavya Sangrah', 'रामधारी सिंह दिनकर काव्य संग्रह', 6, 3, '978-81-267-0008-8', 120.00, 90.00, 156, 30, 200, 'in_stock', '1950-01-01', 456),
('Andher Nagri', 'अंधेर नगरी', 7, 4, '978-81-267-0009-9', 80.00, 60.00, 67, 15, 100, 'in_stock', '1881-01-01', 89),
('Discovery of India', 'भारत एक खोज', 8, 5, '978-81-267-0010-0', 150.00, 110.00, 0, 0, 0, 'discontinued', '1946-01-01', 595),
('Nai Duniya', 'नई दुनिया', 1, 2, '978-81-267-0011-1', 90.00, 70.00, 145, 35, 200, 'in_stock', '1935-01-01', 189),
('Yama', 'यम', 10, 3, '978-81-267-0012-2', 110.00, 85.00, 89, 25, 150, 'in_stock', '1940-01-01', 234),
('Khilega To Dekhenge', 'खिलेगा तो देखेंगे', 9, 1, '978-81-267-0013-3', 125.00, 95.00, 67, 20, 100, 'in_stock', '2018-01-01', 289),
('Senapati Shivaram', 'सेनापति शिवराम', 1, 1, '978-81-267-0014-4', 95.00, 72.00, 123, 30, 180, 'in_stock', '1914-01-01', 267),
('Rangbhoomi', 'रंगभूमि', 1, 1, '978-81-267-0015-5', 135.00, 100.00, 45, 25, 120, 'low_stock', '1924-01-01', 456);

-- Insert Customers
INSERT INTO customers (name, email, phone, address, city, state, pincode, customer_type, total_spent, total_orders) VALUES
('राजेश कुमार शर्मा', 'rajesh.sharma@example.com', '+91-9876543210', '123 Gandhi Nagar', 'New Delhi', 'Delhi', '110001', 'premium', 47500.75, 47),
('सुनीता देवी गुप्ता', 'sunita.gupta@example.com', '+91-9876543211', '456 Hazratganj', 'Lucknow', 'Uttar Pradesh', '226001', 'regular', 38900.50, 35),
('अमित कुमार सिंह', 'amit.singh@example.com', '+91-9876543212', '789 Patna City', 'Patna', 'Bihar', '800001', 'regular', 32400.25, 28),
('प्रिया यादव', 'priya.yadav@example.com', '+91-9876543213', '321 Pink City', 'Jaipur', 'Rajasthan', '302001', 'regular', 25680.00, 22),
('विकास चंद्र', 'vikas.chandra@example.com', '+91-9876543214', '654 New Market', 'Bhopal', 'Madhya Pradesh', '462001', 'regular', 21890.80, 19),
('रीता शर्मा', 'rita.sharma@example.com', '+91-9876543215', '987 Civil Lines', 'Allahabad', 'Uttar Pradesh', '211001', 'occasional', 15600.50, 12),
('संजय कुमार', 'sanjay.kumar@example.com', '+91-9876543216', '147 Boring Road', 'Patna', 'Bihar', '800013', 'regular', 18900.75, 15),
('मीरा देवी', 'meera.devi@example.com', '+91-9876543217', '258 Lajpat Nagar', 'New Delhi', 'Delhi', '110024', 'premium', 34500.25, 28);

-- Insert Orders (Recent orders for the last 3 months)
INSERT INTO orders (order_number, customer_id, total_amount, status, payment_status, order_type, created_at) VALUES
('ORD-2024-001', 1, 1250.75, 'delivered', 'paid', 'online', '2024-01-15 10:30:00'),
('ORD-2024-002', 2, 890.50, 'processing', 'paid', 'offline', '2024-01-14 15:45:00'),
('ORD-2024-003', 3, 2340.25, 'shipped', 'paid', 'online', '2024-01-14 09:20:00'),
('ORD-2024-004', 4, 675.00, 'delivered', 'paid', 'online', '2024-01-13 14:15:00'),
('ORD-2024-005', 5, 1890.80, 'processing', 'paid', 'offline', '2024-01-13 11:30:00'),
('ORD-2024-006', 6, 450.00, 'delivered', 'paid', 'online', '2024-01-12 16:45:00'),
('ORD-2024-007', 7, 1200.50, 'shipped', 'paid', 'online', '2024-01-12 08:15:00'),
('ORD-2024-008', 8, 2100.75, 'delivered', 'paid', 'offline', '2024-01-11 13:20:00');

-- Insert Order Items
INSERT INTO order_items (order_id, book_id, quantity, unit_price, total_price) VALUES
(1, 1, 3, 100.00, 300.00),
(1, 3, 2, 100.00, 200.00),
(1, 6, 7, 100.00, 700.00),
(2, 2, 2, 100.00, 200.00),
(2, 8, 1, 120.00, 120.00),
(3, 1, 5, 100.00, 500.00),
(3, 4, 3, 100.00, 300.00),
(3, 9, 2, 80.00, 160.00),
(4, 6, 4, 100.00, 400.00),
(5, 1, 8, 100.00, 800.00),
(5, 11, 3, 90.00, 270.00),
(6, 9, 5, 80.00, 400.00),
(7, 12, 2, 110.00, 220.00),
(7, 13, 1, 125.00, 125.00),
(8, 1, 10, 100.00, 1000.00);

-- Insert Territories
INSERT INTO territories (name, sales_amount, growth_percentage, order_count) VALUES
('उत्तर प्रदेश', 8500000.00, 12.5, 342),
('बिहार', 6200000.00, 18.3, 287),
('राजस्थान', 5800000.00, 7.9, 234),
('मध्य प्रदेश', 4900000.00, 15.1, 198),
('दिल्ली', 4100000.00, 22.4, 167),
('पंजाब', 3200000.00, 9.8, 145),
('हरियाणा', 2800000.00, 13.2, 123),
('झारखंड', 2400000.00, 16.7, 98);

-- Insert Social Media Metrics (Recent data)
INSERT INTO social_media_metrics (platform, metric_name, metric_value, metric_date) VALUES
-- Facebook metrics
('facebook', 'followers', 15840, '2024-01-15'),
('facebook', 'followers_growth', 835, '2024-01-15'),
('facebook', 'views', 125000, '2024-01-15'),
('facebook', 'posts', 47, '2024-01-15'),
('facebook', 'engagement_rate', 42, '2024-01-15'), -- stored as 4.2 * 10

-- Instagram metrics  
('instagram', 'followers', 12350, '2024-01-15'),
('instagram', 'followers_growth', 450, '2024-01-15'),
('instagram', 'views', 89000, '2024-01-15'),
('instagram', 'posts', 124, '2024-01-15'),
('instagram', 'engagement_rate', 68, '2024-01-15'), -- stored as 6.8 * 10

-- YouTube metrics
('youtube', 'subscribers', 8970, '2024-01-15'),
('youtube', 'subscribers_growth', 290, '2024-01-15'),
('youtube', 'views', 245000, '2024-01-15'),
('youtube', 'videos', 34, '2024-01-15'),
('youtube', 'avg_watch_time', 45, '2024-01-15'), -- stored as 4.5 * 10 (minutes)

-- Twitter metrics
('twitter', 'followers', 6780, '2024-01-15'),
('twitter', 'followers_growth', 156, '2024-01-15'),
('twitter', 'impressions', 67000, '2024-01-15'),
('twitter', 'tweets', 89, '2024-01-15'),
('twitter', 'engagement_rate', 32, '2024-01-15'); -- stored as 3.2 * 10

-- Generate additional historical sales data for charts
INSERT INTO orders (order_number, customer_id, total_amount, status, payment_status, order_type, created_at) 
SELECT 
    'ORD-2023-' || LPAD(generate_series(1, 1500)::text, 4, '0'),
    (RANDOM() * 8 + 1)::INTEGER,
    (RANDOM() * 5000 + 500)::DECIMAL(10,2),
    CASE WHEN RANDOM() < 0.8 THEN 'delivered' 
         WHEN RANDOM() < 0.9 THEN 'shipped' 
         ELSE 'processing' END,
    'paid',
    CASE WHEN RANDOM() < 0.6 THEN 'online' ELSE 'offline' END,
    '2023-01-01'::timestamp + (RANDOM() * interval '365 days');

-- Update customer totals based on orders
UPDATE customers SET 
    total_spent = (
        SELECT COALESCE(SUM(total_amount), 0) 
        FROM orders 
        WHERE customer_id = customers.id
    ),
    total_orders = (
        SELECT COUNT(*) 
        FROM orders 
        WHERE customer_id = customers.id
    );