const { db } = require("../config/database");

class BranchDistribution {
  /**
   * Create a new branch distribution with items
   * @param {Object} distributionData - The distribution data
   * @param {number} distributionData.branch_id - Branch ID
   * @param {string} distributionData.prepared_by - Who prepared the distribution
   * @param {number} distributionData.total_amount - Total amount
   * @param {string} distributionData.notes - Notes
   * @param {Array} distributionData.items - Array of distribution items
   * @returns {Promise<Object>} Created distribution with items
   */
  static async create(distributionData) {
    const trx = await db.transaction();

    try {
      // Generate unique reference number
      const reference = await this.generateReference(trx);

      // Create the distribution header
      const insertResult = await trx("branch_distributions").insert({
        reference,
        branch_id: distributionData.branch_id,
        prepared_by: distributionData.prepared_by,
        total_amount: distributionData.total_amount,
        notes: distributionData.notes,
        status: "delivered",
      });
      // Handle different driver return shapes
      let distributionId;
      if (Array.isArray(insertResult)) {
        distributionId = insertResult[0];
      } else if (
        insertResult &&
        typeof insertResult === "object" &&
        "id" in insertResult
      ) {
        distributionId = insertResult.id;
      } else {
        // Fallback: query last inserted id
        const latest = await trx("branch_distributions")
          .select("id")
          .where({ reference })
          .orderBy("id", "desc")
          .first();
        distributionId = latest?.id;
      }

      // Create the distribution items
      const itemsWithDistributionId = distributionData.items.map((item) => ({
        distribution_id: distributionId,
        source: item.source,
        item_ref_id: item.item_ref_id,
        name: item.name,
        unit: item.unit,
        qty: item.qty,
        unit_price: item.unit_price,
        amount: item.amount,
        category: item.category || "Uncategorized",
        expiry_date: item.expiry_date || null,
        notes: item.notes || null,
      }));

      await trx("branch_distribution_items").insert(itemsWithDistributionId);

      await trx.commit();

      // Return the created distribution with items
      return await this.findByIdWithItems(distributionId);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Generate a unique reference number
   * @param {Object} trx - Knex transaction object
   * @returns {Promise<string>} Unique reference
   */
  static async generateReference(trx = db) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    // Find the latest reference for today
    const latestRef = await trx("branch_distributions")
      .where("reference", "like", `BD-${dateStr}-%`)
      .orderBy("reference", "desc")
      .first();

    let sequence = 1;
    if (latestRef) {
      const lastSequence = parseInt(latestRef.reference.split("-")[2]) || 0;
      sequence = lastSequence + 1;
    }

    return `BD-${dateStr}-${sequence.toString().padStart(3, "0")}`;
  }

  /**
   * Find distribution by ID with items
   * @param {number} id - Distribution ID
   * @returns {Promise<Object|null>} Distribution with items
   */
  static async findByIdWithItems(id) {
    const distribution = await db("branch_distributions")
      .leftJoin("branches", "branch_distributions.branch_id", "branches.id")
      .select("branch_distributions.*", "branches.name as branch_name")
      .where("branch_distributions.id", id)
      .first();

    if (!distribution) {
      return null;
    }

    const items = await db("branch_distribution_items")
      .where("distribution_id", id)
      .orderBy("id");

    return {
      ...distribution,
      items,
    };
  }

  /**
   * Find distribution by reference with items
   * @param {string} reference - Distribution reference
   * @returns {Promise<Object|null>} Distribution with items
   */
  static async findByReferenceWithItems(reference) {
    const distribution = await db("branch_distributions")
      .leftJoin("branches", "branch_distributions.branch_id", "branches.id")
      .select("branch_distributions.*", "branches.name as branch_name")
      .where("branch_distributions.reference", reference)
      .first();

    if (!distribution) {
      return null;
    }

    const items = await db("branch_distribution_items")
      .where("distribution_id", distribution.id)
      .orderBy("id");

    return {
      ...distribution,
      items,
    };
  }

  /**
   * Get distributions for a specific branch
   * @param {number} branchId - Branch ID
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 20)
   * @param {string} options.startDate - Start date filter
   * @param {string} options.endDate - End date filter
   * @returns {Promise<Object>} Paginated distributions
   */
  static async getByBranch(branchId, options = {}) {
    const { page = 1, limit = 20, startDate, endDate } = options;
    const offset = (page - 1) * limit;

    let query = db("branch_distributions")
      .leftJoin("branches", "branch_distributions.branch_id", "branches.id")
      .select("branch_distributions.*", "branches.name as branch_name")
      .where("branch_distributions.branch_id", branchId);

    if (startDate) {
      query = query.where("branch_distributions.created_at", ">=", startDate);
    }
    if (endDate) {
      query = query.where("branch_distributions.created_at", "<=", endDate);
    }

    const total = await query
      .clone()
      .clearSelect()
      .clearOrder()
      .count("* as count")
      .first();
    const distributions = await query
      .orderBy("branch_distributions.created_at", "desc")
      .limit(limit)
      .offset(offset);

    return {
      data: distributions,
      pagination: {
        page,
        limit,
        total: parseInt(total.count),
        pages: Math.ceil(parseInt(total.count) / limit),
      },
    };
  }

  /**
   * Get all distributions with pagination
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 20)
   * @param {string} options.startDate - Start date filter
   * @param {string} options.endDate - End date filter
   * @param {number} options.branch_id - Branch filter
   * @returns {Promise<Object>} Paginated distributions
   */
  static async getAll(options = {}) {
    const { page = 1, limit = 20, startDate, endDate, branch_id } = options;
    const offset = (page - 1) * limit;

    let query = db("branch_distributions")
      .leftJoin("branches", "branch_distributions.branch_id", "branches.id")
      .select("branch_distributions.*", "branches.name as branch_name");

    if (branch_id) {
      query = query.where("branch_distributions.branch_id", branch_id);
    }
    if (startDate) {
      query = query.where("branch_distributions.created_at", ">=", startDate);
    }
    if (endDate) {
      query = query.where("branch_distributions.created_at", "<=", endDate);
    }

    const total = await query
      .clone()
      .clearSelect()
      .clearOrder()
      .count("* as count")
      .first();
    const distributions = await query
      .orderBy("branch_distributions.created_at", "desc")
      .limit(limit)
      .offset(offset);

    return {
      data: distributions,
      pagination: {
        page,
        limit,
        total: parseInt(total.count),
        pages: Math.ceil(parseInt(total.count) / limit),
      },
    };
  }

  /**
   * Update distribution status with optional details
   * @param {number} id - Distribution ID
   * @param {string} status - New status ('delivered', 'completed', 'rejected')
   * @param {Object} details - Additional details for the status change
   * @param {string} details.completed_by - User who completed the distribution
   * @param {string} details.rejected_by - User who rejected the distribution
   * @param {string} details.rejection_reason - Reason for rejection
   * @param {string} details.rejection_notes - Additional notes about rejection
   * @returns {Promise<Object>} Updated distribution
   */
  static async updateStatus(id, status, details = {}) {
    const updateData = {
      status,
      updated_at: db.fn.now(),
    };

    // Add completion details
    if (status === "completed" && details.completed_by) {
      updateData.completed_by = details.completed_by;
      updateData.completed_at = db.fn.now();
    }

    // Add rejection details
    if (status === "rejected") {
      if (details.rejected_by) {
        updateData.rejected_by = details.rejected_by;
        updateData.rejected_at = db.fn.now();
      }
      if (details.rejection_reason) {
        updateData.rejection_reason = details.rejection_reason;
      }
      if (details.rejection_notes) {
        updateData.rejection_notes = details.rejection_notes;
      }
    }

    const result = await db("branch_distributions")
      .where("id", id)
      .update(updateData);

    if (result > 0) {
      return await this.findByIdWithItems(id);
    }

    return null;
  }

  /**
   * Reject distribution and return quantities to main inventory
   * @param {number} id - Distribution ID
   * @param {Object} rejectionData - Rejection details
   * @param {string} rejectionData.rejected_by - User who rejected
   * @param {string} rejectionData.rejection_reason - Reason for rejection
   * @param {string} rejectionData.rejection_notes - Additional notes
   * @returns {Promise<Object>} Updated distribution
   */
  static async rejectDistribution(id, rejectionData) {
    const trx = await db.transaction();

    try {
      // Get the distribution with items
      const distribution = await trx("branch_distributions")
        .leftJoin("branches", "branch_distributions.branch_id", "branches.id")
        .select("branch_distributions.*", "branches.name as branch_name")
        .where("branch_distributions.id", id)
        .first();

      if (!distribution) {
        throw new Error("Distribution not found");
      }

      if (distribution.status !== "delivered") {
        throw new Error("Only delivered distributions can be rejected");
      }

      // Get distribution items
      const items = await trx("branch_distribution_items").where(
        "distribution_id",
        id
      );

      // Return quantities to main inventory
      for (const item of items) {
        if (item.source === "scm") {
          // Return to SCM inventory
          await trx("inventory_items")
            .where("id", item.item_ref_id)
            .increment("quantity", item.qty);
        } else if (item.source === "production") {
          // Return to production inventory
          await trx("production_inventory")
            .where("id", item.item_ref_id)
            .increment("available_quantity", item.qty);
        }
      }

      // Update distribution status to rejected
      await trx("branch_distributions").where("id", id).update({
        status: "rejected",
        rejected_by: rejectionData.rejected_by,
        rejected_at: db.fn.now(),
        rejection_reason: rejectionData.rejection_reason,
        rejection_notes: rejectionData.rejection_notes,
        updated_at: db.fn.now(),
      });

      await trx.commit();

      // Return updated distribution
      return await this.findByIdWithItems(id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Complete distribution and add items to branch inventory
   * @param {number} id - Distribution ID
   * @param {Object} completionData - Completion details
   * @param {string} completionData.completed_by - User who completed
   * @returns {Promise<Object>} Updated distribution
   */
  static async completeDistribution(id, completionData) {
    const trx = await db.transaction();

    try {
      // Get the distribution with items
      const distribution = await trx("branch_distributions")
        .leftJoin("branches", "branch_distributions.branch_id", "branches.id")
        .select("branch_distributions.*", "branches.name as branch_name")
        .where("branch_distributions.id", id)
        .first();

      if (!distribution) {
        throw new Error("Distribution not found");
      }

      if (distribution.status !== "delivered") {
        throw new Error("Only delivered distributions can be completed");
      }

      // Get distribution items
      const items = await trx("branch_distribution_items").where(
        "distribution_id",
        id
      );

      // Add items to branch inventory
      for (const item of items) {
        // Check if item already exists in branch inventory by name and type
        const existingItem = await trx("branch_inventory")
          .where({
            item_name: item.name,
            item_type: item.source,
            branch_id: distribution.branch_id,
          })
          .first();

        if (existingItem) {
          // Update existing item
          await trx("branch_inventory")
            .where("id", existingItem.id)
            .update({
              quantity: db.raw(`quantity + ${item.qty}`),
              total_value: db.raw(`total_value + ${item.amount}`),
              updated_at: db.fn.now(),
            });
        } else {
          // Create new branch inventory item
          await trx("branch_inventory").insert({
            item_name: item.name,
            item_type: item.source,
            category: item.category || "Distributed",
            quantity: item.qty,
            unit: item.unit,
            unit_cost: item.unit_price,
            // For production sourced items, preserve selling price and image when available
            selling_price:
              item.source === "production" && item.menu_selling_price
                ? item.menu_selling_price
                : null,
            total_value: item.amount,
            minimum_stock: Math.ceil(item.qty * 0.15), // 15% of quantity
            expiry_date: item.expiry_date || null,
            image_url:
              item.source === "production" && item.image_url
                ? item.image_url
                : null,
            branch_id: distribution.branch_id,
            status: "active",
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          });
        }
      }

      // Update distribution status to completed
      await trx("branch_distributions").where("id", id).update({
        status: "completed",
        completed_by: completionData.completed_by,
        completed_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      await trx.commit();

      // Return updated distribution
      return await this.findByIdWithItems(id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Delete a distribution (soft delete by updating status)
   * @param {number} id - Distribution ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const result = await db("branch_distributions")
      .where("id", id)
      .update({
        updated_at: db.fn.now(),
        notes: db.raw('CONCAT(COALESCE(notes, ""), " [DELETED]")'),
      });

    return result > 0;
  }

  /**
   * Get all distribution items with detailed information for production inventory
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {string} options.startDate - Start date filter
   * @param {string} options.endDate - End date filter
   * @param {number} options.branch_id - Branch filter
   * @param {string} options.search - Search term
   * @returns {Promise<Object>} Paginated distribution items
   */
  static async getAllDistributionItems(options = {}) {
    const {
      page = 1,
      limit = 50,
      startDate,
      endDate,
      branch_id,
      search,
    } = options;
    const offset = (page - 1) * limit;

    let query = db("branch_distribution_items as bdi")
      .leftJoin("branch_distributions as bd", "bdi.distribution_id", "bd.id")
      .leftJoin("branches as b", "bd.branch_id", "b.id")
      .leftJoin("production_inventory as pi", function () {
        this.on("bdi.item_ref_id", "pi.id").andOn(
          "bdi.source",
          "=",
          db.raw("'production'")
        );
      })
      .leftJoin("menu_items as mi", "pi.menu_item_id", "mi.id")
      .select(
        "bdi.*",
        "bd.reference",
        "bd.created_at as distribution_date",
        "bd.prepared_by as distributed_by_name",
        "b.name as branch_name",
        "b.id as branch_id",
        "mi.menu_item_name",
        "mi.item_code",
        "mi.category"
      )
      .where("bdi.source", "production"); // Only production items

    // Apply filters
    if (branch_id) {
      query = query.where("bd.branch_id", branch_id);
    }
    if (startDate) {
      query = query.where("bd.created_at", ">=", startDate);
    }
    if (endDate) {
      query = query.where("bd.created_at", "<=", endDate);
    }
    if (search) {
      query = query.where(function () {
        this.where("bdi.name", "ilike", `%${search}%`)
          .orWhere("mi.menu_item_name", "ilike", `%${search}%`)
          .orWhere("mi.item_code", "ilike", `%${search}%`)
          .orWhere("b.name", "ilike", `%${search}%`);
      });
    }

    const total = await query
      .clone()
      .clearSelect()
      .clearOrder()
      .count("* as count")
      .first();

    const items = await query
      .orderBy("bd.created_at", "desc")
      .limit(limit)
      .offset(offset);

    return {
      distributions: items,
      pagination: {
        page,
        limit,
        total: parseInt(total.count),
        pages: Math.ceil(parseInt(total.count) / limit),
      },
    };
  }
}

module.exports = BranchDistribution;
