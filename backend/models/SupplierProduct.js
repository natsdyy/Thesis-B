const { db } = require("../config/database");
const {
  formatForDatabaseWithTimezone,
  parseFromDatabase,
} = require("../utils/timezoneUtils");

class SupplierProduct {
  // Get all products for a supplier
  static async getAllBySupplier(supplierId) {
    const products = await db("supplier_products")
      .where({ supplier_id: supplierId, deleted_at: null })
      .orderBy("created_at", "desc");

    // Add promo info to each product
    return products.map((product) => {
      product.promo_info = this.calculatePromoInfo(product);
      return product;
    });
  }

  // Get all available products for a supplier
  static async getAvailableBySupplier(supplierId) {
    const products = await db("supplier_products")
      .where({
        supplier_id: supplierId,
        is_available: true,
        deleted_at: null,
      })
      .orderBy("product_name", "asc");

    // Add promo info to each product
    return products.map((product) => {
      product.promo_info = this.calculatePromoInfo(product);
      return product;
    });
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

    // Calculate promo discount info if applicable
    if (product) {
      product.promo_info = this.calculatePromoInfo(product);
    }

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

  // Calculate promo discount information
  static calculatePromoInfo(product) {
    if (!product.has_promo_discount) {
      return null;
    }

    const now = new Date();

    // Parse dates using timezone utilities with safety checks
    let startDate = null;
    let endDate = null;

    try {
      if (product.promo_start_date) {
        startDate = parseFromDatabase(product.promo_start_date);
      }
    } catch (error) {
      console.warn("Error parsing promo start date:", error);
      startDate = null;
    }

    try {
      if (product.promo_end_date) {
        endDate = parseFromDatabase(product.promo_end_date);
      }
    } catch (error) {
      console.warn("Error parsing promo end date:", error);
      endDate = null;
    }

    const isActive =
      (!startDate || startDate <= now) && (!endDate || endDate >= now);

    return {
      is_active: isActive,
      minimum_quantity: product.promo_minimum_quantity,
      discount_type: product.promo_discount_type,
      discount_percentage: product.promo_discount_percentage,
      discount_amount: product.promo_discount_amount,
      description: product.promo_description,
      start_date: product.promo_start_date,
      end_date: product.promo_end_date,
    };
  }

  // Calculate discounted price for a given quantity
  static calculateDiscountedPrice(product, quantity) {
    const promoInfo = this.calculatePromoInfo(product);

    if (
      !promoInfo ||
      !promoInfo.is_active ||
      quantity < promoInfo.minimum_quantity
    ) {
      return {
        original_price: parseFloat(product.unit_price),
        discounted_price: parseFloat(product.unit_price),
        discount_amount: 0,
        discount_percentage: 0,
        total_savings: 0,
      };
    }

    const originalPrice = parseFloat(product.unit_price);
    let discountAmount = 0;

    if (promoInfo.discount_type === "percentage") {
      discountAmount = originalPrice * (promoInfo.discount_percentage / 100);
    } else if (promoInfo.discount_type === "fixed_amount") {
      discountAmount = promoInfo.discount_amount;
    }

    const discountedPrice = Math.max(0, originalPrice - discountAmount);
    const totalSavings = discountAmount * quantity;

    return {
      original_price: originalPrice,
      discounted_price: discountedPrice,
      discount_amount: discountAmount,
      discount_percentage:
        promoInfo.discount_type === "percentage"
          ? promoInfo.discount_percentage
          : 0,
      total_savings: totalSavings,
      promo_info: promoInfo,
    };
  }

  // Toggle promo discount
  static async togglePromoDiscount(id, supplierId, promoData) {
    const product = await this.getById(id);
    if (!product || product.supplier_id !== supplierId) {
      return null;
    }

    // Format dates using timezone utilities
    const updateData = {
      has_promo_discount: promoData.has_promo_discount || false,
      promo_minimum_quantity: promoData.promo_minimum_quantity || null,
      promo_discount_percentage: promoData.promo_discount_percentage || null,
      promo_discount_amount: promoData.promo_discount_amount || null,
      promo_discount_type: promoData.promo_discount_type || "percentage",
      promo_description: promoData.promo_description || null,
      promo_start_date: promoData.promo_start_date
        ? formatForDatabaseWithTimezone(new Date(promoData.promo_start_date))
        : null,
      promo_end_date: promoData.promo_end_date
        ? formatForDatabaseWithTimezone(new Date(promoData.promo_end_date))
        : null,
      updated_at: formatForDatabaseWithTimezone(new Date()),
    };

    const [updatedProduct] = await db("supplier_products")
      .where({ id, supplier_id: supplierId })
      .update(updateData)
      .returning("*");

    updatedProduct.promo_info = this.calculatePromoInfo(updatedProduct);
    return updatedProduct;
  }

  // Get products with active promotions
  static async getProductsWithActivePromotions(supplierId) {
    const now = formatForDatabaseWithTimezone(new Date());
    const products = await db("supplier_products")
      .where({
        supplier_id: supplierId,
        has_promo_discount: true,
        deleted_at: null,
      })
      .where(function () {
        this.whereNull("promo_start_date").orWhere(
          "promo_start_date",
          "<=",
          now
        );
      })
      .where(function () {
        this.whereNull("promo_end_date").orWhere("promo_end_date", ">=", now);
      })
      .orderBy("created_at", "desc");

    return products.map((product) => {
      product.promo_info = this.calculatePromoInfo(product);
      return product;
    });
  }
}

module.exports = SupplierProduct;
