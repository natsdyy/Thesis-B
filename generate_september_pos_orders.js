const { db } = require("./backend/config/database");
const POSOrder = require("./backend/models/POSOrder");

// Sample menu items based on the data you provided
const MENU_ITEMS = [
  { id: 6, name: "Longsilog", price: 100.0 },
  { id: 11, name: "Tapsi", price: 100.0 },
  { id: 12, name: "Bacsilog", price: 195.0 },
  { id: 13, name: "Pork Steak", price: 250.0 },
  { id: 14, name: "Beef and mushroom", price: 390.0 },
  { id: 15, name: "Bihon Guisado", price: 155.0 },
];

const ORDER_TYPES = ["Dine In", "Take Out"];
const STATUSES = ["completed", "completed", "completed", "void"]; // 75% completed, 25% void
const VOID_REASONS = [
  "customer_cancelled",
  "wrong_order",
  "duplicate_order",
  "payment_issue",
  "system_error",
];

// Generate random date in September 2025
function getRandomSeptemberDate() {
  const year = 2025;
  const month = 8; // September (0-indexed)
  const day = Math.floor(Math.random() * 30) + 1; // 1-30
  const hour = Math.floor(Math.random() * 14) + 7; // 7 AM to 9 PM
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);

  return new Date(year, month, day, hour, minute, second);
}

// Generate random order items (menu items only)
function generateOrderItems() {
  const numItems = Math.floor(Math.random() * 5) + 1; // 1-5 items
  const items = [];

  for (let i = 0; i < numItems; i++) {
    if (MENU_ITEMS.length > 0) {
      const menuItem =
        MENU_ITEMS[Math.floor(Math.random() * MENU_ITEMS.length)];
      const quantity = Math.floor(Math.random() * 5) + 1; // 1-5 quantity

      items.push({
        menu_item_id: menuItem.id,
        item_name: menuItem.name,
        quantity: quantity,
        unit_price: menuItem.price,
        total_price: menuItem.price * quantity,
      });
    }
  }

  return items;
}

// Generate order number similar to the existing format
function generateOrderNumber() {
  const now = new Date();
  const timestamp = now.getTime().toString().slice(-6);
  const random = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  return `#${timestamp}${random}`;
}

// Calculate order totals
function calculateTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const taxAmount = 0; // No tax in the sample data
  const totalAmount = subtotal + taxAmount;

  // Generate realistic payment amounts
  const amountPaid = Math.ceil(totalAmount / 50) * 50; // Round up to nearest 50
  const changeAmount = Math.max(0, amountPaid - totalAmount);

  return {
    subtotal: subtotal.toFixed(2),
    tax_amount: taxAmount.toFixed(2),
    total_amount: totalAmount.toFixed(2),
    amount_paid: amountPaid.toFixed(2),
    change_amount: changeAmount.toFixed(2),
  };
}

// Generate timestamps for order lifecycle
function generateTimestamps(createdAt, status) {
  const processedAt = new Date(createdAt.getTime() + Math.random() * 300000); // Within 5 minutes
  const completedAt =
    status === "completed"
      ? new Date(processedAt.getTime() + Math.random() * 600000) // Within 10 minutes
      : null;
  const voidedAt =
    status === "void"
      ? new Date(completedAt?.getTime() + Math.random() * 3600000) ||
        new Date(processedAt.getTime() + Math.random() * 1800000) // Within 30 minutes
      : null;

  return {
    processed_at: processedAt,
    completed_at: completedAt,
    voided_at: voidedAt,
  };
}

async function generatePOSOrders() {
  console.log("🚀 Starting POS order generation for September 2025...");
  console.log(
    "📊 Generating orders for Branch 6 (Burol Main Branch) and Branch 7"
  );

  try {
    // Define specific employees for each branch based on actual database data
    const branchEmployees = {
      6: [
        {
          id: 31,
          employee_id: "EMP000025",
          first_name: "Cedric Kyle",
          last_name: "Belisario",
          role: "Manager",
        },
      ],
      7: [
        {
          id: 13,
          employee_id: "EMP000008",
          first_name: "John Marco",
          last_name: "Paja",
          role: "Cashier",
        },
        {
          id: 18,
          employee_id: "EMP000013",
          first_name: "Nathaniel",
          last_name: "Vasquez",
          role: "Manager",
        },
      ],
    };

    console.log("👥 Using specified employees:");
    console.log("   Branch 6:");
    branchEmployees[6].forEach((emp) => {
      console.log(
        `      - ${emp.first_name} ${emp.last_name} (ID: ${emp.id}, Role: ${emp.role})`
      );
    });
    console.log("   Branch 7:");
    branchEmployees[7].forEach((emp) => {
      console.log(
        `      - ${emp.first_name} ${emp.last_name} (ID: ${emp.id}, Role: ${emp.role})`
      );
    });

    const totalOrders = 150; // Generate 150 orders total
    const ordersPerBranch = Math.floor(totalOrders / 2); // 75 orders per branch
    let orderCount = 0;

    for (const branchId of [6, 7]) {
      console.log(
        `\n🏢 Generating ${ordersPerBranch} orders for Branch ${branchId}...`
      );

      const employees = branchEmployees[branchId];
      const cashier =
        employees.find((emp) => emp.role === "Cashier") || employees[0];
      const manager =
        employees.find((emp) => emp.role === "Manager") || employees[0];

      for (let i = 0; i < ordersPerBranch; i++) {
        try {
          // Generate order data
          const createdAt = getRandomSeptemberDate();
          const items = generateOrderItems();
          const totals = calculateTotals(items);
          const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
          const timestamps = generateTimestamps(createdAt, status);

          const orderData = {
            order_number: generateOrderNumber(),
            branch_id: branchId,
            cashier_id: cashier.id,
            manager_id: manager.id,
            order_type:
              ORDER_TYPES[Math.floor(Math.random() * ORDER_TYPES.length)],
            subtotal: totals.subtotal,
            tax_amount: totals.tax_amount,
            total_amount: totals.total_amount,
            amount_paid: totals.amount_paid,
            change_amount: totals.change_amount,
            status: status,
            void_reason:
              status === "void"
                ? VOID_REASONS[Math.floor(Math.random() * VOID_REASONS.length)]
                : null,
            voided_by: status === "void" ? manager.id : null,
            processed_at: timestamps.processed_at,
            completed_at: timestamps.completed_at,
            voided_at: timestamps.voided_at,
            notes: null,
            created_at: createdAt,
            updated_at: createdAt,
          };

          // Insert order into database
          const [order] = await db("pos_sales_orders")
            .insert(orderData)
            .returning("*");

          // Insert order items
          if (items.length > 0) {
            const orderItems = items.map((item) => ({
              order_id: order.id,
              menu_item_id: item.menu_item_id,
              item_name: item.item_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
            }));

            await db("pos_order_items").insert(orderItems);
          }

          orderCount++;

          if (orderCount % 25 === 0) {
            console.log(`   ✅ Generated ${orderCount} orders so far...`);
          }
        } catch (error) {
          console.error(
            `❌ Error generating order ${i + 1} for branch ${branchId}:`,
            error.message
          );
        }
      }
    }

    console.log(
      `\n🎉 Successfully generated ${orderCount} POS orders for September 2025!`
    );
    console.log(`📈 Summary:`);
    console.log(`   - Branch 6: ${ordersPerBranch} orders`);
    console.log(`   - Branch 7: ${ordersPerBranch} orders`);
    console.log(`   - Total: ${orderCount} orders`);

    // Show some statistics
    const stats = await db("pos_sales_orders")
      .whereIn("branch_id", [6, 7])
      .whereBetween("created_at", [
        new Date(2025, 8, 1), // September 1, 2025
        new Date(2025, 8, 30, 23, 59, 59), // September 30, 2025
      ])
      .select(
        db.raw("COUNT(*) as total_orders"),
        db.raw(
          "COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders"
        ),
        db.raw("COUNT(CASE WHEN status = 'void' THEN 1 END) as voided_orders"),
        db.raw(
          "SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as total_sales"
        )
      )
      .first();

    console.log(`\n📊 Generated Data Statistics:`);
    console.log(`   - Total Orders: ${stats.total_orders}`);
    console.log(`   - Completed Orders: ${stats.completed_orders}`);
    console.log(`   - Voided Orders: ${stats.voided_orders}`);
    console.log(
      `   - Total Sales: ₱${parseFloat(stats.total_sales || 0).toLocaleString()}`
    );
  } catch (error) {
    console.error("❌ Error generating POS orders:", error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  generatePOSOrders()
    .then(() => {
      console.log("\n✅ Script completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Script failed:", error);
      process.exit(1);
    });
}

module.exports = { generatePOSOrders };
