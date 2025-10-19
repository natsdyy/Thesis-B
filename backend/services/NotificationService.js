const Notification = require("../models/Notification");
const SupplyRequest = require("../models/SupplyRequest");
const PurchaseOrder = require("../models/PurchaseOrder");
const BranchRemittance = require("../models/BranchRemittance");
const OvertimeRequest = require("../models/OvertimeRequest");
const LeaveRequest = require("../models/LeaveRequest");
const BranchRequest = require("../models/BranchRequest");
const BranchReturn = require("../models/BranchReturn");
const { db } = require("../config/database");

class NotificationService {
  // Supply Request Notifications
  static async createSupplyRequestNotification(
    requestId,
    type,
    updatedBy = null
  ) {
    try {
      const request = await SupplyRequest.getById(requestId);
      if (!request) {
        console.error("Supply request not found:", requestId);
        return null;
      }

      // Check if notification already exists for this request and type
      const existingNotification = await db("notifications")
        .where("reference_id", requestId)
        .where("reference_table", "supply_requests")
        .where("notification_type", "supply_request")
        .where("department", request.department) // Also check department to be more specific
        .where("created_at", ">", new Date(Date.now() - 30000)) // Within last 30 seconds
        .first();

      if (existingNotification) {
        console.log(
          "Duplicate notification prevented for supply request:",
          requestId,
          "type:",
          type,
          "existing notification ID:",
          existingNotification.id,
          "created at:",
          existingNotification.created_at
        );
        return null;
      }

      let notifications = [];
      const requestNumber = request.request_id;

      switch (type) {
        case "pending":
          // SCM sends to Finance - notify Finance managers
          notifications.push({
            department: "Finance",
            role_filter: "Manager",
            notification_type: "supply_request",
            title: "New Supply Request Needs Approval",
            message: `Supply request #${requestNumber} from ${request.department} department needs your approval. Total amount: ₱${parseFloat(request.total_amount).toFixed(2)}`,
            reference_id: requestId,
            reference_table: "supply_requests",
            action_url: "/finance/request-approval",
          });
          break;

        case "approved":
          // Finance approves - notify SCM
          notifications.push({
            department: request.department,
            notification_type: "supply_request",
            title: "Supply Request Approved",
            message: `Your supply request #${requestNumber} has been approved by Finance. Amount: ₱${parseFloat(request.total_amount).toFixed(2)}`,
            reference_id: requestId,
            reference_table: "supply_requests",
            action_url: "/scm/request-supply",
          });
          break;

        case "rejected":
          // Finance rejects - notify SCM
          notifications.push({
            department: request.department,
            notification_type: "supply_request",
            title: "Supply Request Rejected",
            message: `Your supply request #${requestNumber} has been rejected by Finance. Please review and resubmit if needed.`,
            reference_id: requestId,
            reference_table: "supply_requests",
            action_url: "/scm/request-supply",
          });
          break;

        case "sent_back":
          // Finance sends back - notify SCM
          notifications.push({
            department: request.department,
            notification_type: "supply_request",
            title: "Supply Request Sent Back",
            message: `Your supply request #${requestNumber} has been sent back by Finance for modifications.`,
            reference_id: requestId,
            reference_table: "supply_requests",
            action_url: "/scm/request-supply",
          });
          break;

        case "budget_released":
          // Finance releases budget - notify SCM
          notifications.push({
            department: request.department,
            notification_type: "supply_request",
            title: "Budget Released",
            message: `Budget has been released for your supply request #${requestNumber}. You can now proceed with procurement.`,
            reference_id: requestId,
            reference_table: "supply_requests",
            action_url: "/scm/request-supply",
          });
          break;
      }

      if (notifications.length > 0) {
        console.log(
          "Creating notifications for supply request:",
          requestId,
          "type:",
          type,
          "notifications count:",
          notifications.length
        );
        const created = await Notification.createBulk(notifications);
        console.log(
          "Created notifications:",
          created.map((n) => ({
            id: n.id,
            title: n.title,
            department: n.department,
          }))
        );
        return created;
      }

      return null;
    } catch (error) {
      console.error("Error creating supply request notification:", error);
      throw error;
    }
  }

  // Payroll Notifications
  static async createPayrollNotification(payrollId, type, updatedBy = null) {
    try {
      // Get payroll period details
      const payroll = await db("payroll_periods")
        .where("id", payrollId)
        .first();

      if (!payroll) {
        console.error("Payroll period not found:", payrollId);
        return null;
      }

      // Check if notification already exists for this payroll and type
      const existingNotification = await db("notifications")
        .where("reference_id", payrollId)
        .where("reference_table", "payroll_periods")
        .where("notification_type", "payroll")
        .where("created_at", ">", new Date(Date.now() - 60000)) // Within last minute
        .first();

      if (existingNotification) {
        console.log("Duplicate notification prevented for payroll:", payrollId);
        return null;
      }

      let notifications = [];

      switch (type) {
        case "submitted":
          // HR submits payroll - notify Finance managers
          notifications.push({
            department: "Finance",
            role_filter: "Manager",
            notification_type: "payroll",
            title: "Payroll Submitted for Approval",
            message: `Payroll period ${payroll.period_name} (${payroll.department}) has been submitted for your approval.`,
            reference_id: payrollId,
            reference_table: "payroll_periods",
            action_url: "/finance/payroll-approval",
          });
          break;

        case "approved":
          // Finance approves - notify HR
          notifications.push({
            department: payroll.department,
            notification_type: "payroll",
            title: "Payroll Approved",
            message: `Payroll period ${payroll.period_name} has been approved by Finance.`,
            reference_id: payrollId,
            reference_table: "payroll_periods",
            action_url: "/hr/payroll-management",
          });
          break;

        case "rejected":
          // Finance rejects - notify HR
          notifications.push({
            department: payroll.department,
            notification_type: "payroll",
            title: "Payroll Rejected",
            message: `Payroll period ${payroll.period_name} has been rejected by Finance. Please review and resubmit.`,
            reference_id: payrollId,
            reference_table: "payroll_periods",
            action_url: "/hr/payroll-management",
          });
          break;
      }

      if (notifications.length > 0) {
        return await Notification.createBulk(notifications);
      }

      return null;
    } catch (error) {
      console.error("Error creating payroll notification:", error);
      throw error;
    }
  }

  // Purchase Order Notifications
  static async createPurchaseOrderNotification(poId, type, updatedBy = null) {
    try {
      const po = await PurchaseOrder.getById(poId);
      if (!po) {
        console.error("Purchase order not found:", poId);
        return null;
      }

      // Check if notification already exists for this purchase order and type
      const existingNotification = await db("notifications")
        .where("reference_id", poId)
        .where("reference_table", "purchase_orders")
        .where("notification_type", "purchase_order")
        .where("created_at", ">", new Date(Date.now() - 60000)) // Within last minute
        .first();

      if (existingNotification) {
        console.log(
          "Duplicate notification prevented for purchase order:",
          poId
        );
        return null;
      }

      let notifications = [];

      switch (type) {
        case "sent":
          // SCM sends PO - notify Supplier
          const supplier = await db("suppliers")
            .where("id", po.supplier_id)
            .first();
          if (supplier) {
            notifications.push({
              department: "Supplier",
              notification_type: "purchase_order",
              title: "New Purchase Order Received",
              message: `You have received a new purchase order #${po.po_number} from ${supplier.name}. Amount: ₱${parseFloat(po.total_amount).toFixed(2)}`,
              reference_id: poId,
              reference_table: "purchase_orders",
              action_url: "/supplier/orders",
            });
          }
          break;

        case "confirmed":
          // Supplier confirms - notify SCM
          notifications.push({
            department: "SCM",
            notification_type: "purchase_order",
            title: "Purchase Order Confirmed",
            message: `Purchase order #${po.po_number} has been confirmed by the supplier.`,
            reference_id: poId,
            reference_table: "purchase_orders",
            action_url: "/scm/purchase-order",
          });
          break;

        case "in_progress":
          // Supplier marks in progress - notify SCM
          notifications.push({
            department: "SCM",
            notification_type: "purchase_order",
            title: "Purchase Order In Progress",
            message: `Purchase order #${po.po_number} is now in progress by the supplier.`,
            reference_id: poId,
            reference_table: "purchase_orders",
            action_url: "/scm/purchase-order",
          });
          break;

        case "delivered":
          Scm;
          notifications.push({
            department: "SCM",
            notification_type: "purchase_order",
            title: "Purchase Order Delivered",
            message: `Purchase order #${po.po_number} has been delivered by the supplier.`,
            reference_id: poId,
            reference_table: "purchase_orders",
            action_url: "/scm/purchase-order",
          });
          break;
      }

      if (notifications.length > 0) {
        return await Notification.createBulk(notifications);
      }

      return null;
    } catch (error) {
      console.error("Error creating purchase order notification:", error);
      throw error;
    }
  }

  // Remittance Notifications
  static async createRemittanceNotification(remittanceId) {
    try {
      const remittance = await db("branch_remittances")
        .where("id", remittanceId)
        .first();

      if (!remittance) {
        console.error("Remittance not found:", remittanceId);
        return null;
      }

      // Get branch details
      const branch = await db("branches")
        .where("id", remittance.branch_id)
        .first();

      const notification = await Notification.create({
        department: "Finance",
        role_filter: "Manager",
        notification_type: "remittance",
        title: "Branch Sales Remittance Received",
        message: `${branch?.name || "Branch"} has remitted ₱${parseFloat(remittance.remitted_amount).toFixed(2)} for the period ${remittance.date_from} to ${remittance.date_to}.`,
        reference_id: remittanceId,
        reference_table: "branch_remittances",
        action_url: "/finance/cash-management",
      });

      return notification;
    } catch (error) {
      console.error("Error creating remittance notification:", error);
      throw error;
    }
  }

  // Overtime/Leave Notifications
  static async createOvertimeLeaveNotification(
    requestId,
    type,
    requestType = "overtime"
  ) {
    try {
      let request,
        notifications = [];

      if (requestType === "overtime") {
        request = await db("overtime_requests").where("id", requestId).first();
      } else {
        request = await db("leave_requests").where("id", requestId).first();
      }

      if (!request) {
        console.error(`${requestType} request not found:`, requestId);
        return null;
      }

      // Get employee details
      const employee = await db("employees")
        .where("id", request.employee_id)
        .first();

      switch (type) {
        case "requested":
          // Employee requests - notify HR managers
          notifications.push({
            department: "Human Resource",
            role_filter: "Manager",
            notification_type: requestType,
            title: `${requestType === "overtime" ? "Overtime" : "Leave"} Request`,
            message: `${employee?.name || "Employee"} has submitted a ${requestType} request for ${request.request_date || request.leave_date}.`,
            reference_id: requestId,
            reference_table:
              requestType === "overtime"
                ? "overtime_requests"
                : "leave_requests",
            action_url:
              requestType === "overtime"
                ? "/hr/overtime-approval"
                : "/hr/leave-approvals",
          });
          break;

        case "approved":
          // HR approves - notify employee
          notifications.push({
            employee_id: request.employee_id,
            department: "Human Resource",
            notification_type: requestType,
            title: `${requestType === "overtime" ? "Overtime" : "Leave"} Request Approved`,
            message: `Your ${requestType} request for ${request.request_date || request.leave_date} has been approved.`,
            reference_id: requestId,
            reference_table:
              requestType === "overtime"
                ? "overtime_requests"
                : "leave_requests",
            action_url: "/hr/attendance",
          });
          break;

        case "rejected":
          // HR rejects - notify employee
          notifications.push({
            employee_id: request.employee_id,
            department: "Human Resource",
            notification_type: requestType,
            title: `${requestType === "overtime" ? "Overtime" : "Leave"} Request Rejected`,
            message: `Your ${requestType} request for ${request.request_date || request.leave_date} has been rejected.`,
            reference_id: requestId,
            reference_table:
              requestType === "overtime"
                ? "overtime_requests"
                : "leave_requests",
            action_url: "/hr/attendance",
          });
          break;
      }

      if (notifications.length > 0) {
        return await Notification.createBulk(notifications);
      }

      return null;
    } catch (error) {
      console.error("Error creating overtime/leave notification:", error);
      throw error;
    }
  }

  // Branch Request Notifications
  static async createBranchRequestNotification(requestId, type) {
    try {
      const request = await BranchRequest.getById(requestId);
      if (!request) {
        console.error("Branch request not found:", requestId);
        return null;
      }

      // Get branch details
      const branch = await db("branches")
        .where("id", request.branch_id)
        .first();

      let notifications = [];
      const targetDepartment =
        request.source_type === "scm" ? "SCM" : "Production";

      switch (type) {
        case "requested":
          // Branch requests inventory - notify SCM/Production
          notifications.push({
            department: targetDepartment,
            role_filter: "Manager",
            notification_type: "branch_request",
            title: "Branch Inventory Request",
            message: `${branch?.name || "Branch"} has requested ${request.item_count} items from ${targetDepartment}.`,
            reference_id: requestId,
            reference_table: "branch_requests",
            action_url: "/scm/request-supply",
          });
          break;

        case "approved":
          // SCM/Production approves - notify Branch
          notifications.push({
            department: "Branch",
            notification_type: "branch_request",
            title: "Inventory Request Approved",
            message: `Your inventory request #${request.request_id} has been approved by ${targetDepartment}.`,
            reference_id: requestId,
            reference_table: "branch_requests",
            action_url: "/branch/inventory",
          });
          break;

        case "rejected":
          // SCM/Production rejects - notify Branch
          notifications.push({
            department: "Branch",
            notification_type: "branch_request",
            title: "Inventory Request Rejected",
            message: `Your inventory request #${request.request_id} has been rejected by ${targetDepartment}.`,
            reference_id: requestId,
            reference_table: "branch_requests",
            action_url: "/branch/inventory",
          });
          break;
      }

      if (notifications.length > 0) {
        return await Notification.createBulk(notifications);
      }

      return null;
    } catch (error) {
      console.error("Error creating branch request notification:", error);
      throw error;
    }
  }

  // Branch Return Notifications
  static async createBranchReturnNotification(returnId) {
    try {
      const branchReturn = await BranchReturn.getById(returnId);
      if (!branchReturn) {
        console.error("Branch return not found:", returnId);
        return null;
      }

      // Get branch details
      const branch = await db("branches")
        .where("id", branchReturn.branch_id)
        .first();

      const targetDepartment =
        branchReturn.return_type === "scm" ? "SCM" : "Production";

      const notification = await Notification.create({
        department: targetDepartment,
        role_filter: "Manager",
        notification_type: "branch_return",
        title: "Branch Return Request",
        message: `${branch?.name || "Branch"} has submitted a return request for ${branchReturn.return_type.toUpperCase()} items.`,
        reference_id: returnId,
        reference_table: "branch_returns",
        action_url: "/scm/request-supply",
      });

      return notification;
    } catch (error) {
      console.error("Error creating branch return notification:", error);
      throw error;
    }
  }
}

module.exports = NotificationService;
