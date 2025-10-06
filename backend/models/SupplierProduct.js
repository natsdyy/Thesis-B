const { db } = require("../config/database");

class SupplierProduct {
  // Get all products for a supplier
  static async getAllBySupplier(supplierId) {
    return await db("supplier_products")
      .where({ supplier_id: supplierId, deleted_at: null })
      .orderBy("created_at", "desc");
  }

  // Get all available products for a supplier
  static async getAvailableBySupplier(supplierId) {
    return await db("supplier_products")
      .where({
        supplier_id: supplierId,
        is_available: true,
        deleted_at: null,
      })
      .orderBy("product_name", "asc");
  }

  // Get product by ID
  static async getById(id) {
    const product = await db("supplier_products")
      .where({ id, deleted_at: null })
      .first();
    return product;
  }

  // Get product by ID with supplier info and item type
  static async getByIdWithSupplier(id) {
    const product = await db("supplier_products as sp")
      .leftJoin("suppliers as s", "sp.supplier_id", "s.id")
      .leftJoin("inventory_item_types as it", "sp.item_type_id", "it.id")
      .leftJoin("inventory_categories as c", "it.category_id", "c.id")
      .where({ "sp.id": id, "sp.deleted_at": null })
      .select(
        "sp.*",
        "s.name as supplier_name",
        "s.email as supplier_email",
        "s.phone as supplier_phone",
        "it.name as item_type_name",
        "it.unit_of_measure as item_type_unit",
        "c.name as category_name"
      )
      .first();
    return product;
  }

  // Create new product
  static async create(productData) {
    const [product] = await db("supplier_products")
      .insert({
        ...productData,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning("*");
    return product;
  }

  // Update product
  static async update(id, supplierId, productData) {
    // Ensure supplier can only update their own products
    const [product] = await db("supplier_products")
      .where({ id, supplier_id: supplierId, deleted_at: null })
      .update({
        ...productData,
        updated_at: new Date(),
      })
      .returning("*");
    return product;
  }

  // Soft delete product
  static async delete(id, supplierId) {
    // Ensure supplier can only delete their own products
    const [product] = await db("supplier_products")
      .where({ id, supplier_id: supplierId, deleted_at: null })
      .update({
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .returning("*");
    return product;
  }

  // Toggle availability
  static async toggleAvailability(id, supplierId) {
    const product = await this.getById(id);
    if (!product || product.supplier_id !== supplierId) {
      return null;
    }

    const [updatedProduct] = await db("supplier_products")
      .where({ id, supplier_id: supplierId })
      .update({
        is_available: !product.is_available,
        updated_at: new Date(),
      })
      .returning("*");
    return updatedProduct;
  }

  // Search products by supplier
  static async searchBySupplier(supplierId, searchTerm) {
    return await db("supplier_products as sp")
      .leftJoin("inventory_item_types as it", "sp.item_type_id", "it.id")
      .where({ "sp.supplier_id": supplierId, "sp.deleted_at": null })
      .andWhere(function () {
        this.where("sp.product_name", "ilike", `%${searchTerm}%`)
          .orWhere("sp.description", "ilike", `%${searchTerm}%`)
          .orWhere("it.name", "ilike", `%${searchTerm}%`)
          .orWhere("sp.sku", "ilike", `%${searchTerm}%`);
      })
      .select("sp.*", "it.name as item_type_name")
      .orderBy("sp.product_name", "asc");
  }

  // Get products by item type for a supplier
  static async getByItemType(supplierId, itemTypeId) {
    return await db("supplier_products as sp")
      .leftJoin("inventory_item_types as it", "sp.item_type_id", "it.id")
      .where({
        "sp.supplier_id": supplierId,
        "sp.item_type_id": itemTypeId,
        "sp.deleted_at": null,
      })
      .select("sp.*", "it.name as item_type_name")
      .orderBy("sp.product_name", "asc");
  }

  // Get all item types used by a supplier
  static async getItemTypesBySupplier(supplierId) {
    const itemTypes = await db("supplier_products as sp")
      .leftJoin("inventory_item_types as it", "sp.item_type_id", "it.id")
      .leftJoin("inventory_categories as c", "it.category_id", "c.id")
      .where({ "sp.supplier_id": supplierId, "sp.deleted_at": null })
      .distinct("it.id", "it.name", "c.name as category_name")
      .whereNotNull("sp.item_type_id")
      .orderBy("c.name", "asc")
      .orderBy("it.name", "asc");
    return itemTypes;
  }

  // Bulk update prices (for price adjustments)
  static async bulkUpdatePrices(supplierId, priceAdjustment) {
    // priceAdjustment can be percentage or fixed amount
    const { type, value, productIds } = priceAdjustment;

    let query = db("supplier_products").where({
      supplier_id: supplierId,
      deleted_at: null,
    });

    if (productIds && productIds.length > 0) {
      query = query.whereIn("id", productIds);
    }

    if (type === "percentage") {
      await query.update({
        unit_price: db.raw(`unit_price * (1 + ${value / 100})`),
        updated_at: new Date(),
      });
    } else if (type === "fixed") {
      await query.update({
        unit_price: db.raw(`unit_price + ${value}`),
        updated_at: new Date(),
      });
    }

    return await this.getAllBySupplier(supplierId);
  }
}

module.exports = SupplierProduct;
