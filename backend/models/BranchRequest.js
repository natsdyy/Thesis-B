// backend/models/BranchRequest.js
const { db } = require("../config/database");

class BranchRequest {
  // Get all branch requests with optional filters
  static async getAll(filters = {}) {
    try {
      let query = db("branch_requests as br")
        .leftJoin("branches as b", "br.branch_id", "b.id")
        .leftJoin(
          "branch_request_items as bri",
          "br.id",
          "bri.branch_request_id"
        )
        .select(
          "br.*",
          "b.name as branch_name",
          db.raw("COUNT(bri.id) as item_count")
        )
        .groupBy(
          "br.id",
          "br.request_id",
          "br.request_type",
          "br.request_description",
          "br.request_date",
          "br.priority",
          "br.branch_id",
          "br.requested_by",
          "br.source_type",
          "br.status",
          "br.main_office_notes",
          "br.acknowledged_by",
          "br.acknowledged_at",
          "br.completed_by",
          "br.completed_at",
          "br.cancelled_by",
          "br.cancelled_at",
          "br.created_at",
          "br.updated_at",
          "br.deleted_at",
          "b.name"
        )
        .whereNull("br.deleted_at");

      // Apply filters
      if (filters.branch_id) {
        query = query.where("br.branch_id", filters.branch_id);
      }

      if (filters.status) {
        query = query.where("br.status", filters.status);
      }

      if (filters.source_type) {
        query = query.where("br.source_type", filters.source_type);
      }

      if (filters.date) {
        query = query.where("br.request_date", filters.date);
      }

      if (filters.dateFrom && filters.dateTo) {
        query = query.whereBetween("br.request_date", [
          filters.dateFrom,
          filters.dateTo,
        ]);
      }

      if (filters.priority) {
        query = query.where("br.priority", filters.priority);
      }

      if (filters.search) {
        query = query.where(function () {
          this.where("br.request_description", "ilike", `%${filters.search}%`)
            .orWhere("br.request_id", "like", `%${filters.search}%`)
            .orWhere("br.requested_by", "ilike", `%${filters.search}%`);
        });
      }

      const requests = await query.orderBy("br.created_at", "desc");
      return requests;
    } catch (error) {
      console.error("Error fetching branch requests:", error);
      throw new Error("Failed to retrieve branch requests from database");
    }
  }

  // Get branch request by ID with items
  static async getById(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid branch request ID provided");
      }

      const request = await db("branch_requests as br")
        .leftJoin("branches as b", "br.branch_id", "b.id")
        .select("br.*", "b.name as branch_name")
        .where("br.id", id)
        .whereNull("br.deleted_at")
        .first();

      if (!request) {
        return null;
      }

      // Get request items
      const items = await db("branch_request_items")
        .where("branch_request_id", id)
        .orderBy("item_number");

      return {
        ...request,
        items,
      };
    } catch (error) {
      console.error("Error fetching branch request:", error);
      throw new Error("Failed to retrieve branch request from database");
    }
  }

  // Get branch request by request_id with items
  static async getByRequestId(requestId) {
    try {
      if (!requestId) {
        throw new Error("Invalid request ID provided");
      }

      const request = await db("branch_requests as br")
        .leftJoin("branches as b", "br.branch_id", "b.id")
        .select("br.*", "b.name as branch_name")
        .where("br.request_id", requestId)
        .whereNull("br.deleted_at")
        .first();

      if (!request) {
        return null;
      }

      // Get request items
      const items = await db("branch_request_items")
        .where("branch_request_id", request.id)
        .orderBy("item_number");

      return {
        ...request,
        items,
      };
    } catch (error) {
      console.error("Error fetching branch request by request_id:", error);
      throw new Error("Failed to retrieve branch request from database");
    }
  }

  // Create new branch request with items
  static async create(requestData, items) {
    const trx = await db.transaction();

    try {
      // Generate unique request_id
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
      const requestId = `BR-${dateStr}-${Date.now().toString().slice(-3)}`;

      // Create branch request
      const [branchRequest] = await trx("branch_requests")
        .insert({
          request_id: requestId,
          request_type: requestData.request_type,
          request_description: requestData.request_description,
          request_date: requestData.request_date,
          priority: requestData.priority || "Normal",
          branch_id: requestData.branch_id,
          requested_by: requestData.requested_by,
          source_type: requestData.source_type || "scm",
          status: "Draft",
        })
        .returning("*");

      // Create branch request items
      const itemsToInsert = items.map((item, index) => ({
        branch_request_id: branchRequest.id,
        item_number: index + 1,
        item_name: item.item_name,
        item_quantity: item.item_quantity,
        item_unit: item.item_unit || "pieces",
        item_type: item.item_type || "General",
        item_notes: item.item_notes || null,
        inventory_item_id: item.inventory_item_id || null,
        unit_price: item.unit_price || null,
        category: item.category || null,
        menu_item_id: item.menu_item_id || null, // optional linkage for production items
      }));

      const createdItems = await trx("branch_request_items")
        .insert(itemsToInsert)
        .returning("*");

      await trx.commit();

      return {
        ...branchRequest,
        items: createdItems,
      };
    } catch (error) {
      await trx.rollback();
      console.error("Error creating branch request:", error);
      throw new Error("Failed to create branch request");
    }
  }

  // Update branch request
  static async update(id, requestData, items = null) {
    const trx = await db.transaction();

    try {
      // Update branch request
      const updateData = { ...requestData };

      const [updatedRequest] = await trx("branch_requests")
        .where("id", id)
        .update(updateData)
        .returning("*");

      if (!updatedRequest) {
        throw new Error("Branch request not found");
      }

      // Update items if provided
      if (items) {
        // Delete existing items
        await trx("branch_request_items").where("branch_request_id", id).del();

        // Insert new items
        const itemsToInsert = items.map((item, index) => ({
          branch_request_id: id,
          item_number: index + 1,
          item_name: item.item_name,
          item_quantity: item.item_quantity,
          item_unit: item.item_unit || "pieces",
          item_type: item.item_type || "General",
          item_notes: item.item_notes || null,
          inventory_item_id: item.inventory_item_id || null,
          unit_price: item.unit_price || null,
          category: item.category || null,
          menu_item_id: item.menu_item_id || null,
        }));

        const createdItems = await trx("branch_request_items")
          .insert(itemsToInsert)
          .returning("*");

        await trx.commit();

        return {
          ...updatedRequest,
          items: createdItems,
        };
      }

      await trx.commit();
      return updatedRequest;
    } catch (error) {
      await trx.rollback();
      console.error("Error updating branch request:", error);
      throw new Error("Failed to update branch request");
    }
  }

  // Update request status
  static async updateStatus(id, status, updatedBy, notes = null) {
    try {
      const updateData = {
        status: status,
        updated_at: new Date(),
      };

      // Add status-specific fields
      switch (status) {
        case "Sent":
          // No additional fields needed
          break;
        case "Acknowledged":
          updateData.acknowledged_by = updatedBy;
          updateData.acknowledged_at = new Date();
          if (notes) updateData.main_office_notes = notes;
          break;
        case "In Progress":
          if (notes) updateData.main_office_notes = notes;
          break;
        case "Completed":
          updateData.completed_by = updatedBy;
          updateData.completed_at = new Date();
          if (notes) updateData.main_office_notes = notes;
          break;
        case "Cancelled":
          updateData.cancelled_by = updatedBy;
          updateData.cancelled_at = new Date();
          break;
      }

      const [updatedRequest] = await db("branch_requests")
        .where("id", id)
        .update(updateData)
        .returning("*");

      return updatedRequest;
    } catch (error) {
      console.error("Error updating branch request status:", error);
      throw new Error("Failed to update branch request status");
    }
  }

  // Delete branch request (soft delete)
  static async delete(id) {
    try {
      const [deletedRequest] = await db("branch_requests")
        .where("id", id)
        .update({
          deleted_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      return deletedRequest;
    } catch (error) {
      console.error("Error deleting branch request:", error);
      throw new Error("Failed to delete branch request");
    }
  }

  // Get requests by status
  static async getByStatus(status) {
    try {
      const requests = await db("branch_requests as br")
        .leftJoin("branches as b", "br.branch_id", "b.id")
        .leftJoin(
          "branch_request_items as bri",
          "br.id",
          "bri.branch_request_id"
        )
        .select(
          "br.*",
          "b.name as branch_name",
          db.raw("COUNT(bri.id) as item_count")
        )
        .where("br.status", status)
        .whereNull("br.deleted_at")
        .groupBy(
          "br.id",
          "br.request_id",
          "br.request_type",
          "br.request_description",
          "br.request_date",
          "br.priority",
          "br.branch_id",
          "br.requested_by",
          "br.source_type",
          "br.status",
          "br.main_office_notes",
          "br.acknowledged_by",
          "br.acknowledged_at",
          "br.completed_by",
          "br.completed_at",
          "br.cancelled_by",
          "br.cancelled_at",
          "br.created_at",
          "br.updated_at",
          "br.deleted_at",
          "b.name"
        )
        .orderBy("br.created_at", "desc");

      return requests;
    } catch (error) {
      console.error("Error fetching branch requests by status:", error);
      throw new Error("Failed to retrieve branch requests by status");
    }
  }

  // Get requests by branch
  static async getByBranch(branchId, filters = {}) {
    try {
      let query = db("branch_requests as br")
        .leftJoin("branches as b", "br.branch_id", "b.id")
        .leftJoin(
          "branch_request_items as bri",
          "br.id",
          "bri.branch_request_id"
        )
        .select(
          "br.*",
          "b.name as branch_name",
          db.raw("COUNT(bri.id) as item_count")
        )
        .where("br.branch_id", branchId)
        .whereNull("br.deleted_at")
        .groupBy(
          "br.id",
          "br.request_id",
          "br.request_type",
          "br.request_description",
          "br.request_date",
          "br.priority",
          "br.branch_id",
          "br.requested_by",
          "br.source_type",
          "br.status",
          "br.main_office_notes",
          "br.acknowledged_by",
          "br.acknowledged_at",
          "br.completed_by",
          "br.completed_at",
          "br.cancelled_by",
          "br.cancelled_at",
          "br.created_at",
          "br.updated_at",
          "br.deleted_at",
          "b.name"
        );

      // Apply additional filters
      if (filters.status) {
        query = query.where("br.status", filters.status);
      }

      if (filters.source_type) {
        query = query.where("br.source_type", filters.source_type);
      }

      if (filters.dateFrom && filters.dateTo) {
        query = query.whereBetween("br.request_date", [
          filters.dateFrom,
          filters.dateTo,
        ]);
      }

      if (filters.search) {
        query = query.where(function () {
          this.where("br.request_description", "ilike", `%${filters.search}%`)
            .orWhere("br.request_id", "like", `%${filters.search}%`)
            .orWhere("br.requested_by", "ilike", `%${filters.search}%`);
        });
      }

      const requests = await query.orderBy("br.created_at", "desc");
      return requests;
    } catch (error) {
      console.error("Error fetching branch requests by branch:", error);
      throw new Error("Failed to retrieve branch requests by branch");
    }
  }

  // Get branch requests with items for SCM view
  static async getAllWithItems(filters = {}) {
    try {
      let query = db("branch_requests as br")
        .leftJoin("branches as b", "br.branch_id", "b.id")
        .select("br.*", "b.name as branch_name")
        .whereNull("br.deleted_at");

      // Apply filters
      if (filters.branch_id) {
        query = query.where("br.branch_id", filters.branch_id);
      }

      if (filters.status) {
        query = query.where("br.status", filters.status);
      }

      if (filters.source_type) {
        query = query.where("br.source_type", filters.source_type);
      }

      if (filters.date) {
        query = query.where("br.request_date", filters.date);
      }

      if (filters.dateFrom && filters.dateTo) {
        query = query.whereBetween("br.request_date", [
          filters.dateFrom,
          filters.dateTo,
        ]);
      }

      if (filters.priority) {
        query = query.where("br.priority", filters.priority);
      }

      if (filters.search) {
        query = query.where(function () {
          this.where("br.request_description", "ilike", `%${filters.search}%`)
            .orWhere("br.request_id", "like", `%${filters.search}%`)
            .orWhere("br.requested_by", "ilike", `%${filters.search}%`);
        });
      }

      const requests = await query.orderBy("br.created_at", "desc");

      // Get items for each request
      const requestsWithItems = await Promise.all(
        requests.map(async (request) => {
          const items = await db("branch_request_items")
            .where("branch_request_id", request.id)
            .orderBy("item_number");

          return {
            ...request,
            items,
          };
        })
      );

      return requestsWithItems;
    } catch (error) {
      console.error("Error fetching branch requests with items:", error);
      throw new Error(
        "Failed to retrieve branch requests with items from database"
      );
    }
  }

  // Get dashboard statistics
  static async getStats(filters = {}) {
    try {
      let query = db("branch_requests").whereNull("deleted_at");

      if (filters.branch_id) {
        query = query.where("branch_id", filters.branch_id);
      }

      if (filters.dateFrom && filters.dateTo) {
        query = query.whereBetween("request_date", [
          filters.dateFrom,
          filters.dateTo,
        ]);
      }

      const stats = await query
        .select(
          db.raw("COUNT(*) as total_requests"),
          db.raw("COUNT(CASE WHEN status = 'Draft' THEN 1 END) as draft"),
          db.raw("COUNT(CASE WHEN status = 'Sent' THEN 1 END) as sent"),
          db.raw(
            "COUNT(CASE WHEN status = 'Acknowledged' THEN 1 END) as acknowledged"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled"
          )
        )
        .first();

      return stats;
    } catch (error) {
      console.error("Error fetching branch request statistics:", error);
      throw new Error(
        "Failed to retrieve branch request statistics: " + error.message
      );
    }
  }
}

module.exports = BranchRequest;
