/**
 * UtilitiesExpense Model
 * Handles Finance-recorded utility expenses for branches and departments
 */

const { db } = require("../config/database");
const { formatForDatabase } = require("../utils/timezoneUtils");

class UtilitiesExpense {
  /**
   * Create a new utilities expense entry
   * @param {Object} data - Expense data
   * @returns {Promise<Object>} Created expense
   */
  static async create(data) {
    const expenseData = {
      entity_type: data.entity_type,
      entity_id: data.entity_id || null,
      department: data.department || null,
      entity_name: data.entity_name,
      expense_type: data.expense_type,
      expense_description: data.expense_description || null,
      amount: data.amount,
      expense_month: data.expense_month,
      notes: data.notes || null,
      receipt_url: data.receipt_url || null,
      recorded_by: data.recorded_by,
      created_at: formatForDatabase(new Date()),
      updated_at: formatForDatabase(new Date()),
    };

    const [insertedRow] = await db("utilities_expenses")
      .insert(expenseData)
      .returning("id");
    return this.getById(insertedRow.id);
  }

  /**
   * Get expense by ID
   * @param {number} id - Expense ID
   * @returns {Promise<Object|null>} Expense data
   */
  static async getById(id) {
    const expense = await db("utilities_expenses")
      .select(
        "ue.*",
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as recorded_by_name"),
        "b.name as branch_name"
      )
      .from("utilities_expenses as ue")
      .leftJoin("employees as e", "ue.recorded_by", "e.id")
      .leftJoin("branches as b", "ue.entity_id", "b.id")
      .where("ue.id", id)
      .whereNull("ue.deleted_at")
      .first();

    return expense;
  }

  /**
   * List expenses with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} List result with pagination
   */
  static async list(filters = {}) {
    const {
      entity_type,
      entity_id,
      department,
      expense_type,
      expense_month,
      limit = 20,
      offset = 0,
    } = filters;

    let query = db("utilities_expenses as ue")
      .select(
        "ue.*",
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as recorded_by_name"),
        "b.name as branch_name"
      )
      .leftJoin("employees as e", "ue.recorded_by", "e.id")
      .leftJoin("branches as b", "ue.entity_id", "b.id")
      .whereNull("ue.deleted_at");

    // Apply filters
    if (entity_type) {
      query = query.where("ue.entity_type", entity_type);
    }
    if (entity_id) {
      query = query.where("ue.entity_id", entity_id);
    }
    if (department) {
      query = query.where("ue.department", department);
    }
    if (expense_type) {
      query = query.where("ue.expense_type", expense_type);
    }
    if (expense_month) {
      query = query.where("ue.expense_month", expense_month);
    }

    // Get total count (separate query)
    const countQuery = db("utilities_expenses as ue")
      .leftJoin("employees as e", "ue.recorded_by", "e.id")
      .leftJoin("branches as b", "ue.entity_id", "b.id")
      .whereNull("ue.deleted_at");

    // Apply same filters to count query
    if (entity_type) {
      countQuery.where("ue.entity_type", entity_type);
    }
    if (entity_id) {
      countQuery.where("ue.entity_id", entity_id);
    }
    if (department) {
      countQuery.where("ue.department", department);
    }
    if (expense_type) {
      countQuery.where("ue.expense_type", expense_type);
    }
    if (expense_month) {
      countQuery.where("ue.expense_month", expense_month);
    }

    const { total } = await countQuery.count("* as total").first();

    // Get paginated results
    const expenses = await query
      .orderBy("ue.created_at", "desc")
      .limit(limit)
      .offset(offset);

    return {
      expenses,
      total: parseInt(total),
      limit,
      offset,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Update expense entry
   * @param {number} id - Expense ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated expense
   */
  static async update(id, data) {
    const updateData = {
      ...data,
      updated_at: formatForDatabase(new Date()),
    };

    await db("utilities_expenses")
      .where("id", id)
      .whereNull("deleted_at")
      .update(updateData);

    return this.getById(id);
  }

  /**
   * Soft delete expense
   * @param {number} id - Expense ID
   * @returns {Promise<boolean>} Success status
   */
  static async softDelete(id) {
    const result = await db("utilities_expenses")
      .where("id", id)
      .whereNull("deleted_at")
      .update({
        deleted_at: formatForDatabase(new Date()),
        updated_at: formatForDatabase(new Date()),
      });

    return result > 0;
  }

  /**
   * Get expenses for specific entity/month
   * @param {string} entityType - 'branch' or 'department'
   * @param {number} entityId - Entity ID (for branches)
   * @param {string} department - Department name (for departments)
   * @param {string} month - Month in YYYY-MM format
   * @returns {Promise<Array>} Expenses for the period
   */
  static async getByMonth(entityType, entityId, department, month) {
    let query = db("utilities_expenses")
      .select("*")
      .where("entity_type", entityType)
      .where("expense_month", month)
      .whereNull("deleted_at");

    if (entityType === "branch" && entityId) {
      query = query.where("entity_id", entityId);
    } else if (entityType === "department" && department) {
      query = query.where("department", department);
    }

    return query.orderBy("created_at", "desc");
  }

  /**
   * Get totals by period with filters
   * @param {string} dateFrom - Start date
   * @param {string} dateTo - End date
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Aggregated totals
   */
  static async getTotalsByPeriod(dateFrom, dateTo, filters = {}) {
    let query = db("utilities_expenses")
      .select(
        "entity_type",
        "entity_id",
        "department",
        "expense_type",
        db.raw("SUM(amount) as total_amount"),
        db.raw("COUNT(*) as expense_count")
      )
      .whereBetween("expense_month", [dateFrom, dateTo])
      .whereNull("deleted_at")
      .groupBy("entity_type", "entity_id", "department", "expense_type");

    // Apply additional filters
    if (filters.entity_type) {
      query = query.where("entity_type", filters.entity_type);
    }
    if (filters.entity_id) {
      query = query.where("entity_id", filters.entity_id);
    }
    if (filters.department) {
      query = query.where("department", filters.department);
    }

    const results = await query;

    // Calculate overall totals
    const totalAmount = results.reduce(
      (sum, row) => sum + parseFloat(row.total_amount || 0),
      0
    );
    const totalCount = results.reduce(
      (sum, row) => sum + parseInt(row.expense_count || 0),
      0
    );

    return {
      results,
      total_amount: totalAmount,
      total_count: totalCount,
    };
  }
}

module.exports = UtilitiesExpense;
