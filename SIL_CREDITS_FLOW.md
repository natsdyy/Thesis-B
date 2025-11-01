# SIL Credits Flow Documentation

## Backend Flow Verification

### 1. **Create Leave Request** (routes/leave.js:278-289)

```javascript
if (use_sil && sil_days > 0) {
  const currentYear = new Date().getFullYear();
  await SILCredits.useCredits(employeeId, currentYear, sil_days);
}
```

✅ **Credits are DEDUCTED when creating the leave request**

- Status: `pending` or `approved_by_manager` (for managers)
- Credits: Available decreases, Used increases

---

### 2. **Approve by Manager** (LeaveRequest.js:338-373)

```javascript
static async approveByManager(id, managerId, notes = null) {
  // ... validation ...
  const [updated] = await db("leave_requests")
    .where("id", id)
    .update({
      status: "approved_by_manager",
      // ... other fields ...
    })
    .returning("*");
  return updated;
}
```

❌ **NO SIL credit restoration** - Credits remain deducted

- Status: `approved_by_manager`
- Credits: Still deducted (no change)

---

### 3. **Approve by HR** (LeaveRequest.js:376-424)

```javascript
static async approveByHR(id, hrId, notes = null) {
  // ... validation ...
  const [updated] = await db("leave_requests")
    .where("id", id)
    .update({
      status: "approved_by_hr",
      // ... other fields ...
    })
    .returning("*");
  return updated;
}
```

❌ **NO SIL credit restoration** - Credits remain deducted

- Status: `approved_by_hr` (final approval)
- Credits: **Permanently used** (no restoration)

---

### 4. **Reject Leave Request** (LeaveRequest.js:460-498)

```javascript
// Restore SIL credits if they were used
if (leaveRequest.use_sil && leaveRequest.sil_days > 0) {
  try {
    const fromDate =
      leaveRequest.from_date instanceof Date
        ? leaveRequest.from_date
        : new Date(leaveRequest.from_date);
    const currentYear = fromDate.getFullYear();

    await SILCredits.restoreCredits(
      leaveRequest.employee_id,
      currentYear,
      parseFloat(leaveRequest.sil_days)
    );
    // Success log...
  } catch (silError) {
    // Error logging...
  }
}
```

✅ **Credits are RESTORED when rejecting**

- Status: `rejected`
- Credits: Available increases back, Used decreases

---

## Complete Flow Summary

| Action              | Status After          | SIL Credits             | Can Reuse?   |
| ------------------- | --------------------- | ----------------------- | ------------ |
| **Create Leave**    | `pending`             | ✅ Deducted             | ❌ No        |
| **Manager Approve** | `approved_by_manager` | ✅ Deducted             | ❌ No        |
| **HR Approve**      | `approved_by_hr`      | ✅ **Permanently Used** | ❌ **Never** |
| **Reject**          | `rejected`            | ✅ **Restored**         | ✅ **Yes!**  |

---

## Answer to Your Question

**"If I used 5 and rejected in the next request I can still use the 5?"**

✅ **YES - That's exactly correct!**

1. You submit leave request #1 with 5 SIL days → Credits deducted (Available = 0)
2. Leave #1 gets rejected → Credits restored (Available = 5)
3. You submit leave request #2 with 5 SIL days → Credits deducted again (Available = 0)
4. If leave #2 is also rejected → Credits restored again (Available = 5)

**The key point:** Rejected leaves **automatically restore** your SIL credits, so you can reuse them in future leave requests. Only **approved** leaves permanently consume your credits.
