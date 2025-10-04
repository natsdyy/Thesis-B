# POS Orders Generator for September 2025

This script generates sample POS sales orders for branches 6 and 7 for the month of September 2025.

## 📋 What This Script Does

- Generates **150 total orders** (75 orders per branch)
- Creates realistic order data for **September 2025**
- Includes both **completed** and **void** orders
- Uses actual menu items from your database
- Uses specific employees for each branch (Cedric Kyle Belisario for Branch 6, John Marco Paja & Nathaniel Vasquez for Branch 7)
- Generates proper timestamps and order lifecycle
- Creates associated order items for each order

## 🚀 How to Run

### 1. Test First (Recommended)

```bash
node test_pos_script.js
```

This will check:

- Database connection
- Required tables exist
- Branches 6 and 7 exist
- Employees for these branches
- Existing orders for September 2025

### 2. Generate Orders

```bash
node generate_september_pos_orders.js
```

## 📊 Generated Data Structure

Each order includes:

### Order Details

- **Order Number**: Auto-generated (e.g., #10262767)
- **Branch ID**: 6 or 7
- **Cashier**: John Marco Paja (Branch 7)
- **Manager**: Cedric Kyle Belisario (Branch 6), Nathaniel Vasquez (Branch 7)
- **Order Type**: "Dine In" or "Take Out"
- **Status**: 75% "completed", 25% "void"
- **Timestamps**: Created → Processed → Completed/Voided

### Order Items

- **Menu Items Only**: Longsilog (₱100), Tapsi (₱100), Bacsilog (₱195), Pork Steak (₱250), Beef and mushroom (₱390), Bihon Guisado (₱155)
- **Quantities**: 1-5 items per order

### Financial Data

- **Subtotal**: Sum of item prices × quantities
- **Tax**: ₱0.00 (matches your data)
- **Total Amount**: Subtotal + Tax
- **Amount Paid**: Rounded up to nearest ₱50
- **Change**: Amount Paid - Total Amount

## 📅 Date Range

All orders are generated with dates in **September 2025**:

- Random days (1-30)
- Random times (7 AM - 9 PM)
- Realistic order processing times

## 🔧 Requirements

- Node.js environment
- Database connection to your POS system
- Access to the following tables:
  - `pos_sales_orders`
  - `pos_order_items`
  - `branches`
  - `employees`
  - `menu_items`

## ⚠️ Important Notes

1. **Existing Data**: The script will add to existing September 2024 orders, not replace them
2. **Employee Fallback**: If no employees found for branches 6 and 7, uses employee ID 31
3. **Menu Items**: Uses predefined menu items based on your sample data
4. **Void Orders**: 25% of orders will be voided with realistic reasons

## 📈 Expected Output

After running, you should see:

```
🎉 Successfully generated 150 POS orders for September 2025!
📈 Summary:
   - Branch 6: 75 orders
   - Branch 7: 75 orders
   - Total: 150 orders

📊 Generated Data Statistics:
   - Total Orders: 150
   - Completed Orders: ~113
   - Voided Orders: ~37
   - Total Sales: ₱XX,XXX
```

## 🛠️ Troubleshooting

### Database Connection Issues

- Ensure your database is running
- Check database credentials in `backend/config/database.js`

### Missing Tables

- Run database migrations if tables don't exist
- Check table names match your schema

### No Employees Found

- The script will use employee ID 31 as fallback
- Ensure you have at least one employee in the system

### Permission Issues

- Ensure your database user has INSERT permissions
- Check foreign key constraints

## 🔄 Running Multiple Times

- The script can be run multiple times
- Each run generates new orders with unique order numbers
- Existing data is preserved

## 📝 Customization

To modify the script:

1. **Change order count**: Modify `totalOrders` variable
2. **Add more menu items**: Update `MENU_ITEMS` array (only menu items, no SCM items)
3. **Change date range**: Modify `getRandomSeptemberDate()` function
4. **Adjust percentages**: Change `STATUSES` array ratios

## 🎯 Use Cases

This script is perfect for:

- **Testing**: Generate sample data for development
- **Demo**: Show realistic sales data to stakeholders
- **Training**: Provide sample data for user training
- **Analytics**: Test reporting and dashboard functionality

---

**Happy generating! 🚀**
