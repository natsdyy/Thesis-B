const { db } = require("../config/database");

class Menu {
  // Get all menus with item counts
  static async getAll(filters = {}) {
    try {
      let query = db("menus as m")
        .select(
          "m.*",
          db.raw("concat(u.first_name,' ',u.last_name) as created_by_name"),
          db.raw("COUNT(mi.id) as item_count"),
          db.raw(
            "COUNT(CASE WHEN mi.is_available = true THEN 1 END) as available_items"
          )
        )
        .leftJoin("employees as u", "m.created_by", "u.id")
        .leftJoin("menu_items as mi", "m.id", "mi.menu_id")
        .whereNull("m.deleted_at")
        .groupBy("m.id", "u.first_name", "u.last_name");

      // Apply filters
      if (filters.category) {
        query = query.where("m.category", filters.category);
      }

      if (filters.is_active !== undefined) {
        query = query.where("m.is_active", filters.is_active);
      }

      if (filters.search) {
        query = query.where(function () {
          this.where("m.menu_name", "ilike", `%${filters.search}%`)
            .orWhere("m.menu_code", "ilike", `%${filters.search}%`)
            .orWhere("m.description", "ilike", `%${filters.search}%`);
        });
      }

      return await query.orderBy("m.menu_name", "asc");
    } catch (error) {
      console.error("Error fetching menus:", error);
      throw new Error("Failed to retrieve menus");
    }
  }

  // Get menu by ID with full details
  static async getById(id) {
    try {
      const menu = await db("menus as m")
        .select(
          "m.*",
          db.raw("concat(u.first_name,' ',u.last_name) as created_by_name")
        )
        .leftJoin("employees as u", "m.created_by", "u.id")
        .where("m.id", id)
        .whereNull("m.deleted_at")
        .first();

      if (menu) {
        // Get menu items for this menu
        menu.items = await db("menu_items as mi")
          .select(
            "mi.*",
            "r.recipe_name",
            "r.category as recipe_category",
            "r.batch_size",
            "r.batch_unit",
            db.raw("concat(u.first_name,' ',u.last_name) as created_by_name")
          )
          .leftJoin("recipes as r", "mi.recipe_id", "r.id")
          .leftJoin("employees as u", "mi.created_by", "u.id")
          .where("mi.menu_id", id)
          .whereNull("mi.deleted_at")
          .orderBy("mi.sequence_order", "asc");
      }

      return menu;
    } catch (error) {
      console.error("Error fetching menu by ID:", error);
      throw new Error("Failed to retrieve menu");
    }
  }

  // Create new menu
  static async create(menuData) {
    const trx = await db.transaction();

    try {
      // Generate menu code
      const timestamp = Date.now();
      const menuCode = `MENU${timestamp}`;

      const [menuId] = await trx("menus").insert({
        ...menuData,
        menu_code: menuCode,
        created_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      });

      await trx.commit();
      return await this.getById(menuId);
    } catch (error) {
      await trx.rollback();
      console.error("Error creating menu:", error);
      throw new Error("Failed to create menu");
    }
  }

  // Update menu
  static async update(id, updateData) {
    try {
      await db("menus")
        .where("id", id)
        .update({
          ...updateData,
          updated_at: db.fn.now(),
        });

      return await this.getById(id);
    } catch (error) {
      console.error("Error updating menu:", error);
      throw new Error("Failed to update menu");
    }
  }

  // Soft delete menu
  static async delete(id) {
    try {
      await db("menus").where("id", id).update({
        deleted_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      return true;
    } catch (error) {
      console.error("Error deleting menu:", error);
      throw new Error("Failed to delete menu");
    }
  }

  // Get menu categories for dropdown
  static async getCategories() {
    try {
      const categories = await db("menus")
        .select("category")
        .distinct()
        .whereNull("deleted_at")
        .orderBy("category");

      return categories.map((cat) => cat.category);
    } catch (error) {
      console.error("Error fetching menu categories:", error);
      throw new Error("Failed to retrieve menu categories");
    }
  }

  // Get menu statistics
  static async getStats() {
    try {
      const stats = await db("menus as m")
        .select(
          db.raw("COUNT(DISTINCT m.id) as total_menus"),
          db.raw(
            "COUNT(DISTINCT CASE WHEN m.is_active = true THEN m.id END) as active_menus"
          ),
          db.raw("COUNT(DISTINCT mi.id) as total_menu_items"),
          db.raw(
            "COUNT(DISTINCT CASE WHEN mi.is_available = true THEN mi.id END) as available_items"
          ),
          db.raw("COUNT(DISTINCT m.category) as total_categories")
        )
        .leftJoin("menu_items as mi", "m.id", "mi.menu_id")
        .whereNull("m.deleted_at")
        .first();

      return stats;
    } catch (error) {
      console.error("Error fetching menu stats:", error);
      throw new Error("Failed to retrieve menu statistics");
    }
  }

  // Get menus by category (for hybrid approach)
  static async getByCategory(category) {
    try {
      const menus = await db("menus")
        .select("*")
        .where("category", category)
        .whereNull("deleted_at")
        .where("is_active", true)
        .orderBy("menu_name", "asc");

      return menus;
    } catch (error) {
      console.error("Error fetching menus by category:", error);
      throw new Error("Failed to retrieve menus by category");
    }
  }
}

module.exports = Menu;
