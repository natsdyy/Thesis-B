# Cash Movement UI Updates

## Overview

Enhanced the Cash Movement table display to better show budget releases and improve user experience, especially for HQ/SCM (non-branch) movements.

## Date

October 6, 2025

---

## Changes Made to `CashMovement.vue`

### 1. Branch Column Enhancement

**BEFORE:**

```vue
<td>{{ movement.branch_name || '—' }}</td>
```

**AFTER:**

```vue
<td>
  <span :class="{ 'text-gray-500 italic': !movement.branch_name }">
    {{ formatBranchName(movement.branch_name) }}
  </span>
</td>
```

**New Helper Function:**

```javascript
const formatBranchName = (branchName) => {
  if (!branchName) {
    return "HQ/SCM";
  }
  return branchName;
};
```

**Benefits:**

- ✅ Shows "HQ/SCM" instead of "—" for budget releases to headquarters/supply chain
- ✅ Italic gray styling makes it visually distinct from branch movements
- ✅ Clearer indication that this is a central/non-branch transaction

---

### 2. Source Column Enhancement

**BEFORE:**

```vue
<td>{{ movement.source || '—' }}</td>
```

**AFTER:**

```vue
<td>
  <span class="text-xs">{{ formatSource(movement.source) }}</span>
</td>
```

**New Helper Function:**

```javascript
const formatSource = (source) => {
  if (!source) return "—";

  const sourceMap = {
    remittance: "Branch Remittance",
    budget_release: "Budget Release",
    manual: "Manual Entry",
    loan: "Loan",
    expense: "Expense",
  };

  return (
    sourceMap[source] ||
    source.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
};
```

**Display Mapping:**

- `remittance` → "Branch Remittance"
- `budget_release` → "Budget Release" ✨
- `manual` → "Manual Entry"
- `loan` → "Loan"
- `expense` → "Expense"
- Any other → Title cased with underscores removed

**Benefits:**

- ✅ User-friendly labels instead of technical field names
- ✅ Easy to identify budget releases at a glance
- ✅ Consistent formatting across all sources

---

### 3. Type Column Enhancement (Badge Styling)

**BEFORE:**

```javascript
const getMovementTypeClass = (type) => {
  return type === "in"
    ? "badge badge-sm bg-success/20 text-success"
    : "badge badge-sm bg-warning/20 text-warning";
};
```

**AFTER:**

```javascript
const getMovementTypeClass = (type) => {
  return type === "in"
    ? "badge badge-sm bg-success/20 text-success"
    : "badge badge-sm bg-error/20 text-error";
};
```

**Visual Changes:**

- **Inflow**: Green badge (unchanged)
- **Outflow**: Red/Error badge (was yellow/warning) ✨

**Benefits:**

- ✅ Red makes outflows more visually prominent
- ✅ Better contrast between inflows and outflows
- ✅ Aligns with accounting standards (red = money out)

---

### 4. Amount Column Enhancement

**BEFORE:**

```vue
<td>
  <font-awesome-icon icon="fa-solid fa-peso-sign" class="!w-3 !h-3" />
  {{ Number(movement.amount || 0).toLocaleString('en-PH', {...}) }}
</td>
```

**AFTER:**

```vue
<td
  :class="{
    'text-error font-semibold': movement.movement_type === 'out',
    'text-success font-semibold': movement.movement_type === 'in',
  }"
>
  <font-awesome-icon icon="fa-solid fa-peso-sign" class="!w-3 !h-3" />
  {{ Number(movement.amount || 0).toLocaleString('en-PH', {...}) }}
</td>
```

**Visual Changes:**

- **Inflow amounts**: Green and bold
- **Outflow amounts**: Red and bold ✨

**Benefits:**

- ✅ Color coding makes it immediately clear if money is coming in or going out
- ✅ Bold font emphasizes the amounts
- ✅ Consistent with financial reporting conventions

---

### 5. Notes Column Enhancement

**BEFORE:**

```vue
<td>{{ movement.notes || '—' }}</td>
```

**AFTER:**

```vue
<td class="max-w-xs">
  <div class="truncate" :title="movement.notes || ''">
    {{ movement.notes || '—' }}
  </div>
</td>
```

**Benefits:**

- ✅ Long notes are truncated to prevent table overflow
- ✅ Full text shown on hover (tooltip via title attribute)
- ✅ Max width prevents column from becoming too wide
- ✅ Better table layout and readability

---

## Visual Comparison

### Before

```
| Date     | Branch          | Amount      | Source      | Type   | Notes                    |
|----------|-----------------|-------------|-------------|--------|--------------------------|
| Oct 6    | —               | ₱10,000.00  | budget_release | Outflow | Budget released for ... |
| Oct 5    | Burol Main      | ₱2,925.00   | remittance  | Inflow | Remittance for today     |
```

### After

```
| Date     | Branch          | Amount                | Source              | Type       | Notes                    |
|----------|-----------------|----------------------|---------------------|------------|--------------------------|
| Oct 6    | HQ/SCM          | ₱10,000.00 (red)     | Budget Release      | Outflow ⚠️ | Budget released for ...  |
| Oct 5    | Burol Main      | ₱2,925.00 (green)    | Branch Remittance   | Inflow ✅  | Remittance for today     |
```

**Visual Improvements:**

- ✨ "HQ/SCM" instead of "—" (italic gray)
- ✨ Amounts color-coded (red for out, green for in)
- ✨ Amounts in bold
- ✨ Source labels user-friendly
- ✨ Outflow badge in red (was yellow)
- ✨ Long notes truncated with hover tooltip

---

## Example: Budget Release Entry

When a budget is released for SCM, the entry will look like:

```
Date: Oct 6, 2025, 10:53 AM
Branch: HQ/SCM (italic gray)
Amount: ₱10,000.00 (red, bold)
Source: Budget Release (small text)
Type: Outflow (red badge)
Notes: Budget released for Egg restock (BR2025043) - SCM (truncated if long)
```

---

## Example: Branch Remittance Entry

Branch remittances will look like:

```
Date: Oct 5, 2025, 09:33 PM
Branch: Burol Main Branch
Amount: ₱2,925.00 (green, bold)
Source: Branch Remittance (small text)
Type: Inflow (green badge)
Notes: Remittance for today
```

---

## User Experience Improvements

### 1. At a Glance Recognition

- **Red amounts** = Money going out
- **Green amounts** = Money coming in
- **HQ/SCM** = Central/headquarters transaction
- **Branch name** = Branch-specific transaction

### 2. Clear Source Identification

- "Budget Release" clearly indicates this is a budget release outflow
- "Branch Remittance" clearly indicates this is branch income
- No more confusing technical field names

### 3. Better Data Density

- Truncated notes prevent horizontal scrolling
- Hover shows full notes when needed
- Table remains compact and scannable

### 4. Visual Hierarchy

- Bold amounts draw attention to the numbers that matter
- Color coding provides instant context
- Badges clearly mark transaction direction

---

## Accessibility

### Color Independence

- While colors provide quick visual cues, the badges also have text labels
- Amount direction is clear from both color AND badge text
- Screen readers will still get full information

### Hover States

- Full notes available on hover
- Title attribute provides native browser tooltip
- Works with keyboard navigation

---

## Responsive Design

The table maintains its responsive properties:

- Horizontal scroll on small screens
- Columns adapt to content
- Max-width prevents excessive column width
- Pagination keeps data manageable

---

## Testing Scenarios

### Scenario 1: Budget Release to SCM

```javascript
{
  branch_id: null,
  movement_type: "out",
  amount: 10000,
  source: "budget_release",
  notes: "Budget released for Egg restock (BR2025043) - SCM"
}
```

**Expected Display:**

- Branch: "HQ/SCM" (italic gray)
- Amount: "₱10,000.00" (red, bold)
- Source: "Budget Release"
- Type: "Outflow" (red badge)

### Scenario 2: Branch Remittance

```javascript
{
  branch_id: 6,
  branch_name: "Burol Main Branch",
  movement_type: "in",
  amount: 2925,
  source: "remittance",
  notes: "Remittance for today"
}
```

**Expected Display:**

- Branch: "Burol Main Branch" (normal)
- Amount: "₱2,925.00" (green, bold)
- Source: "Branch Remittance"
- Type: "Inflow" (green badge)

### Scenario 3: Very Long Notes

```javascript
{
  notes: "Budget released for comprehensive inventory restock including eggs, flour, sugar, and other essential ingredients required for daily operations at the central kitchen facility - SCM Department - Approved by Finance Manager Patricia Garcia on October 6, 2025";
}
```

**Expected Display:**

- Notes: "Budget released for comprehensive inventory rest..." (truncated)
- Hover: Full text in tooltip

---

## Browser Compatibility

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support
- ✅ Mobile browsers: Full support (with horizontal scroll)

---

## Performance

- No performance impact (pure CSS and simple string operations)
- Helper functions are lightweight
- No additional API calls
- Efficient rendering with Vue reactivity

---

## Summary

### Updated Components

✅ `frontend/src/components/finance/CashMovement.vue`

### New Helper Functions

1. `formatBranchName()` - Shows "HQ/SCM" for null branches
2. `formatSource()` - Converts technical names to user-friendly labels

### Enhanced Styling

1. Branch column - Italic gray for HQ/SCM
2. Amount column - Color-coded and bold
3. Type column - Red badges for outflows
4. Notes column - Truncated with tooltip

### Result

✨ **Professional, clear, and user-friendly cash movement display!**

Users can now easily distinguish between:

- Branch vs HQ/SCM movements
- Inflows vs Outflows (by color and badge)
- Budget releases vs Remittances (by source label)
- Full context via notes (with truncation for long text)
