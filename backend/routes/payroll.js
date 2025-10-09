const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/rbac");
const PayrollPeriod = require("../models/PayrollPeriod");
const PayrollRecord = require("../models/PayrollRecord");
const PayrollService = require("../services/PayrollService");
const CashMovement = require("../models/CashMovement");
const FinanceBalance = require("../models/FinanceBalance");
const EmailService = require("../services/emailService");
const { formatForDatabase } = require("../utils/timezoneUtils");

// POST /api/payroll/generate - Generate payroll for department or branch
router.post("/generate", authenticateToken, async (req, res) => {
  try {
    const {
      type, // 'department' or 'branch'
      scope, // department name or branch id
      period_type, // 'weekly', 'bi-weekly', 'monthly'
      date_from,
      date_to,
      period_name, // Optional
      generated_by, // Optional - use this or req.user.id
      remarks, // Optional
    } = req.body;

    if (!type || !scope || !period_type || !date_from || !date_to) {
      return res.status(400).json({
        success: false,
        message:
          "type, scope, period_type, date_from, and date_to are required",
      });
    }

    const dateFrom = new Date(date_from);
    const dateTo = new Date(date_to);
    const generatorId = generated_by || req.user.id;

    let result;
    if (type === "department") {
      result = await PayrollService.generatePayrollForDepartment(
        scope,
        period_type,
        dateFrom,
        dateTo,
        generatorId,
        period_name,
        remarks
      );
    } else if (type === "branch") {
      result = await PayrollService.generatePayrollForBranch(
        parseInt(scope),
        period_type,
        dateFrom,
        dateTo,
        generatorId,
        period_name,
        remarks
      );
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be 'department' or 'branch'",
      });
    }

    res.status(201).json({
      success: true,
      data: result,
      message: "Payroll generated successfully",
    });
  } catch (error) {
    console.error("Error generating payroll:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate payroll",
    });
  }
});

// GET /api/payroll/periods - List all payroll periods
router.get("/periods", authenticateToken, async (req, res) => {
  try {
    const {
      status,
      date_from,
      date_to,
      department,
      branch_id,
      limit = 20,
      offset = 0,
    } = req.query;

    const result = await PayrollPeriod.list({
      status,
      date_from,
      date_to,
      department,
      branch_id: branch_id ? parseInt(branch_id) : null,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error listing payroll periods:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to list payroll periods",
    });
  }
});

// GET /api/payroll/periods/:id - Get period details with records
router.get("/periods/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const period = await PayrollPeriod.getById(parseInt(id));

    res.json({
      success: true,
      data: period,
    });
  } catch (error) {
    console.error("Error getting payroll period:", error);
    res.status(404).json({
      success: false,
      message: error.message || "Payroll period not found",
    });
  }
});

// PUT /api/payroll/periods/:id/records/:recordId - Update individual record
router.put(
  "/periods/:id/records/:recordId",
  authenticateToken,
  async (req, res) => {
    try {
      const { id, recordId } = req.params;
      const updates = req.body;

      // Get the period first to check status
      const period = await PayrollPeriod.getById(parseInt(id));

      if (period.status !== "draft") {
        return res.status(400).json({
          success: false,
          message: "Can only edit draft payroll periods",
        });
      }

      // Recalculate totals if necessary
      if (
        updates.hours_worked !== undefined ||
        updates.overtime_hours !== undefined
      ) {
        const record = await PayrollRecord.getById(parseInt(recordId));
        const hourlyRate = Number(record.rate_per_hour);

        // Recalculate
        if (updates.hours_worked !== undefined) {
          updates.basic_salary = Number(updates.hours_worked) * hourlyRate;
        }
        if (updates.overtime_hours !== undefined) {
          updates.overtime_pay =
            Number(updates.overtime_hours) * hourlyRate * 1.25;
        }

        // Recalculate gross and net
        updates.gross_salary =
          Number(updates.basic_salary || record.basic_salary) +
          Number(updates.overtime_pay || record.overtime_pay) +
          Number(record.regular_holiday_pay || 0) +
          Number(record.special_holiday_pay || 0) +
          Number(record.double_holiday_pay || 0) +
          Number(record.sil_conversion_pay || 0);

        updates.net_salary =
          Number(updates.gross_salary) - Number(record.total_deductions || 0);
      }

      const updatedRecord = await PayrollRecord.update(
        parseInt(recordId),
        updates
      );

      // Recalculate period totals
      const allRecords = await PayrollRecord.getByPeriodId(parseInt(id));
      const totals = allRecords.reduce(
        (acc, r) => ({
          gross: acc.gross + Number(r.gross_salary || 0),
          deductions: acc.deductions + Number(r.total_deductions || 0),
          net: acc.net + Number(r.net_salary || 0),
        }),
        { gross: 0, deductions: 0, net: 0 }
      );

      await PayrollPeriod.update(parseInt(id), {
        total_gross_amount: totals.gross,
        total_deductions: totals.deductions,
        total_net_amount: totals.net,
      });

      res.json({
        success: true,
        data: updatedRecord,
        message: "Payroll record updated successfully",
      });
    } catch (error) {
      console.error("Error updating payroll record:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update payroll record",
      });
    }
  }
);

// DELETE /api/payroll/periods/:id - Delete draft payroll
router.delete("/periods/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get the period first to check status
    const period = await PayrollPeriod.getById(parseInt(id));

    if (period.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Can only delete draft payroll periods",
      });
    }

    await PayrollPeriod.delete(parseInt(id));

    res.json({
      success: true,
      message: "Payroll period deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting payroll period:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete payroll period",
    });
  }
});

// POST /api/payroll/periods/:id/submit - Submit to Finance
router.post("/periods/:id/submit", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const period = await PayrollPeriod.getById(parseInt(id));

    if (period.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Can only submit draft payroll periods",
      });
    }

    const updatedPeriod = await PayrollPeriod.updateStatus(
      parseInt(id),
      "pending_approval",
      req.user.id
    );

    res.json({
      success: true,
      data: updatedPeriod,
      message: "Payroll submitted for approval",
    });
  } catch (error) {
    console.error("Error submitting payroll:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit payroll",
    });
  }
});

// GET /api/payroll/pending-approval - Get periods pending finance approval
router.get("/pending-approval", authenticateToken, async (req, res) => {
  try {
    const result = await PayrollPeriod.list({
      status: "pending_approval",
      limit: 100,
      offset: 0,
    });

    res.json({
      success: true,
      data: result.data,
      total: result.total,
    });
  } catch (error) {
    console.error("Error getting pending approvals:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get pending approvals",
    });
  }
});

// POST /api/payroll/periods/:id/approve - Approve payroll
router.post("/periods/:id/approve", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const period = await PayrollPeriod.getById(parseInt(id));

    if (period.status !== "pending_approval") {
      return res.status(400).json({
        success: false,
        message: "Can only approve payroll periods pending approval",
      });
    }

    // Check current finance balance
    const balance = await FinanceBalance.getLatestBalance();
    const requiredAmount =
      Number(period.total_net_amount) +
      Number(
        period.records?.reduce(
          (sum, r) => sum + Number(r.total_employer_contributions || 0),
          0
        ) || 0
      );

    if (!balance || Number(balance.total_balance) < requiredAmount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance to approve payroll",
        required: requiredAmount,
        available: balance ? Number(balance.total_balance) : 0,
      });
    }

    // Update status to approved
    const updatedPeriod = await PayrollPeriod.update(parseInt(id), {
      status: "approved",
      finance_approved_by: req.user.id,
      finance_approved_at: formatForDatabase(new Date()),
      finance_remarks: remarks || null,
    });

    res.json({
      success: true,
      data: updatedPeriod,
      message: "Payroll approved successfully",
    });
  } catch (error) {
    console.error("Error approving payroll:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to approve payroll",
    });
  }
});

// POST /api/payroll/periods/:id/reject - Reject payroll with remarks
router.post("/periods/:id/reject", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    if (!remarks) {
      return res.status(400).json({
        success: false,
        message: "Rejection remarks are required",
      });
    }

    const period = await PayrollPeriod.getById(parseInt(id));

    if (period.status !== "pending_approval") {
      return res.status(400).json({
        success: false,
        message: "Can only reject payroll periods pending approval",
      });
    }

    // Update back to draft with remarks
    const updatedPeriod = await PayrollPeriod.update(parseInt(id), {
      status: "draft",
      finance_remarks: remarks,
    });

    res.json({
      success: true,
      data: updatedPeriod,
      message: "Payroll rejected. Please review and resubmit.",
    });
  } catch (error) {
    console.error("Error rejecting payroll:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to reject payroll",
    });
  }
});

// POST /api/payroll/periods/:id/release - Release payment to employees
router.post("/periods/:id/release", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const period = await PayrollPeriod.getById(parseInt(id));

    if (period.status !== "budget_released") {
      return res.status(400).json({
        success: false,
        message: "Can only release payroll with budget_released status",
      });
    }

    // Update status to paid
    const updatedPeriod = await PayrollPeriod.updateStatus(
      parseInt(id),
      "paid",
      req.user.id
    );

    // Record cash movements
    await recordPayrollCashMovements(period);

    // Send email notifications to employees and update record status
    const emailResults = {
      total: period.records.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      details: [],
    };

    const emailPromises = period.records.map(async (record) => {
      try {
        // Update record status to paid
        await PayrollRecord.updateStatus(record.id, "paid");

        if (record.email) {
          const emailResult = await EmailService.sendPayrollNotification(
            record.email,
            record.employee_name,
            {
              period_name: period.period_name,
              date_from: period.date_from,
              date_to: period.date_to,
              gross_salary: record.gross_salary,
              deductions: {
                sss: record.sss_employee_share,
                philhealth: record.philhealth_employee_share,
                pagibig: record.pagibig_employee_share,
                total: record.total_deductions,
              },
              net_salary: record.net_salary,
              payment_date: updatedPeriod.paid_at,
            }
          );

          if (emailResult.success) {
            emailResults.sent++;
            await PayrollRecord.updateEmailStatus(record.id, true);
            emailResults.details.push({
              employee: record.employee_name,
              email: record.email,
              status: "sent",
            });
          } else if (emailResult.skipEmail) {
            emailResults.skipped++;
            emailResults.details.push({
              employee: record.employee_name,
              email: record.email,
              status: "skipped",
              reason: emailResult.error,
            });
          } else {
            emailResults.failed++;
            emailResults.details.push({
              employee: record.employee_name,
              email: record.email,
              status: "failed",
              error: emailResult.error,
            });
          }
        } else {
          emailResults.skipped++;
          emailResults.details.push({
            employee: record.employee_name,
            email: "N/A",
            status: "skipped",
            reason: "No email address",
          });
        }
      } catch (emailError) {
        console.error(`Failed to send email to ${record.email}:`, emailError);
        emailResults.failed++;
        emailResults.details.push({
          employee: record.employee_name,
          email: record.email,
          status: "failed",
          error: emailError.message,
        });
      }
    });

    await Promise.allSettled(emailPromises);

    // Prepare response message based on email results
    let message = "Payroll released successfully. ";
    if (emailResults.sent > 0) {
      message += `${emailResults.sent} email notification(s) sent successfully.`;
    }
    if (emailResults.failed > 0) {
      message += ` ${emailResults.failed} email(s) failed to send.`;
    }
    if (emailResults.skipped > 0) {
      message += ` ${emailResults.skipped} email(s) skipped.`;
    }

    res.json({
      success: true,
      data: updatedPeriod,
      message: message.trim(),
      emailSummary: emailResults,
    });
  } catch (error) {
    console.error("Error releasing payroll:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to release payroll",
    });
  }
});

// GET /api/payroll/records/:employeeId - Get employee payroll history
router.get("/records/:employeeId", authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const records = await PayrollRecord.getEmployeeHistory(
      parseInt(employeeId),
      {
        limit: parseInt(limit),
        offset: parseInt(offset),
      }
    );

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error("Error getting employee payroll history:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get payroll history",
    });
  }
});

/**
 * Helper function to record cash movements for payroll
 * @param {Object} period
 */
async function recordPayrollCashMovements(period) {
  const totalNetSalary = Number(period.total_net_amount || 0);
  const totalEmployerContributions = period.records?.reduce(
    (sum, r) => sum + Number(r.total_employer_contributions || 0),
    0
  );
  const totalEmployeeContributions = period.records?.reduce(
    (sum, r) => sum + Number(r.total_deductions || 0),
    0
  );

  // Record net salary disbursement
  await CashMovement.create({
    branch_id: null,
    movement_type: "out",
    amount: totalNetSalary,
    source: "payroll",
    reference_id: period.id,
    reference_type: "payroll_period",
    notes: `Net salary payment - ${period.period_name}`,
    occurred_at: period.paid_at,
  });

  // Record employer contributions
  await CashMovement.create({
    branch_id: null,
    movement_type: "out",
    amount: totalEmployerContributions,
    source: "payroll_employer_contributions",
    reference_id: period.id,
    reference_type: "payroll_period",
    notes: `Employer contributions (SSS, PhilHealth, Pag-IBIG) - ${period.period_name}`,
    occurred_at: period.paid_at,
  });

  // Record employee contributions withheld
  await CashMovement.create({
    branch_id: null,
    movement_type: "out",
    amount: totalEmployeeContributions,
    source: "payroll_employee_contributions",
    reference_id: period.id,
    reference_type: "payroll_period",
    notes: `Employee contributions withheld - ${period.period_name}`,
    occurred_at: period.paid_at,
  });
}

module.exports = router;
