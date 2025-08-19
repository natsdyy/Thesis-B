// backend/models/SupplyRequest.js
const { db } = require("../config/database");

class SupplyRequest {
  // Get all supply requests with optional filters
  static async getAll(filters = {}) {
    try {
      let query = db("supply_requests as sr")
        .leftJoin(
          "supply_request_items as sri",
          "sr.id",
          "sri.supply_request_id"
        )
        .select(
          "sr.*",
          db.raw("COUNT(sri.id) as item_count"),
          db.raw("COALESCE(SUM(sri.item_amount), 0) as calculated_total")
        )
        .groupBy(
          "sr.id",
          "sr.request_id",
          "sr.request_type",
          "sr.request_description",
          "sr.request_date",
          "sr.priority",
          "sr.department",
          "sr.requested_by",
          "sr.request_status",
          "sr.total_amount",
          "sr.item_count",
          "sr.finance_remarks",
          "sr.approved_by",
          "sr.approved_at",
          "sr.rejected_by",
          "sr.rejected_at",
          "sr.cancelled_by",
          "sr.cancelled_at",
          "sr.sent_back_by",
          "sr.sent_back_at",
          "sr.released_by",
          "sr.released_at",
          "sr.release_id",
          "sr.receipt_confirmed",
          "sr.receipt_confirmed_by",
          "sr.receipt_confirmed_at",
          "sr.revision_count",
          "sr.created_at",
          "sr.updated_at"
        )
        .whereNull("deleted_at");

      // Apply filters
      if (filters.status) {
        query = query.where("sr.request_status", filters.status);
      }

      if (filters.department) {
        query = query.where("sr.department", filters.department);
      }

      if (filters.date) {
        query = query.where("sr.request_date", filters.date);
      }

      if (filters.dateFrom && filters.dateTo) {
        query = query.whereBetween("sr.request_date", [
          filters.dateFrom,
          filters.dateTo,
        ]);
      }

      if (filters.priority) {
        query = query.where("sr.priority", filters.priority);
      }

      if (filters.search) {
        query = query.where(function () {
          this.where("sr.request_description", "ilike", `%${filters.search}%`)
            .orWhere("sr.request_id", "like", `%${filters.search}%`)
            .orWhere("sr.requested_by", "ilike", `%${filters.search}%`);
        });
      }

      const requests = await query.orderBy("sr.created_at", "desc");
      return requests;
    } catch (error) {
      console.error("Error fetching supply requests:", error);
      throw new Error("Failed to retrieve supply requests from database");
    }
  }

  // Get supply request by ID with items
  static async getById(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid supply request ID provided");
      }

      const request = await db("supply_requests")
        .where("id", id)
        .whereNull("supply_requests.deleted_at")
        .first();

      if (!request) {
        return null;
      }

      // Get request items
      const items = await db("supply_request_items")
        .where("supply_request_id", id)
        .orderBy("item_number");

      return {
        ...request,
        items,
      };
    } catch (error) {
      console.error("Error fetching supply request:", error);
      throw new Error("Failed to retrieve supply request from database");
    }
  }

  // Get supply request by request_id with items
  static async getByRequestId(requestId) {
    try {
      if (!requestId) {
        throw new Error("Invalid request ID provided");
      }

      const request = await db("supply_requests")
        .where("request_id", requestId)
        .whereNull("supply_requests.deleted_at")
        .first();

      if (!request) {
        return null;
      }

      // Get request items
      const items = await db("supply_request_items")
        .where("supply_request_id", request.id)
        .orderBy("item_number");

      return {
        ...request,
        items,
      };
    } catch (error) {
      console.error("Error fetching supply request by request_id:", error);
      throw new Error("Failed to retrieve supply request from database");
    }
  }

  // Create new supply request with items
  static async create(requestData, items) {
    const trx = await db.transaction();

    try {
      // Generate unique request_id
      const requestId = Date.now();

      // Calculate totals
      const totalAmount = items.reduce(
        (sum, item) => sum + item.item_quantity * item.item_unit_price,
        0
      );
      const itemCount = items.length;

      // Create supply request
      const [supplyRequest] = await trx("supply_requests")
        .insert({
          request_id: requestId,
          request_type: requestData.request_type,
          request_description: requestData.request_description,
          request_date: requestData.request_date,
          priority: requestData.priority || "Normal",
          department: requestData.department,
          requested_by: requestData.requested_by,
          total_amount: totalAmount,
          item_count: itemCount,
          request_status: "To Request",
        })
        .returning("*");

      // Create supply request items
      const itemsToInsert = items.map((item, index) => ({
        supply_request_id: supplyRequest.id,
        item_number: index + 1,
        item_name: item.item_name,
        item_quantity: item.item_quantity,
        item_unit: item.item_unit,
        item_type: item.item_type,
        item_unit_price: item.item_unit_price,
        item_amount: item.item_quantity * item.item_unit_price,
        item_notes: item.item_notes || null,
      }));

      const createdItems = await trx("supply_request_items")
        .insert(itemsToInsert)
        .returning("*");

      await trx.commit();

      return {
        ...supplyRequest,
        items: createdItems,
      };
    } catch (error) {
      await trx.rollback();
      console.error("Error creating supply request:", error);
      throw new Error("Failed to create supply request");
    }
  }

  // Update supply request
  static async update(id, requestData, items = null) {
    const trx = await db.transaction();

    try {
      // Update supply request
      const updateData = { ...requestData };

      // If items are provided, recalculate totals
      if (items) {
        updateData.total_amount = items.reduce(
          (sum, item) => sum + item.item_quantity * item.item_unit_price,
          0
        );
        updateData.item_count = items.length;
      }

      const [updatedRequest] = await trx("supply_requests")
        .where("id", id)
        .update(updateData)
        .returning("*");

      if (!updatedRequest) {
        throw new Error("Supply request not found");
      }

      // Update items if provided
      if (items) {
        // Delete existing items
        await trx("supply_request_items").where("supply_request_id", id).del();

        // Insert new items
        const itemsToInsert = items.map((item, index) => ({
          supply_request_id: id,
          item_number: index + 1,
          item_name: item.item_name,
          item_quantity: item.item_quantity,
          item_unit: item.item_unit,
          item_type: item.item_type,
          item_unit_price: item.item_unit_price,
          item_amount: item.item_quantity * item.item_unit_price,
          item_notes: item.item_notes || null,
        }));

        const createdItems = await trx("supply_request_items")
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
      console.error("Error updating supply request:", error);
      throw new Error("Failed to update supply request");
    }
  }

  // Update request status
  static async updateStatus(id, status, updatedBy, remarks = null) {
    try {
      const updateData = {
        request_status: status,
        updated_at: new Date(),
      };

      // Add status-specific fields
      switch (status) {
        case "Approved":
          updateData.approved_by = updatedBy;
          updateData.approved_at = new Date();
          if (remarks) updateData.finance_remarks = remarks;
          break;
        case "Rejected":
          updateData.rejected_by = updatedBy;
          updateData.rejected_at = new Date();
          if (remarks) updateData.finance_remarks = remarks;
          break;
        case "Cancelled":
          updateData.cancelled_by = updatedBy;
          updateData.cancelled_at = new Date();
          break;
        case "Sent Back":
          updateData.sent_back_by = updatedBy;
          updateData.sent_back_at = new Date();
          updateData.revision_count = db.raw("revision_count + 1");
          if (remarks) updateData.finance_remarks = remarks;
          break;
      }

      const [updatedRequest] = await db("supply_requests")
        .where("id", id)
        .update(updateData)
        .returning("*");

      return updatedRequest;
    } catch (error) {
      console.error("Error updating request status:", error);
      throw new Error("Failed to update request status");
    }
  }

  // Delete supply request (soft delete)
  static async delete(id) {
    try {
      const [deletedRequest] = await db("supply_requests")
        .where("id", id)
        .update({
          deleted_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      return deletedRequest;
    } catch (error) {
      console.error("Error deleting supply request:", error);
      throw new Error("Failed to delete supply request");
    }
  }

  // Get requests by status
  static async getByStatus(status) {
    try {
      const requests = await db("supply_requests as sr")
        .leftJoin(
          "supply_request_items as sri",
          "sr.id",
          "sri.supply_request_id"
        )
        .select(
          "sr.*",
          db.raw("COUNT(sri.id) as item_count"),
          db.raw("COALESCE(SUM(sri.item_amount), 0) as calculated_total")
        )
        .where("sr.request_status", status)
        .whereNull("deleted_at")
        .groupBy("supply_requests.id")
        .orderBy("supply_requests.created_at", "desc");

      return requests;
    } catch (error) {
      console.error("Error fetching requests by status:", error);
      throw new Error("Failed to retrieve requests by status");
    }
  }

  // Get dashboard statistics
  static async getStats(filters = {}) {
    try {
      let query = db("supply_requests").whereNull("deleted_at");
      if (filters.department) {
        query = query.where("department", filters.department);
      }
      if (filters.dateFrom && filters.dateTo) {
        query = query.whereBetween("request_date", [
          filters.dateFrom,
          filters.dateTo,
        ]);
      }
      console.log("Stats query about to run");
      const stats = await query
        .select(
          db.raw("COUNT(*) as total_requests"),
          db.raw(
            "COUNT(CASE WHEN request_status = 'To Request' THEN 1 END) as to_request"
          ),
          db.raw(
            "COUNT(CASE WHEN request_status = 'Pending' THEN 1 END) as pending"
          ),
          db.raw(
            "COUNT(CASE WHEN request_status = 'Approved' THEN 1 END) as approved"
          ),
          db.raw(
            "COUNT(CASE WHEN request_status = 'Rejected' THEN 1 END) as rejected"
          ),
          db.raw(
            "COUNT(CASE WHEN request_status = 'Cancelled' THEN 1 END) as cancelled"
          ),
          db.raw(
            "COUNT(CASE WHEN request_status = 'Budget Released' THEN 1 END) as budget_released"
          ),
          db.raw(
            "COUNT(CASE WHEN request_status = 'Completed' THEN 1 END) as completed"
          ),
          db.raw(
            "COALESCE(SUM(CASE WHEN request_status = 'Approved' THEN total_amount END), 0) as total_approved_amount"
          ),
          db.raw(
            "COALESCE(SUM(CASE WHEN request_status = 'Completed' THEN total_amount END), 0) as total_completed_amount"
          )
        )
        .first();
      console.log("Stats query result:", stats);
      return stats;
    } catch (error) {
      console.error("Error fetching request statistics:", error);
      throw new Error(
        "Failed to retrieve request statistics: " + error.message
      );
    }
  }
}

module.exports = SupplyRequest;
