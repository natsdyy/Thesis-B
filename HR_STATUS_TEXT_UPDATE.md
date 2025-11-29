# HR Leave Request Status Text Update

## Problem Addressed

When HR managers (like Sarah Johnson) submit leave requests, the status was showing "Pending HR Approval" which was confusing since HR managers cannot approve their own requests. The status should indicate that Board of Directors approval is required.

## Solution Implemented

Updated status display logic in both the HR Leave Approvals view and the employee Leave Request component to show appropriate status text for HR staff requests.

### 1. HR Leave Approvals View (`frontend/src/views/hr/LeaveApprovals.vue`)

Updated the `getStatusDisplayText()` function to check if the request is from HR staff:

```javascript
const getStatusDisplayText = (status, request = null) => {
  switch ((status || "").toLowerCase()) {
    case "approved_by_hr":
      return "Approved";
    case "approved_by_manager":
      // Check if this is an HR staff member's request
      if (request && request.department === "Human Resource") {
        return "Pending Board Approval";
      }
      return "Pending HR";
    case "rejected":
      return "Rejected";
    case "pending":
      // Check if this is an HR staff member's request
      if (request && request.department === "Human Resource") {
        return "Pending Board Approval";
      }
      // Department employees (no branch_id) with pending status go directly to HR
      if (request && !request.branch_id) {
        return "Pending HR Approval";
      }
      return "Pending Manager";
    default:
      return "Pending Manager";
  }
};
```

### 2. Employee Leave Request Component (`frontend/src/components/LeaveRequest.vue`)

Added auth store import and updated status display for HR staff viewing their own requests:

```javascript
import { useAuthStore } from "../stores/authStore";

const authStore = useAuthStore();
const currentUser = computed(() => authStore.user);

const getStatusDisplayText = (status) => {
  const isHRStaff = currentUser.value?.department === "Human Resource";

  switch ((status || "").toLowerCase()) {
    case "approved_by_hr":
      return "Approved";
    case "approved_by_manager":
      return isHRStaff ? "Pending Board Approval" : "Manager Approved";
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

- HR Manager's pending request: **"Pending HR Approval"** ❌
- HR Manager's manager-approved request: **"Manager Approved"** ❌

### After:

- HR Manager's pending request: **"Pending Board Approval"** ✅
- HR Manager's manager-approved request: **"Pending Board Approval"** ✅

## Impact

### For HR Staff (Sarah Johnson):

- ✅ Clear indication that their requests need Board approval
- ✅ No confusion about who can approve their requests
- ✅ Consistent status messaging across all views

### For Board Members:

- ✅ Clear identification of HR requests requiring their approval
- ✅ Proper workflow hierarchy displayed

### For Other Employees:

- ✅ No change in their status display
- ✅ Still shows appropriate manager/HR approval flow

## Testing

### HR Manager View (Employee Component):

1. Login as HR Manager (Sarah Johnson)
2. Submit a leave request
3. View "My Leave Requests" section
4. Status should show: **"Pending Board Approval"**

### HR Manager View (Leave Approvals Page):

1. Login as HR Manager
2. Navigate to Leave Approvals
3. View their own requests in the list
4. Status should show: **"Pending Board Approval"**

### Board Member View:

1. Login as Board Member (Chairman Marvin B. Flor)
2. Navigate to Leave Approvals
3. View HR Manager requests
4. Status should show: **"Pending Board Approval"**

## Files Modified

1. **`frontend/src/views/hr/LeaveApprovals.vue`**
   - Enhanced `getStatusDisplayText()` function
   - Added department checking for HR staff requests

2. **`frontend/src/components/LeaveRequest.vue`**
   - Added `useAuthStore` import
   - Added `currentUser` computed property
   - Enhanced `getStatusDisplayText()` function with HR staff detection

## Future Considerations

Consider implementing similar status updates for other department heads or managers who might have special approval hierarchies (e.g., Finance Manager requests needing Board approval).

## Summary

HR staff leave requests now properly display "Pending Board Approval" status, providing clear indication of the required approval hierarchy and eliminating confusion about who can approve HR manager requests.
