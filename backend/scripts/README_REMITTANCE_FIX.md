# Remittance Discrepancy Fix

This guide helps you identify and fix the discrepancy between total sales (₱19,290.01) and remitted amount (₱10,740.00).

## Problem

- **Total Sales**: ₱19,290.01 (all completed POS orders)
- **Remitted Amount**: ₱10,740.00 (orders linked to approved remittances)
- **Difference**: ₱8,550.01 (unremitted sales)

## Solution Scripts

### 1. Analyze Unremitted Sales

```bash
# Analyze all branches for current month
node backend/scripts/analyze_unremitted_sales.js

# Analyze specific branch
node backend/scripts/analyze_unremitted_sales.js 1

# Analyze specific date range
node backend/scripts/analyze_unremitted_sales.js 1 2025-01-01 2025-01-31
```

### 2. Auto-Remit Missing Sales

```bash
# DRY RUN - See what would be remitted (safe)
node backend/scripts/auto_remit_missing_sales.js

# LIVE RUN - Actually create remittances
node backend/scripts/auto_remit_missing_sales.js --live

# Approve all pending remittances
node backend/scripts/auto_remit_missing_sales.js --live --approve

# Process specific branch
node backend/scripts/auto_remit_missing_sales.js --branch 1 --live
```

## What the Scripts Do

### Analysis Script (`analyze_unremitted_sales.js`)

- Shows total sales vs remitted sales for each branch
- Identifies unremitted orders
- Calculates the exact discrepancy
- Lists recent unremitted orders

### Auto-Remit Script (`auto_remit_missing_sales.js`)

- Creates new remittances for unremitted sales
- Links unremitted orders to new remittances
- Can approve pending remittances
- Supports dry-run mode for safety

## Step-by-Step Fix Process

1. **First, analyze the current state:**

   ```bash
   node backend/scripts/analyze_unremitted_sales.js
   ```

2. **Run a dry-run to see what would be remitted:**

   ```bash
   node backend/scripts/auto_remit_missing_sales.js
   ```

3. **If the dry-run looks correct, run it live:**

   ```bash
   node backend/scripts/auto_remit_missing_sales.js --live
   ```

4. **Approve any pending remittances:**
   ```bash
   node backend/scripts/auto_remit_missing_sales.js --live --approve
   ```

## Expected Results

After running the scripts, you should see:

- Total sales and remitted amounts match
- All completed orders are linked to remittances
- The ₱8,550.01 discrepancy is resolved

## Safety Features

- **Dry-run mode**: Shows what would happen without making changes
- **Transaction safety**: All operations are wrapped in database transactions
- **Detailed logging**: Shows exactly what's being processed
- **Rollback protection**: Failed operations are automatically rolled back

## Notes

- The scripts use the system user (ID: 1) for remittance creation
- All remittances are created with "month" period type
- Unremitted orders are linked to new remittances automatically
- The process is safe and can be run multiple times
