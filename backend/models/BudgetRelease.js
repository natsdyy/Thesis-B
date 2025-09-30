// backend/models/BudgetRelease.js
const { db } = require("../config/database");
const { getCurrentPhilippineTime } = require("../utils/timezoneUtils");

class BudgetRelease {
  // Get all budget releases with optional filters
  static async getAll(filters = {}) {
    try {
      let query = db("budget_releases as br")
        .join("supply_requests as sr", "br.supply_request_id", "sr.id")
        .select(
          "br.*",
          "sr.request_id",
          "sr.request_description",
          "sr.department",
          "sr.requested_by",
          "sr.priority",
          "sr.request_date"
        );

      // Apply filters
      if (filters.receiptStatus === "confirmed") {
        query = query.where("br.receipt_confirmed", true);
      } else if (filters.receiptStatus === "pending") {
        query = query.where("br.receipt_confirmed", false);
      }

      if (filters.dateFrom && filters.dateTo) {
        query = query.whereBetween("br.released_at", [
          filters.dateFrom,
          filters.dateTo,
        ]);
      }

      if (filters.search) {
        query = query.where(function () {
          this.where("sr.request_description", "ilike", `%${filters.search}%`)
            .orWhere("sr.request_id", "like", `%${filters.search}%`)
            .orWhere("br.release_id", "like", `%${filters.search}%`)
            .orWhere("sr.requested_by", "ilike", `%${filters.search}%`);
        });
      }

      const releases = await query.orderBy("br.released_at", "desc");
      return releases;
    } catch (error) {
      console.error("Error fetching budget releases:", error);
      throw new Error("Failed to retrieve budget releases from database");
    }
  }

  // Get budget release by ID
  static async getById(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid budget release ID provided");
      }

      const release = await db("budget_releases as br")
        .join("supply_requests as sr", "br.supply_request_id", "sr.id")
        .select(
          "br.*",
          "sr.request_id",
          "sr.request_description",
          "sr.department",
          "sr.requested_by",
          "sr.priority",
          "sr.request_date"
        )
        .where("br.id", id)
        .first();

      return release;
    } catch (error) {
      console.error("Error fetching budget release:", error);
      throw new Error("Failed to retrieve budget release from database");
    }
  }

  // Get budget release by release_id
  static async getByReleaseId(releaseId) {
    try {
      if (!releaseId) {
        throw new Error("Invalid release ID provided");
      }

      const release = await db("budget_releases as br")
        .join("supply_requests as sr", "br.supply_request_id", "sr.id")
        .select(
          "br.*",
          "sr.request_id",
          "sr.request_description",
          "sr.department",
          "sr.requested_by",
          "sr.priority",
          "sr.request_date"
        )
        .where("br.release_id", releaseId)
        .first();

      return release;
    } catch (error) {
      console.error("Error fetching budget release by release_id:", error);
      throw new Error("Failed to retrieve budget release from database");
    }
  }

  // Create new budget release
  static async create(releaseData) {
    const trx = await db.transaction();

    try {
      // Generate unique release_id
      const year = getCurrentPhilippineTime().getFullYear();
      const count = await trx("budget_releases").count("* as total").first();
      const releaseId = `BR${year}${String(parseInt(count.total) + 1).padStart(3, "0")}`;

      // Create budget release
      const [budgetRelease] = await trx("budget_releases")
        .insert({
          release_id: releaseId,
          supply_request_id: releaseData.supply_request_id,
          released_amount: releaseData.released_amount,
          released_by: releaseData.released_by,
          released_at: getCurrentPhilippineTime(),
          release_remarks: releaseData.release_remarks || null,
        })
        .returning("*");

      // Update supply request status
      await trx("supply_requests")
        .where("id", releaseData.supply_request_id)
        .update({
          request_status: "Budget Released",
          released_by: releaseData.released_by,
          released_at: getCurrentPhilippineTime(),
          release_id: releaseId,
          updated_at: getCurrentPhilippineTime(),
        });

      await trx.commit();
      return budgetRelease;
    } catch (error) {
      await trx.rollback();
      console.error("Error creating budget release:", error);
      throw new Error("Failed to create budget release");
    }
  }

  // Confirm receipt
  static async confirmReceipt(id, confirmedBy) {
    const trx = await db.transaction();

    try {
      // Update budget release
      const [updatedRelease] = await trx("budget_releases")
        .where("id", id)
        .update({
          receipt_confirmed: true,
          receipt_confirmed_by: confirmedBy,
          receipt_confirmed_at: getCurrentPhilippineTime(),
          updated_at: getCurrentPhilippineTime(),
        })
        .returning("*");

      if (!updatedRelease) {
        throw new Error("Budget release not found");
      }

      // Update supply request status to Completed
      await trx("supply_requests")
        .where("id", updatedRelease.supply_request_id)
        .update({
          request_status: "Completed",
          receipt_confirmed: true,
          receipt_confirmed_by: confirmedBy,
          receipt_confirmed_at: getCurrentPhilippineTime(),
          updated_at: getCurrentPhilippineTime(),
        });

      await trx.commit();
      return updatedRelease;
    } catch (error) {
      await trx.rollback();
      console.error("Error confirming receipt:", error);
      throw new Error("Failed to confirm receipt");
    }
  }

  // Get pending receipts (for SCM)
  static async getPendingReceipts(department = null) {
    try {
      let query = db("budget_releases as br")
        .join("supply_requests as sr", "br.supply_request_id", "sr.id")
        .select(
          "br.*",
          "sr.request_id",
          "sr.request_description",
          "sr.department",
          "sr.requested_by",
          "sr.priority",
          "sr.request_date"
        )
        .where("br.receipt_confirmed", false);

      if (department) {
        query = query.where("sr.department", department);
      }

      const pendingReceipts = await query.orderBy("br.released_at", "desc");
      return pendingReceipts;
    } catch (error) {
      console.error("Error fetching pending receipts:", error);
      throw new Error("Failed to retrieve pending receipts");
    }
  }

  // Get budget release statistics
  static async getStats(filters = {}) {
    try {
      let query = db("budget_releases as br").join(
        "supply_requests as sr",
        "br.supply_request_id",
        "sr.id"
      );

      // Apply filters
      if (filters.department) {
        query = query.where("sr.department", filters.department);
      }

      if (filters.dateFrom && filters.dateTo) {
        query = query.whereBetween("br.released_at", [
          filters.dateFrom,
          filters.dateTo,
        ]);
      }

      const stats = await query
        .select(
          db.raw("COUNT(*) as total_releases"),
          db.raw(
            "COUNT(CASE WHEN br.receipt_confirmed = true THEN 1 END) as confirmed_receipts"
          ),
          db.raw(
            "COUNT(CASE WHEN br.receipt_confirmed = false THEN 1 END) as pending_receipts"
          ),
          db.raw(
            "COALESCE(SUM(br.released_amount), 0) as total_released_amount"
          ),
          db.raw(
            "COALESCE(SUM(CASE WHEN br.receipt_confirmed = true THEN br.released_amount END), 0) as total_confirmed_amount"
          )
        )
        .first();

      return stats;
    } catch (error) {
      console.error("Error fetching budget release statistics:", error);
      throw new Error("Failed to retrieve budget release statistics");
    }
  }
}

module.exports = BudgetRelease;
