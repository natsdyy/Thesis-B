# Supplier Order Status Update - UI Guide

## Visual Examples

### 1. Order with "Sent" Status

```
┌─────────────────────────────────────────────────────────────┐
│ PO-1759838413097                              [Sent]        │
│ Order Date: Oct 7, 2025                                     │
│                                                              │
│ Expected Delivery: Oct 8, 2025                              │
│ Total Amount: ₱4,500.00                                     │
│ Items: 1 item(s)                                            │
│                                                              │
│ Actions:                                                     │
│ [✓ Confirm Order]  [▼ Show Details]                        │
│  (Green Button)     (Outline Button)                        │
└─────────────────────────────────────────────────────────────┘
```

**Available Actions:**

- ✅ **Confirm Order** (Green button with checkmark icon)
- ℹ️ **Show Details** (Expands to show items)

---

### 2. Order with "Confirmed" Status

```
┌─────────────────────────────────────────────────────────────┐
│ PO-1759838413097                         [Confirmed]        │
│ Order Date: Oct 7, 2025                                     │
│                                                              │
│ Expected Delivery: Oct 8, 2025                              │
│ Total Amount: ₱4,500.00                                     │
│ Items: 1 item(s)                                            │
│                                                              │
│ Actions:                                                     │
│ [🕐 Mark In Progress]  [▼ Show Details]                    │
│  (Blue Button)          (Outline Button)                    │
└─────────────────────────────────────────────────────────────┘
```

**Available Actions:**

- 🔵 **Mark In Progress** (Blue button with clock icon)
- ℹ️ **Show Details** (Expands to show items)

---

### 3. Order with "In Progress" Status

```
┌─────────────────────────────────────────────────────────────┐
│ PO-1759838413097                      [In Progress]         │
│ Order Date: Oct 7, 2025                                     │
│                                                              │
│ Expected Delivery: Oct 8, 2025                              │
│ Total Amount: ₱4,500.00                                     │
│ Items: 1 item(s)                                            │
│                                                              │
│ Actions:                                                     │
│ [▼ Show Details]                                            │
│  (Outline Button)                                           │
└─────────────────────────────────────────────────────────────┘
```

**Available Actions:**

- ℹ️ **Show Details** (Expands to show items)
- ⏸️ No status update actions (awaiting SCM completion)

---

### 4. Order with "Completed" Status

```
┌─────────────────────────────────────────────────────────────┐
│ PO-1759838413097                         [Completed]        │
│ Order Date: Oct 7, 2025                                     │
│                                                              │
│ Expected Delivery: Oct 8, 2025                              │
│ Total Amount: ₱4,500.00                                     │
│ Items: 1 item(s)                                            │
│                                                              │
│ Actions:                                                     │
│ [📄 View Receipt]  [▼ Show Details]                        │
│  (Primary Button)   (Outline Button)                        │
└─────────────────────────────────────────────────────────────┘
```

**Available Actions:**

- 📄 **View Receipt** (Primary button with receipt icon)
- ℹ️ **Show Details** (Expands to show items with fulfillment data)

---

## Button States

### Confirm Order Button

**Normal State:**

```css
Class: btn btn-sm bg-success text-white hover:bg-success/90 border-none font-thin
Icon: CheckCircle (green checkmark)
Text: "Confirm Order"
```

**Loading State:**

```css
Class: btn btn-sm bg-success text-white border-none font-thin (disabled)
Icon: Loading spinner
Text: "Processing..."
```

**Visual:**

```
Normal:    [✓ Confirm Order]  (green, clickable)
Loading:   [⏳ Processing...]  (green, disabled, spinner)
```

---

### Mark In Progress Button

**Normal State:**

```css
Class: btn btn-sm bg-info text-white hover:bg-info/90 border-none font-thin
Icon: Clock (clock icon)
Text: "Mark In Progress"
```

**Loading State:**

```css
Class: btn btn-sm bg-info text-white border-none font-thin (disabled)
Icon: Loading spinner
Text: "Processing..."
```

**Visual:**

```
Normal:    [🕐 Mark In Progress]  (blue, clickable)
Loading:   [⏳ Processing...]     (blue, disabled, spinner)
```

---

## Confirmation Dialogs

### Confirm Order Dialog

```
┌────────────────────────────────────────────┐
│ Confirm order PO-1759838413097?            │
│                                            │
│ This will mark the order as confirmed     │
│ and ready for processing.                 │
│                                            │
│              [Cancel]  [OK]                │
└────────────────────────────────────────────┘
```

### Mark In Progress Dialog

```
┌────────────────────────────────────────────┐
│ Mark order PO-1759838413097 as In          │
│ Progress?                                  │
│                                            │
│ This will indicate you are working on     │
│ this order.                                │
│                                            │
│              [Cancel]  [OK]                │
└────────────────────────────────────────────┘
```

---

## Toast Notifications

### Success Messages

**Confirm Order Success:**

```
┌────────────────────────────────────┐
│ ✓ Order confirmed successfully!    │
└────────────────────────────────────┘
```

**Mark In Progress Success:**

```
┌────────────────────────────────────┐
│ ✓ Order marked as in progress!     │
└────────────────────────────────────┘
```

### Error Messages

**Confirm Order Error:**

```
┌────────────────────────────────────┐
│ ✗ Failed to confirm order          │
└────────────────────────────────────┘
```

**Mark In Progress Error:**

```
┌────────────────────────────────────┐
│ ✗ Failed to update order status    │
└────────────────────────────────────┘
```

---

## Complete Interaction Flow

### User Journey: Confirming an Order

```
1. Supplier sees order with [Sent] badge
   ↓
2. Green "Confirm Order" button is visible
   ↓
3. Clicks "Confirm Order"
   ↓
4. Confirmation dialog appears
   ↓
5. Clicks "OK"
   ↓
6. Button changes to: [⏳ Processing...]
   ↓
7. API call completes
   ↓
8. Success toast appears: "Order confirmed successfully!"
   ↓
9. Page refreshes
   ↓
10. Badge changes to [Confirmed]
    ↓
11. Button changes to "Mark In Progress" (blue)
```

### User Journey: Marking as In Progress

```
1. Supplier sees order with [Confirmed] badge
   ↓
2. Blue "Mark In Progress" button is visible
   ↓
3. Clicks "Mark In Progress"
   ↓
4. Confirmation dialog appears
   ↓
5. Clicks "OK"
   ↓
6. Button changes to: [⏳ Processing...]
   ↓
7. API call completes
   ↓
8. Success toast appears: "Order marked as in progress!"
   ↓
9. Page refreshes
   ↓
10. Badge changes to [In Progress]
    ↓
11. Status update buttons disappear
    ↓
12. Only "Show Details" button remains
```

---

## Responsive Design

### Desktop View (>768px)

```
Actions:  [Confirm Order]  [Show Details]
          (Side by side, full width buttons)
```

### Mobile View (<768px)

```
Actions:
[Confirm Order]
[Show Details]
(Stacked vertically, full width)
```

**CSS Class:**

```html
<div class="flex justify-end gap-2 mt-4 flex-wrap">
  <!-- Buttons auto-wrap on small screens -->
</div>
```

---

## Color Scheme

| Element                 | Color   | CSS Class                       |
| ----------------------- | ------- | ------------------------------- |
| Confirm Order Button    | Green   | `bg-success`                    |
| Mark In Progress Button | Blue    | `bg-info`                       |
| View Receipt Button     | Primary | `bg-primaryColor`               |
| Show Details Button     | Outline | `btn-outline text-primaryColor` |
| Success Toast           | Green   | `alert-success`                 |
| Error Toast             | Red     | `alert-error`                   |

---

## Status Badges

```css
[Sent]         - Yellow badge  (badge-warning)
[Confirmed]    - Blue badge    (badge-info)
[In Progress]  - Purple badge  (badge-primary)
[Completed]    - Green badge   (badge-success)
[Cancelled]    - Red badge     (badge-error)
```

**Visual:**

```
[Sent]         ⬛ Yellow
[Confirmed]    ⬛ Blue
[In Progress]  ⬛ Purple
[Completed]    ⬛ Green
[Cancelled]    ⬛ Red
```

---

## Accessibility Features

### Keyboard Navigation

- ✅ Tab to focus buttons
- ✅ Enter/Space to activate
- ✅ Esc to close dialogs

### Screen Readers

- ✅ Button labels are descriptive
- ✅ Loading state announced
- ✅ Success/error toasts announced
- ✅ Status changes announced

### Visual Feedback

- ✅ Hover states on all buttons
- ✅ Disabled state clearly visible
- ✅ Loading spinner for async operations
- ✅ Color-coded status badges

---

## Testing Scenarios

### Scenario 1: Happy Path - Quick Confirmation

1. Open order with "Sent" status
2. Click "Confirm Order"
3. Confirm in dialog
4. Verify success toast
5. Verify status changed to "Confirmed"
6. Verify button changed to "Mark In Progress"

### Scenario 2: Happy Path - Mark In Progress

1. Open order with "Confirmed" status
2. Click "Mark In Progress"
3. Confirm in dialog
4. Verify success toast
5. Verify status changed to "In Progress"
6. Verify status buttons disappeared

### Scenario 3: User Cancels Confirmation

1. Click "Confirm Order"
2. Click "Cancel" in dialog
3. Verify no API call made
4. Verify order status unchanged
5. Verify button still shows "Confirm Order"

### Scenario 4: Network Error

1. Disconnect network
2. Click "Confirm Order"
3. Confirm in dialog
4. Verify error toast appears
5. Verify status unchanged
6. Verify button returns to normal state

### Scenario 5: Multiple Orders

1. Confirm first order
2. While processing, try to confirm second order
3. Verify only one processes at a time
4. Verify both complete successfully

---

## Developer Notes

### Button Visibility Logic

```javascript
// Confirm Order: Show only for "Sent" orders
v-if="order.status === 'Sent'"

// Mark In Progress: Show only for "Confirmed" orders
v-if="order.status === 'Confirmed'"

// View Receipt: Show only for "Completed" orders
v-if="order.status === 'Completed'"

// Show Details: Always show
(no v-if condition)
```

### Processing State Logic

```javascript
// Disable button during processing
:disabled="processingOrder === order.id"

// Show spinner or icon
<span v-if="processingOrder === order.id" class="loading loading-spinner loading-xs"></span>
<CheckCircle v-else class="w-4 h-4" />

// Dynamic text
{{ processingOrder === order.id ? 'Processing...' : 'Confirm Order' }}
```

### Toast Display Pattern

```javascript
showToast(message, type);
// type: 'success' | 'error' | 'info' | 'warning'
// Auto-dismisses after 3 seconds
```

---

## Summary

This UI implementation provides:

- ✅ **Clear Visual Hierarchy:** Color-coded buttons based on action type
- ✅ **Intuitive Flow:** Status-based button visibility
- ✅ **Excellent Feedback:** Loading states, toasts, confirmations
- ✅ **Responsive Design:** Works on all screen sizes
- ✅ **Accessible:** Keyboard navigation and screen reader support
- ✅ **Professional Look:** Consistent with existing design system

The interface is self-explanatory and requires minimal training for suppliers to use effectively.
