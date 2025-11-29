/**
 * Seed POS Sales Orders and Remittances for July-September 2025
 * For Branches 6 and 7 with approved remittances
 */

const { db } = require("../config/database");

// Menu items with their IDs and prices (based on existing data)
const MENU_ITEMS = [
  { id: 6, name: "Longsilog", price: 100.0 },
  { id: 11, name: "Tapsi", price: 100.0 },
  { id: 12, name: "Bacsilog", price: 195.0 },
  { id: 13, name: "Pork Steak", price: 250.0 },
  { id: 14, name: "Beef and mushroom", price: 390.0 },
  { id: 15, name: "Bihon Guisado", price: 155.0 },
];

// Non-menu items (beverages, etc.)
const NON_MENU_ITEMS = [
  { name: "Coke in Can", price: 45.0 },
  { name: "Coke Mismo", price: 35.0 },
  { name: "Mineral Water / bottles", price: 20.0 },
];

// Order types
const ORDER_TYPES = ["Dine In", "Take Out", "Delivery"];

// Branch and employee data
const BRANCHES = [6, 7];
const CASHIERS = [1, 13, 18]; // Existing cashier IDs
const MANAGERS = [18]; // Existing manager IDs

/**
 * Generate a random order number
 */
function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  return `#${random.toString().padStart(8, "0")}`;
}

/**
 * Generate random date within a given month
 */
function generateRandomDate(year, month, minHour = 6, maxHour = 22) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Math.floor(Math.random() * daysInMonth) + 1;
  const hour = Math.floor(Math.random() * (maxHour - minHour)) + minHour;
  const minute = Math.floor(Math.random() * 60);

  return new Date(year, month - 1, day, hour, minute);
}

/**
 * Generate random order items
 */
function generateOrderItems() {
  const numItems = Math.floor(Math.random() * 4) + 1; // 1-4 items
  const items = [];

  for (let i = 0; i < numItems; i++) {
    const isMenuItem = Math.random() > 0.3; // 70% chance for menu item

    if (isMenuItem && MENU_ITEMS.length > 0) {
      const menuItem =
        MENU_ITEMS[Math.floor(Math.random() * MENU_ITEMS.length)];
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity

      items.push({
        menu_item_id: menuItem.id,
        item_name: menuItem.name,
        menu_item_name: menuItem.name,
        quantity,
        unit_price: menuItem.price,
        total_price: menuItem.price * quantity,
      });
    } else if (NON_MENU_ITEMS.length > 0) {
      const nonMenuItem =
        NON_MENU_ITEMS[Math.floor(Math.random() * NON_MENU_ITEMS.length)];
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity

      items.push({
        menu_item_id: null,
        item_name: nonMenuItem.name,
        menu_item_name: null,
        quantity,
        unit_price: nonMenuItem.price,
        total_price: nonMenuItem.price * quantity,
      });
    }
  }

  return items;
}

/**
 * Calculate order totals
 */
function calculateTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const taxAmount = 0; // No tax for simplicity
  const totalAmount = subtotal + taxAmount;

  // Generate amount paid (usually exact or with small change)
  const amountPaid =
    Math.random() > 0.3
      ? totalAmount
      : Math.ceil(totalAmount / 100) * 100 + Math.floor(Math.random() * 100);

  const changeAmount = amountPaid - totalAmount;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    amountPaid: parseFloat(amountPaid.toFixed(2)),
    changeAmount: parseFloat(changeAmount.toFixed(2)),
  };
}

/**
 * Create POS order
 */
async function createPOSOrder(branchId, orderDate) {
  const orderNumber = generateOrderNumber();
  const items = generateOrderItems();
  const totals = calculateTotals(items);

  const cashierId = CASHIERS[Math.floor(Math.random() * CASHIERS.length)];
  const managerId = MANAGERS[Math.floor(Math.random() * MANAGERS.length)];
  const orderType = ORDER_TYPES[Math.floor(Math.random() * ORDER_TYPES.length)];

  // Create timestamps
  const createdAt = new Date(orderDate);
  const processedAt = new Date(createdAt.getTime() + Math.random() * 300000); // 0-5 minutes later
  const completedAt = new Date(processedAt.getTime() + Math.random() * 600000); // 0-10 minutes later

  // Create the order
  const [orderResult] = await db("pos_sales_orders")
    .insert({
      order_number: orderNumber,
      branch_id: branchId,
      cashier_id: cashierId,
      manager_id: managerId,
      order_type: orderType,
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      total_amount: totals.totalAmount,
      amount_paid: totals.amountPaid,
      change_amount: totals.changeAmount,
      status: "completed",
      processed_at: processedAt,
      completed_at: completedAt,
      created_at: createdAt,
      updated_at: completedAt,
    })
    .returning("id");

  const orderId = orderResult.id;

  // Create order items
  const orderItems = items.map((item) => ({
    order_id: orderId,
    menu_item_id: item.menu_item_id,
    item_name: item.item_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
  }));

  await db("pos_order_items").insert(orderItems);

  return {
    orderId,
    branchId,
    totalAmount: totals.totalAmount,
    createdAt,
    completedAt,
  };
}

/**
 * Create remittance for a given month
 */
async function createRemittance(branchId, year, month) {
  const dateFrom = new Date(year, month - 1, 1);
  const dateTo = new Date(year, month, 0, 23, 59, 59); // Last day of month

  // Get all orders for this branch and month
  const orders = await db("pos_sales_orders")
    .where("branch_id", branchId)
    .whereBetween("created_at", [dateFrom, dateTo])
    .where("status", "completed");

  if (orders.length === 0) {
    console.log(
      `No orders found for branch ${branchId} in ${year}-${month.toString().padStart(2, "0")}`
    );
    return null;
  }

  const grossSales = orders.reduce(
    (sum, order) => sum + parseFloat(order.total_amount),
    0
  );
  const netSales = grossSales; // No refunds for simplicity
  const refundedAmount = 0;
  const disposed = 0;
  const remittedAmount = grossSales;

  const submittedBy = CASHIERS[Math.floor(Math.random() * CASHIERS.length)];
  const approvedBy = MANAGERS[Math.floor(Math.random() * MANAGERS.length)];
  const approvedAt = new Date(dateTo.getTime() + Math.random() * 86400000); // Within 24 hours of month end

  // Create remittance
  const [remittanceResult] = await db("branch_remittances")
    .insert({
      branch_id: branchId,
      submitted_by: submittedBy,
      period_type: "month",
      date_from: dateFrom,
      date_to: dateTo,
      gross_sales: grossSales,
      net_sales: netSales,
      refunded_amount: refundedAmount,
      disposed: disposed,
      remitted_amount: remittedAmount,
      status: "approved",
      approved_by: approvedBy,
      approved_at: approvedAt,
      created_at: new Date(),
      updated_at: approvedAt,
    })
    .returning("id");

  const remittanceId = remittanceResult.id;

  // Update all orders to link them to this remittance
  await db("pos_sales_orders")
    .where("branch_id", branchId)
    .whereBetween("created_at", [dateFrom, dateTo])
    .where("status", "completed")
    .update({
      remittance_id: remittanceId,
      remitted_at: approvedAt,
    });

  return {
    remittanceId,
    branchId,
    grossSales,
    ordersCount: orders.length,
    month: `${year}-${month.toString().padStart(2, "0")}`,
  };
}

/**
 * Main seeding function
 */
async function seedPOSOrdersAndRemittances() {
  try {
    console.log(
      "🚀 Starting POS Orders and Remittances seeding for July-September 2025..."
    );
    console.log(
      "📊 Target: Branches 6 & 7, Months: July, August, September 2025"
    );

    const year = 2025;
    const months = [7, 8, 9]; // July, August, September
    const ordersPerBranchPerDay = 8; // Average orders per day per branch

    let totalOrders = 0;
    let totalRemittances = 0;

    for (const branchId of BRANCHES) {
      console.log(`\n🏢 Processing Branch ${branchId}...`);

      for (const month of months) {
        console.log(
          `  📅 Generating orders for ${year}-${month.toString().padStart(2, "0")}...`
        );

        // Generate orders for the month
        const daysInMonth = new Date(year, month, 0).getDate();
        const ordersThisMonth = [];

        for (let day = 1; day <= daysInMonth; day++) {
          // Skip some days (weekends have fewer orders)
          const date = new Date(year, month - 1, day);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const dailyOrderCount = isWeekend
            ? Math.floor(ordersPerBranchPerDay * 0.6)
            : Math.floor(ordersPerBranchPerDay * (0.8 + Math.random() * 0.4));

          for (let i = 0; i < dailyOrderCount; i++) {
            const orderDate = generateRandomDate(year, month, 6, 22);
            const order = await createPOSOrder(branchId, orderDate);
            ordersThisMonth.push(order);
            totalOrders++;
          }
        }

        console.log(`    ✅ Generated ${ordersThisMonth.length} orders`);

        // Create remittance for this month
        console.log(
          `  💰 Creating remittance for ${year}-${month.toString().padStart(2, "0")}...`
        );
        const remittance = await createRemittance(branchId, year, month);

        if (remittance) {
          console.log(
            `    ✅ Created remittance ${remittance.remittanceId}: ₱${remittance.grossSales.toLocaleString()} from ${remittance.ordersCount} orders`
          );
          totalRemittances++;
        } else {
          console.log(`    ⚠️  No remittance created (no orders found)`);
        }
      }
    }

    console.log("\n🎉 Seeding completed successfully!");
    console.log("📈 Summary:");
    console.log(`   • Total Orders Created: ${totalOrders}`);
    console.log(`   • Total Remittances Created: ${totalRemittances}`);
    console.log(`   • Branches: ${BRANCHES.join(", ")}`);
    console.log(`   • Period: July-September 2025`);
    console.log(`   • All remittances are approved and linked to orders`);
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

/**
 * Clean up function (optional - for testing)
 */
async function cleanupSeededData() {
  try {
    console.log("🧹 Cleaning up seeded data...");

    // Delete remittances and their linked orders
    await db("pos_sales_orders")
      .whereIn("branch_id", BRANCHES)
      .whereBetween("created_at", [
        new Date("2025-07-01"),
        new Date("2025-09-30 23:59:59"),
      ])
      .del();

    await db("branch_remittances")
      .whereIn("branch_id", BRANCHES)
      .whereBetween("date_from", [
        new Date("2025-07-01"),
        new Date("2025-09-01"),
      ])
      .del();

    console.log("✅ Cleanup completed");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    const args = process.argv.slice(2);

    if (args.includes("--cleanup")) {
      await cleanupSeededData();
    } else {
      await seedPOSOrdersAndRemittances();
    }

    console.log("\n✨ Script execution completed");
  } catch (error) {
    console.error("💥 Script failed:", error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  seedPOSOrdersAndRemittances,
  cleanupSeededData,
};
