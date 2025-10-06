# 🚀 Supplier Authentication - Quick Start Guide

## What We've Built

A complete supplier authentication system that allows suppliers to:

- ✅ Login with their email and default password `supplier123`
- ✅ Access their own supplier portal
- ✅ Change their password
- ✅ View their profile and orders

---

## 🏁 Getting Started (3 Steps)

### Step 1: Run the Database Migration

```bash
cd backend
npx knex migrate:latest
```

This adds authentication fields to the suppliers table.

### Step 2: Set Passwords for Existing Suppliers

```bash
cd backend
node scripts/set_supplier_passwords.js
```

This sets the default password `supplier123` for all existing suppliers.

### Step 3: Test the System (Optional)

```bash
cd backend
node test_supplier_auth.js
```

Update the email in the test file to match one of your suppliers.

---

## 🔐 How It Works

### For Admins (Creating Suppliers)

When you create a new supplier through the existing UI:

1. System automatically generates password `supplier123`
2. Supplier gets `is_active: true` status
3. Admin receives login credentials in the response

### For Suppliers (Logging In)

1. Go to supplier login page (to be created in frontend)
2. Enter their registered email
3. Enter password `supplier123`
4. System logs them in with JWT token

---

## 📁 Files Created/Modified

### ✅ Backend (Completed)

#### New Files:

- `backend/migrations/20250116120000_add_auth_fields_to_suppliers.js` - Database migration
- `backend/routes/supplierAuth.js` - Authentication routes
- `backend/scripts/set_supplier_passwords.js` - Password setup script
- `backend/test_supplier_auth.js` - Test script

#### Modified Files:

- `backend/models/Supplier.js` - Added auth methods
- `backend/routes/suppliers.js` - Auto-create passwords
- `backend/server.js` - Registered auth routes

### 🔄 Frontend (Next Steps)

#### To Be Created:

- `frontend/src/views/supplier/SupplierLogin.vue` - Login page
- `frontend/src/views/supplier/SupplierDashboard.vue` - Dashboard
- `frontend/src/views/supplier/SupplierProfile.vue` - Profile page
- `frontend/src/layouts/SupplierLayout.vue` - Supplier layout
- `frontend/src/stores/supplierAuthStore.js` - Auth store
- Router updates for supplier routes

---

## 🔌 API Endpoints Available

| Endpoint                              | Method | Description      |
| ------------------------------------- | ------ | ---------------- |
| `/api/supplier-auth/login`            | POST   | Login supplier   |
| `/api/supplier-auth/validate-session` | POST   | Validate session |
| `/api/supplier-auth/change-password`  | POST   | Change password  |
| `/api/supplier-auth/profile`          | GET    | Get profile      |

---

## 🧪 Testing Example

### Login Request

```javascript
POST http://localhost:5000/api/supplier-auth/login
Content-Type: application/json

{
  "email": "supplier@example.com",
  "password": "supplier123"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Login successful",
  "code": "LOGIN_SUCCESS",
  "data": {
    "supplier": {
      "id": 1,
      "name": "ABC Supplies Inc.",
      "email": "supplier@example.com",
      "contact_person": "John Doe",
      "phone": "+63 123 456 7890",
      "address": "123 Main St, Manila",
      "category": "Food & Beverage",
      "status": "Active"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

## 🎯 Current Status

### ✅ Completed (Backend)

- [x] Database migration for auth fields
- [x] Supplier model with authentication methods
- [x] Login/logout/session validation endpoints
- [x] Password management (set, change, verify)
- [x] Auto-password generation on supplier creation
- [x] Default password script for existing suppliers
- [x] JWT token generation
- [x] Security validations (email, password, active status)

### 📋 Next Steps (Frontend)

- [ ] Create supplier login page
- [ ] Create supplier dashboard layout
- [ ] Create supplier profile page
- [ ] Create supplier auth store (Pinia)
- [ ] Add supplier routes to router
- [ ] Implement protected routes for suppliers
- [ ] Add logout functionality
- [ ] Create password change UI

---

## 📊 Database Changes

### New Columns in `suppliers` table:

```sql
password         VARCHAR(255)  -- Hashed password
is_active        BOOLEAN       -- Active status (default: true)
last_login_at    TIMESTAMP     -- Last login tracking
notes            TEXT          -- Additional notes
```

### Indexes Added:

- `email` - For faster login lookups
- `is_active` - For active status filtering

---

## 🔒 Security Features

1. **Password Hashing:** bcrypt with 10 salt rounds
2. **JWT Tokens:** Include `type: "supplier"` identifier
3. **Active Status:** Only active suppliers can login
4. **Email Validation:** Email format validation
5. **Session Tracking:** Last login timestamp
6. **Status Check:** Must have `status: "Active"`

---

## ⚡ Quick Commands

```bash
# Run migration
npx knex migrate:latest

# Set passwords for existing suppliers
node scripts/set_supplier_passwords.js

# Test the auth system
node test_supplier_auth.js

# Rollback migration (if needed)
npx knex migrate:rollback
```

---

## 💡 Tips

1. **Default Password:** All suppliers start with `supplier123`
2. **Email Required:** Suppliers must have email to login
3. **Change Password:** Suppliers should change password on first login
4. **Testing:** Use the test script to verify everything works
5. **Token Storage:** Frontend should store JWT in localStorage/sessionStorage

---

## 📞 Common Issues & Solutions

### Issue: Login fails with "Invalid credentials"

**Solution:**

- Check if supplier email exists in database
- Verify supplier has `is_active: true`
- Verify supplier has `status: "Active"`
- Check if password was set (run password script)

### Issue: "Account not set up for login"

**Solution:** Run `node scripts/set_supplier_passwords.js`

### Issue: Migration fails

**Solution:**

- Check database connection
- Ensure no conflicting column names
- Check if migration already ran: `npx knex migrate:status`

---

## 🎨 Frontend Implementation Guide

See `SUPPLIER_AUTHENTICATION_SETUP.md` for detailed frontend implementation steps including:

- Component structure
- Store setup
- Router configuration
- UI/UX considerations
- Complete code examples

---

## 📝 Notes

- This system is separate from employee authentication
- Suppliers get their own portal with limited access
- JWT tokens are marked with `type: "supplier"`
- Future: Add email notifications for password resets
- Future: Add 2FA for enhanced security

---

**Need Help?** Check `SUPPLIER_AUTHENTICATION_SETUP.md` for detailed documentation.
