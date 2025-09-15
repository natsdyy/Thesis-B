const { db } = require("../config/database");

class BranchReturn {
  static async createReturn({
    branch_id,
    return_type,
    items,
    notes,
    created_by,
  }) {
    if (
      !branch_id ||
      !return_type ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      throw new Error("branch_id, return_type, and items are required");
    }

    return await db.transaction(async (trx) => {
      const [ret] = await trx("branch_returns")
        .insert({
          branch_id,
          return_type,
          status: "Pending",
          notes,
          created_by,
        })
        .returning("*");

      for (const it of items) {
        if (!it.branch_inventory_item_id || !it.quantity) {
          throw new Error(
            "branch_inventory_item_id and quantity are required for items"
          );
        }
        await trx("branch_return_items").insert({
          branch_return_id: ret.id,
          branch_inventory_item_id: it.branch_inventory_item_id,
          menu_item_id: it.menu_item_id || null,
          item_name: it.item_name,
          unit: it.unit || null,
          quantity: parseFloat(it.quantity),
          main_inventory_item_id: it.main_inventory_item_id || null,
          notes: it.notes || null,
        });
      }

      return await this.getById(ret.id, trx);
    });
  }

  static async getById(id, trx = null) {
    const knex = trx || db;
    const header = await knex("branch_returns as br")
      .leftJoin("branches as b", "br.branch_id", "b.id")
      .leftJoin("employees as c", "br.created_by", "c.id")
      .leftJoin("employees as a", "br.approved_by", "a.id")
      .leftJoin("employees as r", "br.rejected_by", "r.id")
      .select(
        "br.*",
        knex.raw("COALESCE(b.name,'') as branch_name"),
        knex.raw(
          "COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,'') as created_by_name"
        ),
        knex.raw(
          "COALESCE(a.first_name,'') || ' ' || COALESCE(a.last_name,'') as approved_by_name"
        ),
        knex.raw(
          "COALESCE(r.first_name,'') || ' ' || COALESCE(r.last_name,'') as rejected_by_name"
        )
      )
      .where("br.id", id)
      .whereNull("br.deleted_at")
      .first();
    if (!header) return null;
    const items = await knex("branch_return_items")
      .where("branch_return_id", id)
      .whereNull("deleted_at")
      .orderBy("id", "asc");
    return { ...header, items };
  }

  static async list({
    branch_id,
    status,
    return_type,
    page = 1,
    limit = 10,
  } = {}) {
    const query = db("branch_returns as br")
      .leftJoin("branches as b", "br.branch_id", "b.id")
      .select("br.*", db.raw("COALESCE(b.name,'') as branch_name"))
      .whereNull("br.deleted_at")
      .orderBy("br.created_at", "desc");
    if (branch_id) query.where("br.branch_id", branch_id);
    if (status) query.where("br.status", status);
    if (return_type) query.where("br.return_type", return_type);

    const offset = (Number(page) - 1) * Number(limit);
    const [rows, [{ count }]] = await Promise.all([
      query.clone().limit(limit).offset(offset),
      query.clone().clearSelect().clearOrder().count("* as count"),
    ]);

    // Attach items for each return in a single additional query
    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      const allItems = await db("branch_return_items")
        .select(
          "id",
          "branch_return_id",
          "branch_inventory_item_id",
          "item_name",
          "unit",
          "quantity",
          "main_inventory_item_id",
          "menu_item_id",
          "notes",
          "created_at",
          "updated_at",
          "deleted_at"
        )
        .whereIn("branch_return_id", ids)
        .whereNull("deleted_at")
        .orderBy(["branch_return_id", "id"]);

      const idToItems = new Map();
      for (const it of allItems) {
        if (!idToItems.has(it.branch_return_id))
          idToItems.set(it.branch_return_id, []);
        idToItems.get(it.branch_return_id).push(it);
      }

      for (const r of rows) {
        r.items = idToItems.get(r.id) || [];
      }
    }

    return {
      data: rows,
      total: Number(count) || 0,
      page: Number(page),
      totalPages: Math.max(1, Math.ceil((Number(count) || 0) / Number(limit))),
    };
  }

  static async approve(id, approved_by) {
    return await db.transaction(async (trx) => {
      const record = await this.getById(id, trx);
      if (!record) throw new Error("Return not found");
      if (record.status !== "Pending")
        throw new Error(`Return is ${record.status}`);

      // Update status
      await trx("branch_returns").where("id", id).update({
        status: "Approved",
        approved_by,
        approved_at: new Date(),
        updated_at: new Date(),
      });

      // For each item: decrement branch, credit main (when applicable)
      for (const it of record.items) {
        // Fetch branch inventory item for current qty and context
        const current = await trx("branch_inventory")
          .where("id", it.branch_inventory_item_id)
          .whereNull("deleted_at")
          .first();
        if (!current) continue;
        const newQty = Math.max(
          0,
          parseFloat(current.quantity || 0) - parseFloat(it.quantity || 0)
        );

        // Decrement branch quantity (reason: return_to_main)
        await trx("branch_inventory")
          .where("id", current.id)
          .update({
            quantity: newQty,
            total_value: newQty * parseFloat(current.unit_cost || 0),
            last_updated: new Date(),
            updated_at: new Date(),
          });

        // Log branch transaction
        await trx("branch_inventory_transactions").insert({
          branch_id: current.branch_id,
          inventory_item_id: current.id,
          item_name: current.item_name,
          item_type: current.item_type,
          transaction_type: "adjustment",
          quantity: parseFloat(it.quantity || 0),
          unit_of_measure: current.unit,
          reference_number: `BR-RET-${id}`,
          notes: "Approved return to main",
          adjustment_type: "reduce_quantity",
          performed_by: approved_by || null,
          created_at: new Date(),
        });

        // Credit main inventory
        if (record.return_type === "scm") {
          // If main_inventory_item_id provided, add quantity; else skip (allow later mapping)
          if (it.main_inventory_item_id) {
            const inv = await trx("inventory_items")
              .where("id", it.main_inventory_item_id)
              .first();
            if (inv) {
              const updatedQty =
                parseFloat(inv.quantity || 0) + parseFloat(it.quantity || 0);
              await trx("inventory_items")
                .where("id", inv.id)
                .update({
                  quantity: updatedQty,
                  total_value: updatedQty * parseFloat(inv.unit_price || 0),
                  updated_at: new Date(),
                });
              await trx("inventory_transactions").insert({
                inventory_item_id: inv.id,
                transaction_type: "adjustment",
                quantity: parseFloat(it.quantity || 0),
                unit_cost: parseFloat(inv.unit_cost || inv.unit_price || 0),
                total_value:
                  parseFloat(inv.unit_cost || inv.unit_price || 0) *
                  parseFloat(it.quantity || 0),
                reason: "branch_return",
                notes: `From branch ${record.branch_id} return ${id}`,
                performed_by: approved_by || "System",
                adjustment_type: "add_quantity",
                transaction_date: new Date(),
              });
            }
          } else {
            // Auto-map by provenance using inventory_item_id
            let targetItem = null;
            // 1) Try last branch distribution for this branch and item_name
            const lastDist = await trx("branch_distribution_items as bdi")
              .leftJoin(
                "branch_distributions as bd",
                "bdi.distribution_id",
                "bd.id"
              )
              .where("bd.branch_id", current.branch_id)
              .where("bdi.source", "scm")
              .whereRaw("LOWER(bdi.name) = LOWER(?)", [current.item_name])
              .orderBy("bdi.id", "desc")
              .first();
            if (lastDist?.item_ref_id) {
              targetItem = await trx("inventory_items")
                .where("id", lastDist.item_ref_id)
                .first();
            }

            // 2) Fallback: direct name match on inventory_items
            if (!targetItem) {
              targetItem = await trx("inventory_items")
                .whereRaw("LOWER(item_name) = LOWER(?)", [current.item_name])
                .whereNull("deleted_at")
                .first();
            }

            // 3) Create new inventory item if none found
            if (!targetItem) {
              // Ensure item_type exists (by name)
              let itemType = await trx("inventory_item_types")
                .whereRaw("LOWER(name) = LOWER(?)", [current.item_name])
                .first();
              if (!itemType) {
                // Pick category by name if available, else first
                let category = null;
                if (current.category) {
                  category = await trx("inventory_categories")
                    .whereRaw("LOWER(name) = LOWER(?)", [current.category])
                    .first();
                }
                if (!category) {
                  category = await trx("inventory_categories")
                    .select("id")
                    .orderBy("id")
                    .first();
                }
                const insertedType = await trx("inventory_item_types")
                  .insert({
                    name: current.item_name,
                    description: "Auto-created from branch return",
                    category_id: category?.id || null,
                    unit_of_measure: current.unit || null,
                    status: "active",
                    created_at: new Date(),
                    updated_at: new Date(),
                  })
                  .returning("*");
                itemType = Array.isArray(insertedType)
                  ? insertedType[0]
                  : insertedType;
              }
              const insertedItem = await trx("inventory_items")
                .insert({
                  item_type_id: itemType.id,
                  item_name: itemType.name,
                  quantity: 0,
                  unit_price: parseFloat(current.unit_cost || 0),
                  unit_cost: parseFloat(current.unit_cost || 0),
                  total_value: 0,
                  unit_of_measure:
                    itemType.unit_of_measure || current.unit || null,
                  received_date: new Date(),
                  status: "available",
                  notes: `Auto-created from branch return BR-RET-${id}`,
                  created_at: new Date(),
                  updated_at: new Date(),
                })
                .returning("*");
              targetItem = Array.isArray(insertedItem)
                ? insertedItem[0]
                : insertedItem;
            }

            if (targetItem) {
              const updatedQty =
                parseFloat(targetItem.quantity || 0) +
                parseFloat(it.quantity || 0);
              await trx("inventory_items")
                .where("id", targetItem.id)
                .update({
                  quantity: updatedQty,
                  total_value:
                    updatedQty *
                    parseFloat(
                      targetItem.unit_price || targetItem.unit_cost || 0
                    ),
                  updated_at: new Date(),
                });
              await trx("inventory_transactions").insert({
                inventory_item_id: targetItem.id,
                transaction_type: "adjustment",
                quantity: parseFloat(it.quantity || 0),
                unit_cost: parseFloat(
                  targetItem.unit_cost || targetItem.unit_price || 0
                ),
                total_value:
                  parseFloat(
                    targetItem.unit_cost || targetItem.unit_price || 0
                  ) * parseFloat(it.quantity || 0),
                reason: "branch_return",
                notes: `From branch ${record.branch_id} return ${id}`,
                performed_by: approved_by || "System",
                adjustment_type: "add_quantity",
                transaction_date: new Date(),
              });
            }
          }
        } else if (record.return_type === "production") {
          // Prefer explicit menu_item_id; fallback to name resolution
          let menuItemId = it.menu_item_id || null;
          if (!menuItemId) {
            const menuItem = await trx("menu_items")
              .where("menu_item_name", current.item_name)
              .whereNull("deleted_at")
              .first();
            if (menuItem) menuItemId = menuItem.id;
          }

          if (menuItemId) {
            const prodInv = await trx("production_inventory")
              .where("menu_item_id", menuItemId)
              .first();

            if (prodInv) {
              const oldQty = parseFloat(prodInv.available_quantity || 0);
              const inc = parseFloat(it.quantity || 0);
              const newQty = oldQty + inc;

              await trx("production_inventory").where("id", prodInv.id).update({
                available_quantity: newQty,
                updated_at: new Date(),
              });

              // Log audit via ProductionInventory helper (best-effort)
              try {
                const ProductionInventory = require("./ProductionInventory");
                await ProductionInventory.logStockUpdate(
                  prodInv.id,
                  oldQty,
                  newQty,
                  approved_by || null,
                  `Branch return approved: +${inc} from branch ${record.branch_id} (BR-RET-${id})`,
                  trx
                );
              } catch (logErr) {
                console.warn(
                  "Failed to log production stock update:",
                  logErr?.message || logErr
                );
              }
            }
          }
        }
      }

      return await this.getById(id, trx);
    });
  }

  static async reject(id, rejected_by, rejection_reason = null) {
    return await db.transaction(async (trx) => {
      const [updated] = await trx("branch_returns")
        .where("id", id)
        .where("status", "Pending")
        .update({
          status: "Rejected",
          rejected_by,
          rejected_at: new Date(),
          rejection_reason,
          updated_at: new Date(),
        })
        .returning("*");
      if (!updated) return null;

      // Log zero-quantity branch transactions so Recent Activity and Transactions modal reflect the rejection
      const items = await trx("branch_return_items")
        .where("branch_return_id", id)
        .whereNull("deleted_at");

      for (const it of items) {
        const current = await trx("branch_inventory")
          .where("id", it.branch_inventory_item_id)
          .whereNull("deleted_at")
          .first();
        if (!current) continue;
        await trx("branch_inventory_transactions").insert({
          branch_id: current.branch_id,
          inventory_item_id: current.id,
          item_name: current.item_name,
          item_type: current.item_type,
          transaction_type: "adjustment",
          quantity: 0,
          unit_of_measure: current.unit,
          reference_number: `BR-RET-${id}`,
          notes: rejection_reason
            ? `Return rejected: ${rejection_reason}`
            : "Return rejected",
          adjustment_type: "no_change",
          performed_by: rejected_by || null,
          created_at: new Date(),
        });
      }

      return updated;
    });
  }

  static async acknowledge(id, acknowledged_by, notes = null) {
    return await db.transaction(async (trx) => {
      const rec = await trx("branch_returns").where("id", id).first();
      if (!rec) throw new Error("Return not found");
      if (rec.status !== "Approved" && rec.status !== "Rejected")
        throw new Error(
          "Only approved or rejected returns can be acknowledged"
        );
      if (rec.branch_acknowledged_by) return await this.getById(id, trx);

      const [updated] = await trx("branch_returns")
        .where("id", id)
        .update({
          branch_acknowledged_by: acknowledged_by || null,
          branch_acknowledged_at: new Date(),
          branch_acknowledgment_notes: notes || null,
          updated_at: new Date(),
        })
        .returning("*");
      return updated;
    });
  }
}

module.exports = BranchReturn;
