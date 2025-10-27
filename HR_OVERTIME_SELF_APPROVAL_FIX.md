# HR Overtime Self-Approval Prevention Fix

## Problem Addressed

HR managers were able to approve their own overtime requests, which violates the approval workflow. HR manager overtime requests should only be approved by Board Members or Super Admin, not by the HR managers themselves.

## Solution Implemented

Implemented self-approval prevention for overtime requests similar to the leave request system, with appropriate status text updates for HR staff.

## Backend Changes

### 1. OvertimeRequest Model (`backend/models/OvertimeRequest.js`)

Updated both `approve()` and `reject()` methods to prevent self-approval and self-rejection:

```javascript
static async approve(id, approverId, notes = null) {
  // First get the overtime request to check for self-approval
  const overtimeRequest = await knex("overtime_requests")
    .where({ id })
    .whereNull("deleted_at")
    .first();

  if (!overtimeRequest) {
    throw new Error("Overtime request not found");
  }

  // Prevent self-approval
  if (overtimeRequest.employee_id === approverId) {
    throw new Error("You cannot approve your own overtime request. Please have another manager or HR approve it.");
  }

  // ... rest of approval logic
}

static async reject(id, approverId, notes = null) {
  // First get the overtime request to check for self-rejection
  const overtimeRequest = await knex("overtime_requests")
    .where({ id })
    .whereNull("deleted_at")
    .first();

  if (!overtimeRequest) {
    throw new Error("Overtime request not found");
  }

  // Prevent self-rejection
  if (overtimeRequest.employee_id === approverId) {
    throw new Error("You cannot reject your own overtime request. Please have a manager or HR handle this.");
  }

  // ... rest of rejection logic
}
```

### 2. Overtime Routes (`backend/routes/overtime.js`)

Enhanced error handling in both `/:id/approve` and `/:id/reject` endpoints:

```javascript
// Approve route error handling
} catch (error) {
  console.error("Error approving overtime:", error);

  // Handle self-approval error specifically
  if (error.message.includes("cannot approve your own overtime request")) {
    return res.status(403).json({
      success: false,
      message: error.message,
      code: "SELF_APPROVAL_NOT_ALLOWED",
    });
  }

  res.status(500).json({
    success: false,
    message: "Error approving overtime",
    error: error.message,
  });
}

// Reject route error handling
} catch (error) {
  console.error("Error rejecting overtime:", error);

  // Handle self-rejection error specifically
  if (error.message.includes("cannot reject your own overtime request")) {
    return res.status(403).json({
      success: false,
      message: error.message,
      code: "SELF_REJECTION_NOT_ALLOWED",
    });
  }

  res.status(500).json({
    success: false,
    message: "Error rejecting overtime",
    error: error.message,
  });
}
```

## Frontend Changes

### 1. HR Overtime Approval Page (`frontend/src/views/hr/OvertimeApproval.vue`)

**Added Self-Approval Prevention:**

- Added `currentUser` computed property
- Added `canApprove()` and `canReject()` functions to check for self-requests
- Updated template to conditionally show approve/reject buttons
- Enhanced error handling for self-approval attempts

```javascript
// Check if current user can approve/reject request (prevent self-approval/rejection)
const canApprove = (request) => {
  if (!request || !currentUser.value) return false;
  if (request.employee_id === currentUser.value.id) return false;
  return request.status === "pending";
};

const canReject = (request) => {
  if (!request || !currentUser.value) return false;
  if (request.employee_id === currentUser.value.id) return false;
  return request.status === "pending";
};
```

**Updated Status Display:**

- Added `getStatusDisplayText()` function for HR staff overtime requests
- Updated all status displays to use the new function

```javascript
const getStatusDisplayText = (status, request = null) => {
  switch ((status || "").toLowerCase()) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "pending":
      // Check if this is an HR staff member's request
      if (request && request.department === "Human Resource") {
        return "Pending Board Approval";
      }
      return "Pending";
    default:
      // Check if this is an HR staff member's request
      if (request && request.department === "Human Resource") {
        return "Pending Board Approval";
      }
      return "Pending";
  }
};
```

**Enhanced Error Handling:**

```javascript
// Handle self-approval error specifically
const errorMessage = error.response?.data?.message || error.message || "";
const errorCode = error.response?.data?.code || "";

if (
  errorCode === "SELF_APPROVAL_NOT_ALLOWED" ||
  errorMessage.includes("cannot approve your own overtime request")
) {
  showError(
    "You cannot approve your own overtime request. Please have another manager or HR staff member handle this approval.",
    "Self-Approval Not Allowed"
  );
} else {
  showError("Failed to approve overtime request");
}
```

### 2. Employee Overtime Request Component (`frontend/src/components/OvertimeRequest.vue`)

**Updated Status Display for HR Staff:**

- Added `authStore` import and `currentUser` computed property
- Added `getStatusDisplayText()` function to show "Pending Board Approval" for HR staff
- Updated template to use new status display function

```javascript
// Get status display text (handle HR staff special case)
const getStatusDisplayText = (status) => {
  const isHRStaff = currentUser.value?.department === "Human Resource";

  switch ((status || "").toLowerCase()) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "pending":
      return isHRStaff ? "Pending Board Approval" : "Pending";
    default:
      return isHRStaff ? "Pending Board Approval" : "Pending";
  }
};
```

## Status Text Changes

### Before:

- HR Manager's pending overtime: **"Pending"** ❌
- HR Manager can see and click approve/reject buttons on their own requests ❌

### After:

- HR Manager's pending overtime: **"Pending Board Approval"** ✅
- HR Manager cannot see approve/reject buttons on their own requests ✅
- Self-approval attempts are blocked with clear error messages ✅

## Impact

### For HR Staff:

- ✅ Cannot approve or reject their own overtime requests
- ✅ Clear status indication that Board approval is required
- ✅ Specific error messages when attempting self-approval
- ✅ Buttons are hidden for their own requests

### For Board Members:

- ✅ Can still approve HR manager overtime requests
- ✅ Clear identification of HR requests requiring their approval
- ✅ Proper workflow hierarchy maintained

### For Other Employees:

- ✅ No change in their overtime request flow
- ✅ Still shows appropriate "Pending" status

## Files Modified

1. **`backend/models/OvertimeRequest.js`**
   - Added self-approval prevention in `approve()` method
   - Added self-rejection prevention in `reject()` method

2. **`backend/routes/overtime.js`**
   - Enhanced error handling for self-approval attempts
   - Enhanced error handling for self-rejection attempts

3. **`frontend/src/views/hr/OvertimeApproval.vue`**
   - Added `currentUser` computed property
   - Added `canApprove()` and `canReject()` functions
   - Added `getStatusDisplayText()` function
   - Updated template to use conditional buttons
   - Enhanced error handling for self-approval attempts

4. **`frontend/src/components/OvertimeRequest.vue`**
   - Added `authStore` import and `currentUser` computed property
   - Added `getStatusDisplayText()` function
   - Updated status display for HR staff

## Testing

### HR Manager Self-Approval Prevention:

1. Login as HR Manager (Sarah Johnson)
2. Submit an overtime request
3. Navigate to Overtime Approval page
4. ✅ Approve/Reject buttons should not be visible for their own request
5. ✅ Status should show "Pending Board Approval"

### HR Manager View (Employee Component):

1. Login as HR Manager
2. Submit overtime request
3. View "My Overtime Requests" section
4. ✅ Status should show "Pending Board Approval"

### Board Member Approval:

1. Login as Board Member (Chairman Marvin B. Flor)
2. Navigate to Overtime Approval
3. ✅ Should see HR manager overtime requests
4. ✅ Should be able to approve/reject HR overtime requests

## Security Notes

- Self-approval prevention is enforced at both frontend (UI) and backend (API) levels
- Backend validation ensures security even if frontend is bypassed
- Specific error codes allow for precise error handling and user feedback
- Board member access is maintained through existing RBAC middleware

## Summary

HR staff overtime requests are now properly secured against self-approval, with clear status indicators showing that Board of Directors approval is required. The system maintains the existing approval workflow for other employees while adding the necessary restrictions for HR staff.
