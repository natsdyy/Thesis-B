const { db } = require("../config/database");
const Inventory = require("./Inventory");
const BranchRequest = require("./BranchRequest");
const ProductionInventory = require("./ProductionInventory");

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
        prepared_proof_html: distributionData.prepared_proof_html || null,
        received_proof_html: distributionData.received_proof_html || null,
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
      const itemsWithDistributionId = [];

      for (const rawItem of distributionData.items) {
        // Normalize incoming fields (support auto-map payloads)
        const normalizedSource = (rawItem.source || "scm")
          .toString()
          .toLowerCase();
        const normalizedQty = Number(
          rawItem.qty !== undefined
            ? rawItem.qty
            : rawItem.quantity !== undefined
              ? rawItem.quantity
              : 0
        );
        const normalizedUnitPrice = Number(
          rawItem.unit_price !== undefined
            ? rawItem.unit_price
            : rawItem.price !== undefined
              ? rawItem.price
              : 0
        );
        const normalizedAmount = Number(
          rawItem.amount !== undefined
            ? rawItem.amount
            : (normalizedQty || 0) * (normalizedUnitPrice || 0)
        );

        let itemRefId = rawItem.item_ref_id;
        // Normalize reference IDs: ensure production uses production_inventory.id
        if (normalizedSource === "production") {
          let prodRowById = null;
          if (Number.isFinite(Number(itemRefId))) {
            prodRowById = await trx("production_inventory")
              .where("id", Number(itemRefId))
              .first("id");
          }

          if (prodRowById && prodRowById.id) {
            itemRefId = prodRowById.id;
          } else {
            // Treat provided ref as possible menu_item_id or resolve by name
            const prodRow = await trx("production_inventory as pi")
              .leftJoin("menu_items as mi", "pi.menu_item_id", "mi.id")
              .modify((qb) => {
                if (Number.isFinite(Number(itemRefId)))
                  qb.where("mi.id", Number(itemRefId));
                else if (rawItem.menu_item_id)
                  qb.where("mi.id", rawItem.menu_item_id);
                else qb.whereILike("mi.menu_item_name", rawItem.name || "");
              })
              .orderBy("pi.id", "asc")
              .first("pi.id");
            if (prodRow && prodRow.id) itemRefId = prodRow.id;
          }
        } else {
          // SCM source: choose a current inventory item row if missing/invalid
          if (!Number.isFinite(Number(itemRefId))) {
            const invRow = await trx("inventory_items")
              .whereNull("deleted_at")
              .where({ status: "available" })
              .where("quantity", ">", 0)
              .whereILike("item_name", rawItem.name || "")
              .orderBy("received_date", "desc")
              .first("id");
            if (invRow && invRow.id) itemRefId = invRow.id;
          }
        }

        itemsWithDistributionId.push({
          distribution_id: distributionId,
          source: normalizedSource,
          item_ref_id: Number(itemRefId) || 0, // validate later via DB constraints
          name: rawItem.name,
          unit: rawItem.unit,
          qty: normalizedQty,
          unit_price: normalizedUnitPrice,
          amount: normalizedAmount,
          category: rawItem.category || "Uncategorized",
          expiry_date: rawItem.expiry_date || null,
          notes: rawItem.notes || null,
        });
      }

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
   * Create multiple branch distributions in bulk (optimized for performance)
   * @param {Array} distributionsData - Array of distribution data
   * @returns {Promise<Array>} Created distributions with items
   */
  static async createBulkDistributions(distributionsData) {
    const trx = await db.transaction();

    try {
      const results = [];

      // Process all distributions in a single transaction
      for (const distributionData of distributionsData) {
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
        const itemsWithDistributionId = [];
        for (const rawItem of distributionData.items) {
          const normalizedSource = (rawItem.source || "scm")
            .toString()
            .toLowerCase();
          const normalizedQty = Number(
            rawItem.qty !== undefined
              ? rawItem.qty
              : rawItem.quantity !== undefined
                ? rawItem.quantity
                : 0
          );
          const normalizedUnitPrice = Number(
            rawItem.unit_price !== undefined
              ? rawItem.unit_price
              : rawItem.price !== undefined
                ? rawItem.price
                : 0
          );
          const normalizedAmount = Number(
            rawItem.amount !== undefined
              ? rawItem.amount
              : (normalizedQty || 0) * (normalizedUnitPrice || 0)
          );

          let itemRefId = rawItem.item_ref_id;
          if (normalizedSource === "production") {
            let prodRowById = null;
            if (Number.isFinite(Number(itemRefId))) {
              prodRowById = await trx("production_inventory")
                .where("id", Number(itemRefId))
                .first("id");
            }
            if (prodRowById && prodRowById.id) {
              itemRefId = prodRowById.id;
            } else {
              const prodRow = await trx("production_inventory as pi")
                .leftJoin("menu_items as mi", "pi.menu_item_id", "mi.id")
                .modify((qb) => {
                  if (Number.isFinite(Number(itemRefId)))
                    qb.where("mi.id", Number(itemRefId));
                  else if (rawItem.menu_item_id)
                    qb.where("mi.id", rawItem.menu_item_id);
                  else qb.whereILike("mi.menu_item_name", rawItem.name || "");
                })
                .orderBy("pi.id", "asc")
                .first("pi.id");
              if (prodRow && prodRow.id) itemRefId = prodRow.id;
            }
          } else {
            if (!Number.isFinite(Number(itemRefId))) {
              const invRow = await trx("inventory_items")
                .whereNull("deleted_at")
                .where({ status: "available" })
                .where("quantity", ">", 0)
                .whereILike("item_name", rawItem.name || "")
                .orderBy("received_date", "desc")
                .first("id");
              if (invRow && invRow.id) itemRefId = invRow.id;
            }
          }

          itemsWithDistributionId.push({
            distribution_id: distributionId,
            source: normalizedSource,
            item_ref_id: Number(itemRefId) || 0,
            name: rawItem.name,
            unit: rawItem.unit,
            qty: normalizedQty,
            unit_price: normalizedUnitPrice,
            amount: normalizedAmount,
            category: rawItem.category || "Uncategorized",
            expiry_date: rawItem.expiry_date || null,
            notes: rawItem.notes || null,
          });
        }

        await trx("branch_distribution_items").insert(itemsWithDistributionId);

        // Get the created distribution with items for return
        const distribution = await trx("branch_distributions")
          .leftJoin("branches", "branch_distributions.branch_id", "branches.id")
          .select("branch_distributions.*", "branches.name as branch_name")
          .where("branch_distributions.id", distributionId)
          .first();

        const items = await trx("branch_distribution_items")
          .where("distribution_id", distributionId)
          .orderBy("id");

        results.push({
          ...distribution,
          items,
        });
      }

      await trx.commit();
      return results;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
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

    // For partially processed distributions, get rejection information
    let rejectedItems = [];
    if (distribution.status === "partially_processed") {
      // Get rejection information from the dedicated rejections table
      // For production items, we need to join with menu_items to get the proper name
      rejectedItems = await db("branch_distribution_rejections as bdr")
        .leftJoin(
          "branch_distribution_items as bdi",
          "bdr.distribution_item_id",
          "bdi.id"
        )
        .leftJoin("production_inventory as pi", function () {
          this.on("bdi.item_ref_id", "pi.id").andOn(
            "bdi.source",
            "=",
            db.raw("'production'")
          );
        })
        .leftJoin("menu_items as mi", "pi.menu_item_id", "mi.id")
        .where("bdr.distribution_id", id)
        .select(
          "bdi.id",
          db.raw(
            "CASE WHEN bdi.source = 'production' THEN mi.menu_item_name ELSE bdi.name END as name"
          ),
          "bdi.source",
          "bdi.qty as quantity",
          "bdi.unit_price as unit_cost",
          "bdi.amount as total_value",
          db.raw(
            "CASE WHEN bdi.source = 'production' THEN pi.unit_of_measure ELSE bdi.unit END as unit"
          ),
          "bdi.category",
          "bdr.rejection_reason",
          "bdr.rejection_notes",
          "bdr.rejected_by",
          "bdr.rejected_at as transaction_date"
        )
        .orderBy("bdr.rejected_at", "desc");
    }

    return {
      ...distribution,
      items,
      rejected_items: rejectedItems,
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
    return await db.transaction(async (trx) => {
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

      // Record rejection in inventory transaction history for tracking
      for (const item of items) {
        if (item.source === "scm") {
          await trx("inventory_transactions").insert({
            inventory_item_id: item.item_ref_id,
            transaction_type: "adjustment",
            quantity: parseFloat(item.qty),
            unit_cost: parseFloat(item.unit_price) || 0,
            total_value: parseFloat(item.amount) || 0,
            reference_number: distribution.reference,
            reason: "Branch Distribution Rejection",
            notes:
              `Distribution rejected by branch: ${rejectionData.rejection_reason || ""}. ${rejectionData.rejection_notes || ""}`.trim(),
            performed_by: rejectionData.rejected_by || "Branch Manager",
            transaction_date: db.fn.now(),
            adjustment_type: "rejection",
            audit_action: "distribution_rejected",
          });
        } else if (item.source === "production") {
          // For production items, we need to find the corresponding inventory_item_id
          // since production_inventory doesn't directly map to inventory_transactions
          const productionItem = await trx("production_inventory")
            .where("id", item.item_ref_id)
            .first();

          if (productionItem && productionItem.inventory_item_id) {
            await trx("inventory_transactions").insert({
              inventory_item_id: productionItem.inventory_item_id,
              transaction_type: "adjustment",
              quantity: parseFloat(item.qty),
              unit_cost: parseFloat(item.unit_price) || 0,
              total_value: parseFloat(item.amount) || 0,
              reference_number: distribution.reference,
              reason: "Branch Distribution Rejection",
              notes:
                `Distribution rejected by branch: ${rejectionData.rejection_reason || ""}. ${rejectionData.rejection_notes || ""}`.trim(),
              performed_by: rejectionData.rejected_by || "Branch Manager",
              transaction_date: db.fn.now(),
              adjustment_type: "rejection",
              audit_action: "distribution_rejected",
            });
          }
        }

        // Log branch-level transaction to show the rejection in branch history
        await trx("branch_inventory_transactions").insert({
          branch_id: distribution.branch_id,
          inventory_item_id: null,
          item_name: item.name,
          item_type: item.source,
          transaction_type: "rejection",
          quantity: parseFloat(item.qty),
          unit_of_measure: item.unit,
          reference_number: distribution.reference,
          notes:
            `Distribution rejected: ${rejectionData.rejection_reason || ""}`.trim(),
          performed_by: rejectionData.performed_by_id || null,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        });
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

      // Return updated distribution (query outside transaction to ensure fresh data)
      const updatedDistribution = await this.findByIdWithItems(id);
      return updatedDistribution;
    });
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

      // Deduct items from main inventory and add to branch inventory
      for (const item of items) {
        // Deduct from main inventory first
        if (item.source === "scm") {
          // Use centralized inventory update so quantity and logs stay in sync
          await Inventory.updateInventoryQuantity(
            item.item_ref_id,
            {
              transaction_type: "adjustment",
              adjustment_type: "reduce_quantity",
              quantity: parseFloat(item.qty),
              reference_number: distribution.reference,
              reason: "Branch Distribution",
              notes: `Transferred to branch ${distribution.branch_name || distribution.branch_id}`,
              performed_by: completionData.completed_by || "Branch Manager",
              transaction_date: new Date(),
              audit_action: "transfer_out",
            },
            trx
          );
        } else if (item.source === "production") {
          // Get current production inventory to compute old/new quantities for audit
          const prodInv = await trx("production_inventory")
            .where("id", item.item_ref_id)
            .first();

          if (prodInv) {
            const oldQty = Number(prodInv.available_quantity) || 0;
            const distributeQty = Number(item.qty) || 0;
            const newQty = oldQty - distributeQty;

            // Update explicitly so we can pass old/new to audit
            await trx("production_inventory")
              .where("id", item.item_ref_id)
              .update({
                available_quantity: newQty,
                updated_at: db.fn.now(),
              });

            // Write menu_item_audit_log so this appears in Recent Activity/Audit Logs
            const note = `Distributed ${distributeQty} units to branch ${distribution.branch_name || distribution.branch_id} - Receipt: ${distribution.reference}`;
            await ProductionInventory.logStockUpdate(
              item.item_ref_id,
              oldQty,
              newQty,
              completionData.performed_by_id || null,
              note,
              trx
            );

            // If production inventory links to an SCM inventory item, log that transaction, too
            try {
              if (prodInv.inventory_item_id) {
                await Inventory.updateInventoryQuantity(
                  prodInv.inventory_item_id,
                  {
                    transaction_type: "adjustment",
                    adjustment_type: "reduce_quantity",
                    quantity: distributeQty,
                    reference_number: distribution.reference,
                    reason: "Branch Distribution",
                    notes: `Transferred to branch ${distribution.branch_name || distribution.branch_id}`,
                    performed_by:
                      completionData.completed_by || "Branch Manager",
                    transaction_date: new Date(),
                    audit_action: "transfer_out",
                  },
                  trx
                );
              }
            } catch (txErr) {
              console.error(
                "Failed to log Production transfer transaction:",
                txErr
              );
            }
          }
        }
        // Check if item already exists in branch inventory by name and type
        const existingItem = await trx("branch_inventory")
          .where({
            item_name: item.name,
            item_type: item.source,
            branch_id: distribution.branch_id,
          })
          .first();

        if (existingItem && existingItem.status !== "disposed") {
          // Update existing item
          await trx("branch_inventory")
            .where("id", existingItem.id)
            .update({
              quantity: db.raw(`quantity + ${item.qty}`),
              total_value: db.raw(`total_value + ${item.amount}`),
              updated_at: db.fn.now(),
            });

          // Log branch inventory transaction for distribution
          await trx("branch_inventory_transactions").insert({
            branch_id: distribution.branch_id,
            inventory_item_id: existingItem.id,
            item_name: existingItem.item_name || item.name,
            item_type: item.source,
            transaction_type: "distribution",
            quantity: parseFloat(item.qty),
            unit_of_measure: item.unit,
            reference_number: distribution.reference,
            notes: "Distribution completed",
            performed_by: completionData.performed_by_id || null,
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          });
        } else {
          // Create new branch inventory item
          const [created] = await trx("branch_inventory")
            .insert({
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
            })
            .returning(["id", "item_name"]);

          const createdId = Array.isArray(created)
            ? created[0]?.id || created[0]
            : created?.id || created;

          // Log branch inventory transaction for distribution
          await trx("branch_inventory_transactions").insert({
            branch_id: distribution.branch_id,
            inventory_item_id: createdId || null,
            item_name: (created && created.item_name) || item.name,
            item_type: item.source,
            transaction_type: "distribution",
            quantity: parseFloat(item.qty),
            unit_of_measure: item.unit,
            reference_number: distribution.reference,
            notes: "Distribution completed",
            performed_by: completionData.performed_by_id || null,
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          });
        }
      }

      // Update distribution status to completed and optionally save received proof
      await trx("branch_distributions")
        .where("id", id)
        .update({
          status: "completed",
          completed_by: completionData.completed_by,
          completed_at: db.fn.now(),
          received_proof_html:
            completionData.received_proof_html || db.raw("received_proof_html"),
          updated_at: db.fn.now(),
        });

      await trx.commit();

      // Return updated distribution
      const updatedDistribution = await this.findByIdWithItems(id);

      // Auto-complete the latest related branch request for this branch
      try {
        const latestPendingRequest = await db("branch_requests")
          .where("branch_id", distribution.branch_id)
          .whereIn("status", ["In Progress", "Acknowledged"])
          .whereNull("deleted_at")
          .orderBy("created_at", "desc")
          .first();

        if (latestPendingRequest) {
          await BranchRequest.updateStatus(
            latestPendingRequest.id,
            "Completed",
            completionData.completed_by || "System",
            `Auto-completed via distribution ${distribution.reference}`
          );
        }
      } catch (autoErr) {
        console.warn(
          "Auto-complete of related branch request failed:",
          autoErr
        );
      }

      return updatedDistribution;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Acknowledge a rejected distribution
   * @param {number} id - Distribution ID
   * @param {Object} acknowledgmentData - Acknowledgment details
   * @param {string} acknowledgmentData.acknowledged_by - User who acknowledged
   * @param {string} acknowledgmentData.acknowledgment_notes - Optional notes
   * @returns {Promise<Object>} Updated distribution
   */
  static async acknowledgeRejection(id, acknowledgmentData) {
    const updateData = {
      acknowledged_by: acknowledgmentData.acknowledged_by,
      acknowledged_at: db.fn.now(),
      acknowledgment_notes: acknowledgmentData.acknowledgment_notes,
      updated_at: db.fn.now(),
    };

    const result = await db("branch_distributions")
      .where("id", id)
      .where("status", "rejected")
      .update(updateData);

    if (result > 0) {
      return await this.findByIdWithItems(id);
    }

    throw new Error("Distribution not found or not in rejected status");
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
   * Partially accept/reject a distribution with item-level selection
   * @param {number} id - Distribution ID
   * @param {Object} actionData - Action details
   * @param {string} actionData.action_by - User performing the action
   * @param {Array} actionData.accepted_items - Array of item IDs to accept
   * @param {Array} actionData.rejected_items - Array of objects with item IDs and rejection reasons
   * @param {string} actionData.notes - Optional notes about the partial action
   * @returns {Promise<Object>} Updated distribution and new partial distribution if applicable
   */
  static async partialAcceptReject(id, actionData) {
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
        throw new Error(
          "Only delivered distributions can be partially processed"
        );
      }

      // Get all distribution items
      const allItems = await trx("branch_distribution_items").where(
        "distribution_id",
        id
      );

      // Validate that all items are accounted for
      const allItemIds = allItems.map((item) => item.id);
      const acceptedItemIds = actionData.accepted_items || [];
      const rejectedItemIds =
        actionData.rejected_items.map((item) => item.item_id) || [];
      const processedItemIds = [...acceptedItemIds, ...rejectedItemIds];

      console.log("Debug - All item IDs:", allItemIds);
      console.log("Debug - Accepted item IDs:", acceptedItemIds);
      console.log("Debug - Rejected item IDs:", rejectedItemIds);
      console.log("Debug - Processed item IDs:", processedItemIds);

      // Check if all items are accounted for
      const unprocessedItems = allItemIds.filter(
        (id) => !processedItemIds.includes(id)
      );
      if (unprocessedItems.length > 0) {
        throw new Error(
          `Some items are not processed: ${unprocessedItems.join(", ")}`
        );
      }

      // Check for duplicates
      const duplicateAccepted = acceptedItemIds.filter((id) =>
        rejectedItemIds.includes(id)
      );
      if (duplicateAccepted.length > 0) {
        throw new Error(
          `Items cannot be both accepted and rejected: ${duplicateAccepted.join(", ")}`
        );
      }

      const results = {
        originalDistribution: null,
        newDistribution: null,
        rejectedItems: [],
      };

      // If there are accepted items, create a new distribution for them
      if (acceptedItemIds.length > 0) {
        try {
          console.log(
            "Debug - Processing accepted items, count:",
            acceptedItemIds.length
          );
          const acceptedItems = allItems.filter((item) =>
            acceptedItemIds.includes(item.id)
          );
          console.log(
            "Debug - Accepted items found:",
            acceptedItems.map((item) => ({
              id: item.id,
              name: item.name,
              qty: item.qty,
            }))
          );

          // Calculate new total amount for accepted items
          const newTotalAmount = acceptedItems.reduce(
            (sum, item) => sum + parseFloat(item.amount || 0),
            0
          );

          // Create new distribution for accepted items
          const newReference = await this.generateReference(trx);
          const newDistributionResult = await trx(
            "branch_distributions"
          ).insert({
            reference: newReference,
            branch_id: distribution.branch_id,
            prepared_by: distribution.prepared_by,
            total_amount: newTotalAmount,
            notes:
              `Partial acceptance from ${distribution.reference}. ${actionData.notes || ""}`.trim(),
            status: "completed",
            completed_by: actionData.action_by,
            completed_at: db.fn.now(),
            parent_distribution_id: id, // Track the original distribution
          });

          let newDistributionId;
          if (Array.isArray(newDistributionResult)) {
            newDistributionId = newDistributionResult[0];
          } else if (
            newDistributionResult &&
            typeof newDistributionResult === "object" &&
            "id" in newDistributionResult
          ) {
            newDistributionId = newDistributionResult.id;
          } else {
            const latest = await trx("branch_distributions")
              .select("id")
              .where({ reference: newReference })
              .orderBy("id", "desc")
              .first();
            newDistributionId = latest?.id;
          }

          // Create new distribution items for accepted items
          const newDistributionItems = acceptedItems.map((item) => ({
            distribution_id: newDistributionId,
            source: item.source,
            item_ref_id: item.item_ref_id,
            name: item.name,
            unit: item.unit,
            qty: item.qty,
            unit_price: item.unit_price,
            amount: item.amount,
            category: item.category,
            expiry_date: item.expiry_date,
            notes: item.notes,
            original_item_id: item.id, // Track the original item
          }));

          await trx("branch_distribution_items").insert(newDistributionItems);

          // Deduct accepted items from main inventory and add to branch inventory
          console.log(
            "Debug - Processing accepted items, count:",
            acceptedItems.length
          );
          for (const item of acceptedItems) {
            console.log("Debug - Processing accepted item:", {
              name: item.name,
              qty: item.qty,
              source: item.source,
              item_ref_id: item.item_ref_id,
            });

            // Deduct from main inventory first
            if (item.source === "scm") {
              console.log(
                "Debug - Deducting from SCM inventory, item_ref_id:",
                item.item_ref_id,
                "quantity:",
                item.qty
              );
              await trx("inventory_items")
                .where("id", item.item_ref_id)
                .decrement("quantity", item.qty);
            } else if (item.source === "production") {
              console.log(
                "Debug - Deducting from Production inventory, item_ref_id:",
                item.item_ref_id,
                "quantity:",
                item.qty
              );
              await trx("production_inventory")
                .where("id", item.item_ref_id)
                .decrement("available_quantity", item.qty);
            }
            const existingItem = await trx("branch_inventory")
              .where({
                item_name: item.name,
                item_type: item.source,
                branch_id: distribution.branch_id,
              })
              .first();

            if (existingItem && existingItem.status !== "disposed") {
              // Update existing item
              console.log(
                "Debug - Updating existing branch inventory item:",
                existingItem.id
              );
              // Update selling price for SCM beverages if not already set
              const updateData = {
                quantity: db.raw(`quantity + ${item.qty}`),
                total_value: db.raw(`total_value + ${item.amount}`),
                updated_at: db.fn.now(),
              };

              // Set selling price for SCM beverages if not already set (use unit_cost as transfer price)
              if (
                item.source === "scm" &&
                item.category === "Beverages" &&
                !existingItem.selling_price
              ) {
                updateData.selling_price = item.unit_price; // This is the transfer price from distribution modal
              }

              await trx("branch_inventory")
                .where("id", existingItem.id)
                .update(updateData);
              console.log("Debug - Branch inventory item updated successfully");
            } else {
              // Create new branch inventory item
              console.log(
                "Debug - Creating new branch inventory item for:",
                item.name
              );
              await trx("branch_inventory").insert({
                item_name: item.name,
                item_type: item.source,
                category: item.category || "Distributed",
                quantity: item.qty,
                unit: item.unit,
                unit_cost: item.unit_price,
                selling_price:
                  item.source === "production" && item.menu_selling_price
                    ? item.menu_selling_price
                    : item.source === "scm" && item.category === "Beverages"
                      ? item.unit_price // Use unit_cost (transfer price) as selling price for SCM beverages
                      : null,
                total_value: item.amount,
                minimum_stock: Math.ceil(item.qty * 0.15),
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
              console.log(
                "Debug - New branch inventory item created successfully"
              );
            }
          }

          // Get the created new distribution with items
          console.log(
            "Debug - Created new distribution with ID:",
            newDistributionId
          );

          // Check if the distribution exists in the database
          const checkDistribution = await trx("branch_distributions")
            .where("id", newDistributionId)
            .first();
          console.log(
            "Debug - Distribution exists in database:",
            !!checkDistribution
          );

          results.newDistribution =
            await this.findByIdWithItems(newDistributionId);
          console.log(
            "Debug - New distribution retrieved:",
            !!results.newDistribution
          );
        } catch (error) {
          console.error("Debug - Error processing accepted items:", error);
          throw error;
        }
      } else {
        console.log("Debug - No accepted items to process");
      }

      // Process rejected items
      if (actionData.rejected_items && actionData.rejected_items.length > 0) {
        const rejectedItems = allItems.filter((item) =>
          actionData.rejected_items.some(
            (rejected) => rejected.item_id === item.id
          )
        );

        // Return quantities to main inventory for rejected items
        for (const item of rejectedItems) {
          const rejectionReason = actionData.rejected_items.find(
            (r) => r.item_id === item.id
          );

          console.log("Debug - Rejecting item:", {
            item_id: item.id,
            name: item.name,
            item_ref_id: item.item_ref_id,
            qty: item.qty,
            source: item.source,
          });

          // Record rejection in the dedicated rejections table
          await trx("branch_distribution_rejections").insert({
            distribution_id: id,
            distribution_item_id: item.id,
            rejected_by: actionData.action_by || "Branch Manager",
            rejected_at: db.fn.now(),
            rejection_reason: rejectionReason.reason,
            rejection_notes: rejectionReason.notes || null,
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          });

          // Also record in inventory transaction history for tracking
          if (item.source === "scm") {
            console.log(
              "Debug - Recording SCM rejection notification, item_ref_id:",
              item.item_ref_id
            );
            await trx("inventory_transactions").insert({
              inventory_item_id: item.item_ref_id,
              transaction_type: "adjustment",
              quantity: parseFloat(item.qty),
              unit_cost: parseFloat(item.unit_price) || 0,
              total_value: parseFloat(item.amount) || 0,
              reference_number: distribution.reference,
              reason: "Branch Distribution Rejection",
              notes:
                `Item rejected by branch: ${rejectionReason.reason}. ${rejectionReason.notes || ""}`.trim(),
              performed_by: actionData.action_by || "Branch Manager",
              transaction_date: db.fn.now(),
              adjustment_type: "rejection",
              audit_action: "distribution_rejected",
            });
          } else if (item.source === "production") {
            console.log(
              "Debug - Recording Production rejection notification, item_ref_id:",
              item.item_ref_id
            );
            // For production items, we need to find the corresponding inventory_item_id
            // since production_inventory doesn't directly map to inventory_transactions
            const productionItem = await trx("production_inventory")
              .where("id", item.item_ref_id)
              .first();

            if (productionItem && productionItem.inventory_item_id) {
              await trx("inventory_transactions").insert({
                inventory_item_id: productionItem.inventory_item_id,
                transaction_type: "adjustment",
                quantity: parseFloat(item.qty),
                unit_cost: parseFloat(item.unit_price) || 0,
                total_value: parseFloat(item.amount) || 0,
                reference_number: distribution.reference,
                reason: "Branch Distribution Rejection",
                notes:
                  `Item rejected by branch: ${rejectionReason.reason}. ${rejectionReason.notes || ""}`.trim(),
                performed_by: actionData.action_by || "Branch Manager",
                transaction_date: db.fn.now(),
                adjustment_type: "rejection",
                audit_action: "distribution_rejected",
              });
            }
          }

          results.rejectedItems.push({
            ...item,
            rejection_reason: rejectionReason.reason,
            rejection_notes: rejectionReason.notes,
          });
        }
      }

      // Update original distribution status to "partially_processed"
      await trx("branch_distributions").where("id", id).update({
        status: "partially_processed",
        processed_by: actionData.action_by,
        processed_at: db.fn.now(),
        processing_notes: actionData.notes,
        updated_at: db.fn.now(),
      });

      await trx.commit();

      // Get updated original distribution
      results.originalDistribution = await this.findByIdWithItems(id);

      return results;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
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
