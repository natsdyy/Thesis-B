/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Insert inventory categories
  const categoryData = [
    {
      name: "Materials",
      description: "Raw materials and ingredients for food preparation",
      is_active: true,
    },
    {
      name: "Equipment",
      description: "Kitchen and office equipment and tools",
      is_active: true,
    },
    {
      name: "Services",
      description: "Service-related supplies and materials",
      is_active: true,
    },
    {
      name: "Beverages",
      description: "All types of beverages and drinks",
      is_active: true,
    },
  ];

  const insertedCategories = await knex("inventory_categories")
    .insert(categoryData)
    .returning("*");

  // Create a mapping of category names to IDs
  const categoryMap = {};
  insertedCategories.forEach((cat) => {
    categoryMap[cat.name] = cat.id;
  });

  // Insert inventory item types
  const itemTypeData = [
    // Materials
    {
      category_id: categoryMap["Materials"],
      name: "Meat and Poultry",
      description: "Fresh and frozen meat and poultry products",
      unit_of_measure: "kg",
      requires_expiry: true,
      requires_batch: true,
      is_active: true,
    },
    {
      category_id: categoryMap["Materials"],
      name: "Fish and Seafood",
      description: "Fresh and frozen fish and seafood",
      unit_of_measure: "kg",
      requires_expiry: true,
      requires_batch: true,
      is_active: true,
    },
    {
      category_id: categoryMap["Materials"],
      name: "Dairy and Eggs",
      description: "Dairy products and eggs",
      unit_of_measure: "kg",
      requires_expiry: true,
      requires_batch: true,
      is_active: true,
    },
    {
      category_id: categoryMap["Materials"],
      name: "Fruits and Vegetables",
      description: "Fresh fruits and vegetables",
      unit_of_measure: "kg",
      requires_expiry: true,
      requires_batch: false,
      is_active: true,
    },
    {
      category_id: categoryMap["Materials"],
      name: "Snacks and Confectionery",
      description: "Snacks, sweets, and confectionery items",
      unit_of_measure: "pieces",
      requires_expiry: true,
      requires_batch: true,
      is_active: true,
    },
    {
      category_id: categoryMap["Materials"],
      name: "Other Materials",
      description: "Other miscellaneous materials",
      unit_of_measure: "pieces",
      requires_expiry: false,
      requires_batch: false,
      is_active: true,
    },

    // Equipment
    {
      category_id: categoryMap["Equipment"],
      name: "Kitchen Equipment",
      description: "Kitchen appliances and cooking equipment",
      unit_of_measure: "pieces",
      requires_expiry: false,
      requires_batch: false,
      is_active: true,
    },
    {
      category_id: categoryMap["Equipment"],
      name: "Office Equipment",
      description: "Office furniture and equipment",
      unit_of_measure: "pieces",
      requires_expiry: false,
      requires_batch: false,
      is_active: true,
    },
    {
      category_id: categoryMap["Equipment"],
      name: "Service Equipment",
      description: "Customer service and dining equipment",
      unit_of_measure: "pieces",
      requires_expiry: false,
      requires_batch: false,
      is_active: true,
    },
    {
      category_id: categoryMap["Equipment"],
      name: "Cleaning Equipment",
      description: "Cleaning tools and equipment",
      unit_of_measure: "pieces",
      requires_expiry: false,
      requires_batch: false,
      is_active: true,
    },

    // Services
    {
      category_id: categoryMap["Services"],
      name: "Maintenance Service",
      description: "Maintenance and repair service supplies",
      unit_of_measure: "pieces",
      requires_expiry: false,
      requires_batch: false,
      is_active: true,
    },
    {
      category_id: categoryMap["Services"],
      name: "Cleaning Service",
      description: "Cleaning service supplies and materials",
      unit_of_measure: "pieces",
      requires_expiry: true,
      requires_batch: false,
      is_active: true,
    },

    // Beverages
    {
      category_id: categoryMap["Beverages"],
      name: "Water",
      description: "Bottled and filtered water",
      unit_of_measure: "liters",
      requires_expiry: true,
      requires_batch: true,
      is_active: true,
    },
    {
      category_id: categoryMap["Beverages"],
      name: "Soft Drinks",
      description: "Carbonated and non-carbonated soft drinks",
      unit_of_measure: "liters",
      requires_expiry: true,
      requires_batch: true,
      is_active: true,
    },
    {
      category_id: categoryMap["Beverages"],
      name: "Juices",
      description: "Fresh and packaged fruit juices",
      unit_of_measure: "liters",
      requires_expiry: true,
      requires_batch: true,
      is_active: true,
    },
    {
      category_id: categoryMap["Beverages"],
      name: "Alcoholic Beverages",
      description: "Beer, wine, and spirits",
      unit_of_measure: "liters",
      requires_expiry: true,
      requires_batch: true,
      is_active: true,
    },
    {
      category_id: categoryMap["Beverages"],
      name: "Coffee & Tea",
      description: "Coffee beans, tea leaves, and related products",
      unit_of_measure: "kg",
      requires_expiry: true,
      requires_batch: true,
      is_active: true,
    },
    {
      category_id: categoryMap["Beverages"],
      name: "Other Beverages",
      description: "Other miscellaneous beverages",
      unit_of_measure: "liters",
      requires_expiry: true,
      requires_batch: false,
      is_active: true,
    },
  ];

  await knex("inventory_item_types").insert(itemTypeData);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex("inventory_item_types").del();
  await knex("inventory_categories").del();
};
