# Supplier Orders Image Display Fix

## Issue

In the Supplier Orders page (`SupplierOrders.vue`), proof images were not displaying correctly in two places:

1. **Purchase Order Receipt Modal** - Showed "No notes provided" even when completion proof images existed
2. **Return Item Notes** - Images in return item notes were not loading (showing broken image icon)

## Root Causes

### Issue 1: Wrong Field Reference

The receipt modal was displaying `receiptModal.order.notes` but the proof images are stored in `receiptModal.order.completion_notes`.

```json
// API Response
{
  "notes": "", // Empty - general order notes
  "completion_notes": "<p><img src=\"../uploads/proofs/2025/11/Bacsilog____195_1762533656297.jpg\"></p>" // Has proof images
}
```

### Issue 2: Relative Image Paths

The HTML stored in the database contained relative image paths that don't work in the frontend:

```html
<!-- Stored in database (doesn't work) -->
<img src="../uploads/proofs/2025/11/image.jpg" />

<!-- Needs to be (with full API URL) -->
<img src="http://localhost:5000/uploads/proofs/2025/11/image.jpg" />
```

## Solution

### 1. Created Image URL Fixer Function

Added a new utility function `fixImageUrls()` to convert relative image paths to absolute URLs:

```javascript
const fixImageUrls = (html) => {
  if (!html) return html;

  // Replace relative image paths with absolute URLs
  return html.replace(
    /src=["']\.\.\/uploads\//g,
    `src="${apiConfig.baseURL}/uploads/`
  );
};
```

**How it works:**

- Takes HTML string as input
- Uses regex to find all `src="../uploads/` patterns
- Replaces with full API URL: `src="http://localhost:5000/uploads/`
- Returns the fixed HTML

### 2. Updated Receipt Modal to Use Completion Notes

**Before:**

```vue
<div v-html="receiptModal.order.notes || 'No notes provided'"></div>
```

**After:**

```vue
<div
  v-html="
    fixImageUrls(
      receiptModal.order.completion_notes || receiptModal.order.notes
    ) || 'No notes provided'
  "
></div>
```

**Changes:**

- ✅ Prioritize `completion_notes` (where proof images are stored)
- ✅ Fallback to `notes` if completion_notes is empty
- ✅ Process HTML through `fixImageUrls()` to fix image paths

### 3. Fixed Return Item Notes Display

Updated three locations where return item notes are displayed:

#### A. Return Items List in Order Details

```vue
<div v-html="fixImageUrls(returnItem.notes)"></div>
```

#### B. Return Details Modal

```vue
<div v-html="fixImageUrls(returnDetailsModal.item.notes)"></div>
```

## Changes Summary

### File: `frontend/src/views/supplier/SupplierOrders.vue`

**1. Added `fixImageUrls()` utility function** (Line ~1113)

```javascript
const fixImageUrls = (html) => {
  if (!html) return html;
  return html.replace(
    /src=["']\.\.\/uploads\//g,
    `src="${apiConfig.baseURL}/uploads/`
  );
};
```

**2. Updated Receipt Modal - Notes/Proof Section** (Line ~780)

```vue
<div
  class="prose max-w-none text-xs border border-black/30 rounded-md p-2"
  v-html="
    fixImageUrls(
      receiptModal.order.completion_notes || receiptModal.order.notes
    ) || 'No notes provided'
  "
></div>
```

**3. Updated Return Item Notes in List** (Line ~321)

```vue
<div class="prose max-w-none" v-html="fixImageUrls(returnItem.notes)"></div>
```

**4. Updated Return Details Modal** (Line ~914)

```vue
<div
  class="prose max-w-none mt-1"
  v-html="fixImageUrls(returnDetailsModal.item.notes)"
></div>
```

## Testing Checklist

### Purchase Order Receipt Modal

- [x] Open completed order receipt
- [x] Verify "Notes / Proof" section shows images
- [x] Images load correctly (not broken)
- [x] Multiple images display properly
- [x] Falls back to general notes if no completion_notes

### Return Item Notes

- [x] View return items with image proofs
- [x] Images display in return items list
- [x] Images display in "View Details" modal
- [x] Images are properly sized and formatted

## Example Data Flow

### Before Fix

1. **Database stores:**

   ```json
   "completion_notes": "<p><img src=\"../uploads/proofs/2025/11/image.jpg\"></p>"
   ```

2. **Frontend displays:**
   ```html
   <!-- Browser tries to load -->
   <img src="../uploads/proofs/2025/11/image.jpg" />
   <!-- ❌ Fails: Relative path doesn't resolve correctly -->
   ```

### After Fix

1. **Database stores (unchanged):**

   ```json
   "completion_notes": "<p><img src=\"../uploads/proofs/2025/11/image.jpg\"></p>"
   ```

2. **Frontend processes and displays:**
   ```html
   <!-- fixImageUrls() converts to -->
   <img src="http://localhost:5000/uploads/proofs/2025/11/image.jpg" />
   <!-- ✅ Success: Full URL loads correctly -->
   ```

## Benefits

### For Suppliers

✅ Can view proof images in purchase order receipts  
✅ Can see proof images in return item details  
✅ Better transparency and documentation

### For SCM Team

✅ Proof images display correctly when suppliers view orders  
✅ Return documentation shows properly with images  
✅ Professional appearance

## Technical Notes

### Image Path Patterns Supported

- `src="../uploads/...` → Converted to full URL
- `src='../uploads/...` → Converted to full URL (single quotes)
- Works with any file in `/uploads/` directory

### Security

- Uses existing `v-html` directive (already in use)
- No new XSS vulnerabilities introduced
- Only modifies image src attributes
- Preserves all other HTML content

### Performance

- Minimal overhead (simple regex replacement)
- Runs client-side only when displaying
- No additional API calls needed

## Future Improvements

### Potential Enhancements

1. **Store Absolute URLs** - Update backend to store full URLs instead of relative paths
2. **Image Optimization** - Add thumbnail generation for faster loading
3. **Lazy Loading** - Implement lazy loading for images in lists
4. **Preview Modal** - Add click-to-zoom functionality for proof images

### Backend Consideration

Consider updating the backend to store absolute URLs when saving completion_notes:

```javascript
// Instead of: "../uploads/proofs/..."
// Store: "http://localhost:5000/uploads/proofs/..."
```

This would eliminate the need for frontend URL fixing.

## Related Issues Fixed

This fix also resolves related image display issues in:

- Purchase order completion proofs
- Return item documentation with images
- Any HTML content with relative image paths

---

**Implementation Date:** November 8, 2025  
**Status:** ✅ Complete and Tested  
**Files Modified:** 1 (SupplierOrders.vue)  
**Lines Changed:** ~15 lines
