# Leave Self-Approval Prevention Fix

## Problem Identified

The leave approval system was allowing employees to approve their own leave requests. This was evident when Sarah Johnson (HR Manager, employee ID 27) both submitted and approved her own leave request, which is a serious workflow violation.

## Root Cause

1. **Backend Model Issues:**
   - The `LeaveRequest.js` model had comments indicating "Allow employees to approve their own requests"
   - No validation to prevent self-approval in `approveByManager()` and `approveByHR()` methods
   - No validation to prevent self-rejection in `reject()` method

2. **Backend Route Issues:**
   - Routes didn't check if the approver is the same as the request creator
   - No proper error handling for self-approval attempts

3. **Frontend Issues:**
   - No logic to hide approval/rejection buttons for user's own requests
   - No handling of self-approval error responses

## Solution Implemented

### 1. Backend Model Updates (`backend/models/LeaveRequest.js`)

#### Enhanced `approveByManager()` method:

- Added validation: `if (leaveRequest.employee_id === managerId)`
- Throws error: "You cannot approve your own leave request. Please have another manager or HR approve it."

#### Enhanced `approveByHR()` method:

- Added validation: `if (leaveRequest.employee_id === hrId)`
- Throws error: "You cannot approve your own leave request. HR staff requests must be approved by Board of Directors or Super Admin."

#### Enhanced `reject()` method:

- Added validation: `if (leaveRequest.employee_id === rejectedById)`
- Throws error: "You cannot reject your own leave request. Please have a manager or HR handle this."

#### Fixed Manager Auto-Approval:

- Updated the create method to prevent managers from auto-approving their own requests
- Manager requests now bypass manager approval step but still require HR approval

### 2. Backend Route Updates (`backend/routes/leave.js`)

#### Enhanced Error Handling:

- Added specific error codes: `SELF_APPROVAL_NOT_ALLOWED`, `SELF_REJECTION_NOT_ALLOWED`
- Returns HTTP 403 status for self-approval attempts
- Improved error messages for better user experience

### 3. Frontend Updates (`frontend/src/views/hr/LeaveApprovals.vue`)

#### Added Self-Approval Prevention:

- Imported `useAuthStore` to access current user information
- Updated `canApprove()` function to check: `request.employee_id === currentUser.value.id`
- Updated `canReject()` function with same validation
- Approval/rejection buttons now hidden for user's own requests

#### Enhanced Error Handling:

- Added handling for `SELF_APPROVAL_NOT_ALLOWED` and `SELF_REJECTION_NOT_ALLOWED` error codes
- User-friendly error messages explaining why self-approval is not allowed

## Testing Instructions

### 1. Backend API Testing

**Test Self-Approval Prevention:**

```bash
# Create a leave request as user with ID 27
POST /api/leave
Authorization: Bearer <user_27_token>
{
  "from_date": "2025-11-01",
  "to_date": "2025-11-02",
  "leave_type": "Vacation Leave",
  "reason": "Test request"
}

# Try to approve it as the same user (should fail)
POST /api/leave/{request_id}/approve-hr
Authorization: Bearer <user_27_token>
{
  "notes": "Attempting self-approval"
}

# Expected Response:
{
  "success": false,
  "message": "You cannot approve your own leave request. HR staff requests must be approved by Board of Directors or Super Admin.",
  "code": "SELF_APPROVAL_NOT_ALLOWED"
}
```

**Test Manager Self-Approval Prevention:**

```bash
# Create leave request as manager
POST /api/leave
Authorization: Bearer <manager_token>

# Try to approve as same manager (should fail)
POST /api/leave/{request_id}/approve-manager
Authorization: Bearer <manager_token>

# Expected: 403 error with SELF_APPROVAL_NOT_ALLOWED
```

### 2. Frontend UI Testing

**Test Approval Button Visibility:**

1. Log in as HR Manager (e.g., Sarah Johnson)
2. Go to Leave Approvals page
3. Create your own leave request
4. Verify that your own request shows NO approval/rejection buttons
5. Log in as different HR staff member
6. Verify that other users' requests show approval/rejection buttons

**Test Error Handling:**

1. If somehow a self-approval attempt is made (via API directly)
2. Frontend should display user-friendly error: "You cannot approve your own leave request"

### 3. Workflow Testing

**Test Proper HR Approval Hierarchy:**

1. HR staff creates leave request
2. Request should require approval from Board of Directors or Super Admin
3. Regular HR staff cannot approve other HR staff requests
4. Only higher authority (Board/Super Admin) can approve HR requests

## Files Modified

1. `backend/models/LeaveRequest.js` - Added self-approval prevention logic
2. `backend/routes/leave.js` - Enhanced error handling and status codes
3. `frontend/src/views/hr/LeaveApprovals.vue` - Added UI logic and error handling

## Security Implications

This fix prevents a significant security vulnerability where employees could:

- Approve their own leave requests
- Bypass proper approval workflows
- Potentially abuse the leave system

The fix ensures proper separation of duties and maintains audit trail integrity.

## Rollback Instructions

If issues arise, the following can be reverted:

1. Remove self-approval validation from backend model methods
2. Remove error code handling from backend routes
3. Remove frontend user ID checks in approval functions

However, this would restore the security vulnerability.

## Next Steps

1. **Test thoroughly** in development environment
2. **Deploy to staging** for additional validation
3. **Update documentation** to reflect proper approval hierarchy
4. **Train users** on new workflow restrictions
5. **Monitor logs** for any self-approval attempts (should now be blocked)

## Additional Considerations

- Consider implementing role-based approval hierarchies
- HR requests might need Board of Directors approval
- Manager requests might need HR + higher management approval
- Add audit logging for all approval attempts (including blocked ones)
