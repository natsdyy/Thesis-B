# Return to Supplier - UI Guide

## Visual Flow

### 1. SCM View - Item Returns Audit Trail (POreturnItems.vue)

**Location:** Purchase Order → Actions → "View Returns"

#### Actions Dropdown (Updated)

**Before:**

```
┌─────────────────────┐
│ ✓ Complete         │ (Green)
│ ⚠ Cancel           │ (Red) - Pending only
│ 📄 View Receipt    │ (Gray) - Completed only
└─────────────────────┘
```

**After:**

```
┌──────────────────────────┐
│ 📦 Send to Supplier      │ (Blue) - NEW! For Pending/Processed
│ ✓ Complete               │ (Green) - For Pending/Processed
│ ⚠ Cancel                 │ (Red) - Pending only
│ 📄 View Receipt          │ (Gray) - Completed only
└──────────────────────────┘
```

#### "Send to Supplier" Action Flow

**Step 1: Click "Send to Supplier"**

```
Confirmation Dialog:
┌────────────────────────────────────────────┐
│ Send this return to the supplier?          │
│                                            │
│ Item: Tomato                               │
│ Quantity: 10 kg                            │
│                                            │
│ The supplier will be notified to arrange   │
│ pickup.                                    │
│                                            │
│        [Cancel]  [OK]                      │
└────────────────────────────────────────────┘
```

**Step 2: Success**

```
Toast Notification:
┌────────────────────────────────────────┐
│ ✓ Return marked for supplier pickup    │
└────────────────────────────────────────┘
```

**Step 3: Return Status Updates**

```
Status Badge Changes:
Before: [Pending] (Yellow badge)
After:  [Processed] (Blue badge)

Notes Update:
Before: "Items damaged in transit"
After:  "Items damaged in transit
         [Sent to Supplier for pickup/processing]"
```

### 2. Supplier Portal View (SupplierOrders.vue)

**Location:** Supplier Portal → Orders → Completed Order Details

#### Returns Section Display

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠ Item Returns                         [🔄 Refresh]          │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ Tomato                              [Processed]      │    │
│ │ Return Qty: 10 kg                                   │    │
│ │                                                      │    │
│ │ Reason: Defective                                   │    │
│ │ "Items damaged in transit                           │    │
│ │  [Sent to Supplier for pickup/processing]"          │    │
│ │                                                      │    │
│ │ Logged by: John Doe on Oct 7, 2025 2:00 PM          │    │
│ │                                                      │    │
│ │ [✓ Accept Return]  [ℹ View Details]                 │    │
│ └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

#### "Accept Return" Flow

**Step 1: Click "Accept Return"**

```
Confirmation Dialog:
┌────────────────────────────────────────────┐
│ Are you sure you want to accept this      │
│ return?                                    │
│                                            │
│ Item: Tomato                               │
│ Quantity: 10 kg                            │
│ Reason: Defective                          │
│                                            │
│        [Cancel]  [OK]                      │
└────────────────────────────────────────────┘
```

**Step 2: Processing**

```
Button State:
[⏳ Processing...] (disabled, with spinner)
```

**Step 3: Success**

```
Toast Notification:
┌────────────────────────────────────┐
│ ✓ Return accepted successfully     │
└────────────────────────────────────┘

Return Status Updates:
Status: [Processed] ✓ (remains Processed, but acknowledged)
Message: "✓ Return processed on Oct 7, 2025 2:15 PM"
```

### 3. Complete Workflow Visual

```
┌─────────────────────────────────────────────────────────────────┐
│                     RETURN TO SUPPLIER WORKFLOW                  │
└─────────────────────────────────────────────────────────────────┘

    SCM Staff                  System                 Supplier
        │                        │                        │
        │ 1. Create Return       │                        │
        ├───────────────────────>│                        │
        │     [Pending]          │                        │
        │                        │                        │
        │ 2. Send to Supplier    │                        │
        ├───────────────────────>│                        │
        │     [Processed]        │                        │
        │   + Note added         │                        │
        │                        │                        │
        │                        │ 3. View Return         │
        │                        │<───────────────────────┤
        │                        │   Shows in portal      │
        │                        │                        │
        │                        │ 4. Accept Return       │
        │                        │<───────────────────────┤
        │                        │   [Processed]          │
        │                        │   + Timestamp          │
        │                        │                        │
        │ 5. Complete Return     │                        │
        ├───────────────────────>│                        │
        │     [Completed]        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
```

## Button States

### "Send to Supplier" Button

**Visibility:**

- ✅ Shows for returns with status: `Pending` or `Processed`
- ❌ Hidden for returns with status: `Completed`

**Colors:**

- Icon: 📦 (Package)
- Text: Blue (text-info)
- On hover: Light blue background

**States:**

```javascript
// Enabled
<button class="text-info">
  <Package class="w-4 h-4" />
  Send to Supplier
</button>

// Disabled (shouldn't happen based on visibility rules)
// But if needed:
<button disabled class="text-gray-400 cursor-not-allowed">
  <Package class="w-4 h-4" />
  Send to Supplier
</button>
```

### "Accept Return" Button (Supplier Portal)

**Visibility:**

- ✅ Shows for returns with status: `Pending`
- ❌ Hidden for returns with status: `Processed` or `Completed`

**Colors:**

- Background: Green (bg-success)
- Text: White
- On hover: Slightly darker green

**States:**

```javascript
// Normal
<button class="btn btn-xs bg-success text-white hover:bg-success/80">
  Accept Return
</button>

// Loading
<button class="btn btn-xs bg-success text-white" disabled>
  <span class="loading loading-spinner loading-xs"></span>
  Processing...
</button>
```

## Status Badges

### Color Coding

```css
Pending:   [Pending]    Yellow background, dark yellow text
Processed: [Processed]  Blue background, dark blue text
Completed: [Completed]  Green background, dark green text
```

### Implementation

```html
<span
  class="badge badge-sm"
  :class="{
    'badge-warning': returnItem.status === 'Pending',
    'badge-info': returnItem.status === 'Processed',
    'badge-success': returnItem.status === 'Completed'
  }"
>
  {{ returnItem.status }}
</span>
```

## Toast Notifications

### Success Messages

| Action           | Message                             | Color |
| ---------------- | ----------------------------------- | ----- |
| Send to Supplier | "Return marked for supplier pickup" | Green |
| Accept Return    | "Return accepted successfully"      | Green |
| Complete Return  | "Return completed successfully"     | Green |
| Cancel Return    | "Return cancelled successfully"     | Green |

### Error Messages

| Scenario       | Message                                                     | Color |
| -------------- | ----------------------------------------------------------- | ----- |
| Invalid Status | "Only pending or processed returns can be sent to supplier" | Red   |
| Process Failed | "Failed to send return to supplier"                         | Red   |
| Accept Failed  | "Failed to accept return"                                   | Red   |

### Implementation

```javascript
// Success
showToast("success", "Return marked for supplier pickup");

// Error
showToast("error", "Failed to send return to supplier");
```

## Responsive Design

### Desktop View (>1024px)

- Dropdown width: 192px (w-48)
- Full text labels visible
- Icons + text for all actions

### Tablet View (768px - 1024px)

- Dropdown width: auto-adjusts
- Text may wrap for longer labels
- Icons remain visible

### Mobile View (<768px)

- Dropdown becomes full-width
- Actions stack vertically
- Touch-friendly tap targets

## Accessibility

### Keyboard Navigation

- ✅ Tab through return list
- ✅ Enter to open actions dropdown
- ✅ Arrow keys to navigate dropdown
- ✅ Enter to select action
- ✅ Esc to close dropdown/modal

### Screen Readers

- All buttons have descriptive labels
- Status changes announced
- Confirmation dialogs properly labeled
- ARIA attributes for modals

### Color Contrast

- All text meets WCAG AA standards
- Status badges have sufficient contrast
- Buttons readable in all states

## Testing Checklist

### Visual Tests

- [ ] "Send to Supplier" button appears correctly
- [ ] Button has Package icon
- [ ] Button is blue (text-info)
- [ ] Dropdown width is adequate (w-48)
- [ ] Actions are in correct order
- [ ] Status badges display correct colors
- [ ] Toast notifications appear
- [ ] Confirmation dialogs are centered
- [ ] Loading spinners work

### Functional Tests

- [ ] Click "Send to Supplier" shows confirmation
- [ ] Confirming updates status to Processed
- [ ] Note is appended with pickup message
- [ ] Supplier can see the return
- [ ] Supplier can accept the return
- [ ] SCM can complete the return
- [ ] Cancelled returns can't be sent
- [ ] Completed returns don't show send button

### Edge Cases

- [ ] Returns with very long notes display correctly
- [ ] Multiple rapid clicks don't cause issues
- [ ] Network errors show proper error message
- [ ] Confirmation cancellation works
- [ ] Status updates reflect immediately

## Screenshots Locations

For visual reference, check these views:

1. **SCM Return Actions:**
   - Path: Purchase Orders → [Any Completed PO] → "View Returns" → Actions dropdown

2. **Supplier Returns Section:**
   - Path: Supplier Portal → Orders → [Any Completed Order] → Returns Section

3. **Confirmation Dialogs:**
   - Triggered by clicking "Send to Supplier" or "Accept Return"

4. **Toast Notifications:**
   - Appear in top-right corner after actions complete

## Notes for Developers

### Styling Classes Used

- `text-info`: Blue text for "Send to Supplier"
- `badge-warning`: Yellow badge for Pending
- `badge-info`: Blue badge for Processed
- `badge-success`: Green badge for Completed
- `w-48`: Width for dropdown (192px)

### Icons from lucide-vue-next

- `Package`: For "Send to Supplier"
- `CheckCircle`: For "Complete"
- `AlertTriangle`: For "Cancel"
- `FileText`: For "View Receipt"
- `RefreshCw`: For "Refresh"

### Confirmation Pattern

```javascript
if (!confirm("Message here")) {
  return; // User cancelled
}
// Proceed with action
```

### Toast Pattern

```javascript
showToast("success", "Message here");
// Auto-dismisses after 3 seconds
```
