-- Database Schema for Raj Kamal Publishing
-- Drop existing tables if they exist
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS authors;
DROP TABLE IF EXISTS social_media_metrics;
DROP TABLE IF EXISTS territories;

-- Authors table
CREATE TABLE authors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_hindi VARCHAR(255),
  birth_date DATE,
  death_date DATE,
  biography TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_hindi VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Books table
CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  title_hindi VARCHAR(255),
  author_id INTEGER REFERENCES authors(id),
  category_id INTEGER REFERENCES categories(id),
  isbn VARCHAR(20) UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 0,
  max_stock INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock', 'discontinued')),
  publication_date DATE,
  pages INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  customer_type VARCHAR(20) DEFAULT 'regular' CHECK (customer_type IN ('premium', 'regular', 'occasional')),
  total_spent DECIMAL(12,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  total_amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  order_type VARCHAR(20) DEFAULT 'online' CHECK (order_type IN ('online', 'offline')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  book_id INTEGER REFERENCES books(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Social media metrics table
CREATE TABLE social_media_metrics (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value BIGINT NOT NULL,
  metric_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Territories table
CREATE TABLE territories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sales_amount DECIMAL(12,2) DEFAULT 0,
  growth_percentage DECIMAL(5,2) DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_books_author_id ON books(author_id);
CREATE INDEX idx_books_category_id ON books(category_id);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_book_id ON order_items(book_id);
CREATE INDEX idx_social_media_platform_date ON social_media_metrics(platform, metric_date);