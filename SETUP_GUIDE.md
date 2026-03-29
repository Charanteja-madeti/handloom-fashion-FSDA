# Admin Dashboard Product Management Setup Guide

## Overview
The admin dashboard is now fully connected to the backend. Admins can add products through the admin dashboard form, and these products are saved to the database and visible to all users.

## What Has Been Implemented

### 1. Backend Changes (`backend/server.js`)
- **New Database Table**: Created a `products` table with fields:
  - `id`: Auto-increment primary key
  - `name`: Product name (required)
  - `description`: Product description
  - `price`: Product price in rupees (required)
  - `category`: Product category
  - `image`: Product image URL/base64
  - `created_at` & `updated_at`: Timestamps

- **New API Endpoints**:
  - `GET /api/products` - Fetch all products
  - `GET /api/products/:id` - Fetch single product by ID
  - `POST /api/products` - Add new product (requires authentication token)
  - `PUT /api/products/:id` - Update product (requires authentication token)
  - `DELETE /api/products/:id` - Delete product (requires authentication token)

### 2. Frontend Changes

#### Admin Dashboard (`front/src/pages/adminDashboard.jsx`)
- Added a form to add new products with fields:
  - Product Name (required)
  - Description
  - Price in ₹ (required)
  - Category
  - Image URL
- Real-time product count updates
- Success/error messages after submission
- Requires user to be logged in (token must be in localStorage)

#### Products Page (`front/src/pages/products.jsx`)
- Changed from using static `productsData.js` to fetching from backend API
- Displays real-time products from the database
- Maintains search and sorting functionality
- Shows loading state while fetching products

#### Product Details Page (`front/src/pages/productdetails.jsx`)
- Fetches individual product details from backend API
- Dynamic image display

### 3. Environment Configuration
- Updated `front/.env.example` with API base URL
- Updated `front/.env` with development API URL
- All API calls now use `VITE_API_BASE_URL` environment variable

## How to Use

### Step 1: Start the Backend Server
```bash
cd backend
npm install  # if not already installed
node server.js
```
Backend will run on `http://localhost:5000`

### Step 2: Make Sure Frontend Env is Configured
The frontend `.env` file should have:
```
VITE_API_BASE_URL=http://localhost:5000
```

### Step 3: Start the Frontend Development Server
```bash
cd front
npm install  # if not already installed
npm run dev
```
Frontend will run on `http://localhost:5173` (or another port)

### Step 4: Test the Functionality

1. **Login/Create Account**
   - Create a new account or log in
   - Your authentication token will be stored in localStorage

2. **Go to Admin Dashboard**
   - Navigate to the admin dashboard
   - You should see the "Add New Product" form

3. **Add a Product**
   - Fill in the product details:
     - Name (required): e.g., "Blue Cotton Saree"
     - Description: e.g., "Soft and comfortable cotton saree"
     - Price (required): e.g., "1499"
     - Category: e.g., "Clothing"
     - Image URL: Paste a valid image URL or a data:image/... string
   - Click "Add Product"
   - You should see a success message
   - The product count should update

4. **View Products**
   - Go to the Products page
   - You should see your newly added product in the list
   - The product is searchable and can be filtered by price
   - Click "View Product" to see product details

5. **Verify Multi-user Access**
   - Open the website in incognito/private mode or another browser
   - Without logging in, you should see all products added by admins
   - Products are now visible to all users immediately after being added

## Important Notes

### Authentication
- Only logged-in users (with valid JWT tokens) can add products
- The token is stored in localStorage under the key `token`
- If you see "Please login first to add products" message, make sure you're logged in

### Image URLs
You can use:
- Direct image URLs: `https://example.com/image.jpg`
- Data URLs: `data:image/png;base64,...`
- Relative URLs if hosted locally

### Database
- The database is automatically created on first server run
- The `products` table is created if it doesn't exist
- Products are persisted in the database and survive server restarts

### Error Handling
- If backend is not running, you'll see "Error adding product. Please try again."
- If the frontend can't reach the backend, check:
  1. Backend is running on the correct port
  2. `VITE_API_BASE_URL` is set correctly in `.env`
  3. CORS is properly configured on the backend
  4. No firewall/network issues blocking the connection

## Production Deployment

For production:

1. **Update API URLs in `.env.production`**:
   ```
   VITE_API_BASE_URL=https://your-production-api-url.com
   ```

2. **Update Backend CORS Settings**:
   In `backend/server.js`, the `ALLOWED_ORIGINS` environment variable should include your production frontend URL:
   ```
   ALLOWED_ORIGINS=https://your-frontend-domain.com
   ```

3. **Database Configuration**:
   Make sure production database credentials are set in the backend `.env`:
   ```
   DB_HOST=your-production-host
   DB_USER=your-db-user
   DB_PASSWORD=your-secure-password
   DB_NAME=your-db-name
   ```

## Troubleshooting

**Q: Products don't show up on the products page**
- Check if backend API is accessible: Open `http://localhost:5000/api/products` in browser
- Check console for CORS errors
- Ensure database is properly configured

**Q: Add Product form shows "Please login first"**
- Make sure you've logged in first
- Check if token is saved in localStorage (use browser DevTools > Application > Local Storage)

**Q: Images not displaying**
- Check if the image URL is valid and accessible
- For local development, use complete valid image URLs
- For base64 images, ensure they start with `data:image/`

**Q: Getting CORS errors**
- Update `ALLOWED_ORIGINS` in backend `.env` to include your frontend URL
- For development: `ALLOWED_ORIGINS=http://localhost:5173`

## Database Tables

### Products Table Schema
```sql
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100),
  image LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
```

## Next Steps

Optional enhancements you could add:
1. Product image upload functionality
2. Edit product functionality (admin)
3. Delete product functionality (admin)
4. Product inventory tracking
5. Product reviews and ratings
6. Admin product management dashboard with edit/delete options
