const { db } = require("../config/database");

class BranchInventoryTransaction {
  static async create(tx) {
    const [row] = await db("branch_inventory_transactions")
      .insert({
        branch_id: tx.branch_id,
        inventory_item_id: tx.inventory_item_id || null,
        item_name: tx.item_name,
        item_type: tx.item_type,
        transaction_type: tx.transaction_type,
        quantity: tx.quantity,
        unit_of_measure: tx.unit_of_measure,
        reference_number: tx.reference_number || null,
        notes: tx.notes || null,
        performed_by: tx.performed_by || null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning("*");
    return row;
  }

  static async list(branchId, filters = {}, pagination = {}) {
    // Build base query without ordering for counting; include employee name
    let base = db("branch_inventory_transactions as t")
      .leftJoin("employees as e", "t.performed_by", "e.id")
      .where("t.branch_id", branchId)
      .whereNull("t.deleted_at")
      .select(
        "t.*",
        db.raw("concat(e.first_name,' ',e.last_name) as performed_by_name")
      );

    if (filters.transaction_type) {
      base = base.where("t.transaction_type", filters.transaction_type);
    }
    if (filters.search) {
      base = base.whereILike("t.item_name", `%${filters.search}%`);
    }
    if (filters.date_from) {
      base = base.where("t.created_at", ">=", filters.date_from);
    }
    if (filters.date_to) {
      base = base.where("t.created_at", "<=", filters.date_to);
    }

    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const offset = (page - 1) * limit;

    // Apply ordering only to the rows query
    const rows = await base
      .clone()
      .orderBy("t.created_at", "desc")
      .limit(limit)
      .offset(offset);
    // Count without ordering
    const [{ count }] = await base
      .clone()
      .clearSelect()
      .clearOrder()
      .count("* as count");

    return {
      data: rows,
      total: parseInt(count) || 0,
      page,
      totalPages: Math.ceil((parseInt(count) || 0) / limit) || 1,
    };
  }
}

module.exports = BranchInventoryTransaction;
