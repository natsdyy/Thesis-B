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
}

module.exports = BranchDistribution;
