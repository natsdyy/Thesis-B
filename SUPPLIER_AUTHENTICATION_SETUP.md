# Supplier Authentication System

## Overview

This document outlines the supplier authentication system that allows suppliers to have their own login portal with email-based authentication and a default password of `supplier123`.

## ✅ Backend Implementation (COMPLETED)

### 1. Database Migration

**File:** `backend/migrations/20250116120000_add_auth_fields_to_suppliers.js`

Added the following columns to the `suppliers` table:

- `password` (string, nullable) - Hashed password for supplier login
- `is_active` (boolean, default true) - Whether supplier account is active
- `last_login_at` (timestamp, nullable) - Last login timestamp
- `notes` (text, nullable) - Additional notes about supplier

**To run the migration:**

```bash
cd backend
npx knex migrate:latest
```

### 2. Supplier Model Updates

**File:** `backend/models/Supplier.js`

Added authentication methods:

- `hashPassword(password)` - Hash a password using bcrypt
- `verifyPassword(plainPassword, hashedPassword)` - Verify password
- `isValidEmail(email)` - Validate email format
- `findByEmail(email)` - Find supplier by email for authentication
- `authenticate(email, password)` - Authenticate supplier login
- `setDefaultPassword(supplierId, password)` - Set default password
- `updatePassword(supplierId, newPassword)` - Update supplier password
- `createWithAuth(supplierData, password)` - Create supplier with authentication

### 3. Authentication Routes

**File:** `backend/routes/supplierAuth.js`

Implemented the following endpoints:

#### Login

- **POST** `/api/supplier-auth/login`
- Body: `{ email, password }`
- Returns JWT token and supplier info

#### Validate Session

- **POST** `/api/supplier-auth/validate-session`
- Body: `{ supplier_id }`
- Validates supplier session and returns supplier info

#### Change Password

- **POST** `/api/supplier-auth/change-password`
- Body: `{ supplier_id, old_password, new_password }`
- Allows supplier to change their password

#### Get Profile

- **GET** `/api/supplier-auth/profile?supplier_id={id}`
- Returns supplier profile information

### 4. Server Configuration

**File:** `backend/server.js`

Added supplier auth routes to the server:

```javascript
const supplierAuthRoutes = require("./routes/supplierAuth");
app.use("/api/supplier-auth", supplierAuthRoutes);
```

### 5. Auto-Password Setup Script

**File:** `backend/scripts/set_supplier_passwords.js`

Script to set default password `supplier123` for all existing suppliers.

**To run:**

```bash
cd backend
node scripts/set_supplier_passwords.js
```

### 6. Updated Supplier Creation

**File:** `backend/routes/suppliers.js`

The supplier creation endpoint now:

- Automatically creates a password (default: `supplier123`)
- Returns login credentials information to admin
- Sets supplier as active with authentication enabled

## 🔄 Setup Instructions

### Step 1: Run Database Migration

```bash
cd backend
npx knex migrate:latest
```

### Step 2: Set Passwords for Existing Suppliers

```bash
cd backend
node scripts/set_supplier_passwords.js
```

This will:

- Find all suppliers without passwords
- Set default password `supplier123`
- Display summary of changes

### Step 3: Test Supplier Login

Use the following endpoint to test:

```bash
POST http://localhost:5000/api/supplier-auth/login
Content-Type: application/json

{
  "email": "supplier@example.com",
  "password": "supplier123"
}
```

## 📋 Supplier Credentials

### Default Password

All suppliers get the default password: `supplier123`

### Login Format

- **Email:** Supplier's registered email
- **Password:** `supplier123` (should be changed on first login)

## 🔐 Security Features

1. **Password Hashing:** All passwords are hashed using bcrypt (10 salt rounds)
2. **JWT Authentication:** Supplier tokens include `type: "supplier"` to distinguish from employee tokens
3. **Active Status Check:** Only active suppliers with status "Active" can login
4. **Email Validation:** Email format is validated before authentication
5. **Last Login Tracking:** System tracks last login timestamp

## 📊 Database Schema

### Suppliers Table (Updated)

```sql
CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Active',
  notes TEXT,
  password VARCHAR(255),           -- NEW: Hashed password
  is_active BOOLEAN DEFAULT TRUE,  -- NEW: Account active status
  last_login_at TIMESTAMP,         -- NEW: Last login tracking
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

## 🎯 Next Steps (Frontend)

### TODO: Frontend Implementation

#### 1. Create Supplier Login Page

**Location:** `frontend/src/views/supplier/SupplierLogin.vue`

Features needed:

- Email and password input fields
- Login form validation
- Error handling
- JWT token storage
- Redirect to supplier dashboard after login

#### 2. Create Supplier Dashboard Layout

**Location:** `frontend/src/layouts/SupplierLayout.vue`

Components needed:

- Supplier navigation menu
- Header with supplier info
- Logout functionality
- Responsive design

#### 3. Create Supplier Dashboard

**Location:** `frontend/src/views/supplier/SupplierDashboard.vue`

Features:

- View purchase orders
- View order history
- View statistics
- Quick actions

#### 4. Create Supplier Profile Page

**Location:** `frontend/src/views/supplier/SupplierProfile.vue`

Features:

- View supplier information
- Edit profile
- Change password
- View account settings

#### 5. Create Supplier Store

**Location:** `frontend/src/stores/supplierAuthStore.js`

State management for:

- Supplier authentication
- Session validation
- Profile management
- Logout handling

#### 6. Update Router

**Location:** `frontend/src/router/index.js`

Add routes:

```javascript
{
  path: '/supplier',
  children: [
    { path: 'login', component: SupplierLogin },
    { path: 'dashboard', component: SupplierDashboard, meta: { requiresAuth: true } },
    { path: 'profile', component: SupplierProfile, meta: { requiresAuth: true } },
    { path: 'orders', component: SupplierOrders, meta: { requiresAuth: true } }
  ]
}
```

## 🔍 Testing Checklist

### Backend Tests

- [ ] Migration runs successfully
- [ ] Existing suppliers get passwords
- [ ] New suppliers get auto-generated passwords
- [ ] Login endpoint works correctly
- [ ] Invalid credentials are rejected
- [ ] JWT token is generated properly
- [ ] Password change functionality works
- [ ] Session validation works

### Frontend Tests (After Implementation)

- [ ] Login page displays correctly
- [ ] Login form validation works
- [ ] Successful login redirects to dashboard
- [ ] Failed login shows error message
- [ ] JWT token is stored properly
- [ ] Protected routes require authentication
- [ ] Logout clears session
- [ ] Profile page displays correctly
- [ ] Password change works

## 📝 API Endpoints Summary

| Method | Endpoint                              | Description      | Auth Required |
| ------ | ------------------------------------- | ---------------- | ------------- |
| POST   | `/api/supplier-auth/login`            | Supplier login   | No            |
| POST   | `/api/supplier-auth/validate-session` | Validate session | Yes           |
| POST   | `/api/supplier-auth/change-password`  | Change password  | Yes           |
| GET    | `/api/supplier-auth/profile`          | Get profile      | Yes           |

## 🚀 Usage Examples

### Login Request

```javascript
const response = await axios.post('/api/supplier-auth/login', {
  email: 'supplier@example.com',
  password: 'supplier123'
});

// Response
{
  success: true,
  message: "Login successful",
  code: "LOGIN_SUCCESS",
  data: {
    supplier: { /* supplier info */ },
    token: "jwt-token-here"
  }
}
```

### Change Password

```javascript
const response = await axios.post("/api/supplier-auth/change-password", {
  supplier_id: 1,
  old_password: "supplier123",
  new_password: "newSecurePassword123",
});
```

## ⚠️ Important Notes

1. **Default Password:** All suppliers start with `supplier123` - they should change it on first login
2. **Email Required:** Suppliers must have a valid email to use the authentication system
3. **Token Type:** Supplier JWT tokens have `type: "supplier"` to distinguish from employee tokens
4. **Active Status:** Only suppliers with `is_active: true` and `status: "Active"` can login
5. **Security:** Always use HTTPS in production for password transmission

## 📧 Email Notifications (Future Enhancement)

Consider implementing:

- Welcome email with login credentials when supplier is created
- Password reset functionality via email
- Login notification emails
- Password change confirmation emails

## 🔄 Migration Rollback

If needed, rollback the migration:

```bash
cd backend
npx knex migrate:rollback
```

This will remove the authentication columns from the suppliers table.
