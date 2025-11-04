const { db } = require("../config/database");

class Announcement {
  // Create new announcement
  static async create(announcementData) {
    let insertData = null;
    try {
      // Calculate automatic display_order based on active status
      // Active announcements get lower numbers (higher priority), inactive get higher numbers
      const maxActiveOrder = await db("announcements")
        .where("is_active", true)
        .whereNull("deleted_at")
        .max("display_order as max_order")
        .first();
      
      const maxInactiveOrder = await db("announcements")
        .where("is_active", false)
        .whereNull("deleted_at")
        .max("display_order as max_order")
        .first();
      
      const isActive = announcementData.is_active !== undefined ? announcementData.is_active : true;
      let autoDisplayOrder = 0;
      
      if (isActive) {
        // Active announcements: start from 0, increment from max active order
        autoDisplayOrder = (maxActiveOrder?.max_order ?? -1) + 1;
      } else {
        // Inactive announcements: start after all active ones
        const activeCount = await db("announcements")
          .where("is_active", true)
          .whereNull("deleted_at")
          .count("id as count")
          .first();
        autoDisplayOrder = (activeCount?.count ?? 0) + (maxInactiveOrder?.max_order ?? 0) + 1;
      }

      // Handle images: use images array or fallback to image_url
      let imagesJson = null;
      if (announcementData.images && Array.isArray(announcementData.images) && announcementData.images.length > 0) {
        imagesJson = JSON.stringify(announcementData.images);
      } else if (announcementData.image_url) {
        imagesJson = JSON.stringify([announcementData.image_url]);
      }

      insertData = {
        title: announcementData.title.trim(),
        subtitle: announcementData.subtitle || null,
        description: announcementData.description || null,
        content: announcementData.content || null,
        image_url: announcementData.images && announcementData.images.length > 0 
          ? announcementData.images[0] 
          : (announcementData.image_url || null),
        images: imagesJson,
        video_url: announcementData.video_url || null,
        promo_details: announcementData.promo_details || null,
        announcement_type: announcementData.announcement_type || null,
        content_format: announcementData.content_format || null,
        image_display_type: announcementData.image_display_type || 'single',
        promo_position: announcementData.promo_position || 'below',
        content_order: announcementData.content_order 
          ? (typeof announcementData.content_order === 'string' 
              ? announcementData.content_order 
              : JSON.stringify(announcementData.content_order))
          : JSON.stringify(['description', 'images', 'video']),
        valid_from: announcementData.valid_from
          ? (announcementData.valid_from instanceof Date 
              ? announcementData.valid_from 
              : new Date(announcementData.valid_from))
          : new Date(),
        valid_until: announcementData.valid_until && 
                     announcementData.valid_until !== 'null' && 
                     announcementData.valid_until !== '' &&
                     announcementData.valid_until !== null
          ? (announcementData.valid_until instanceof Date 
              ? announcementData.valid_until 
              : new Date(announcementData.valid_until))
          : null,
        action_link: announcementData.action_link || null,
        action_text: announcementData.action_text || null,
        is_active: isActive,
        display_order: autoDisplayOrder,
        created_by: announcementData.created_by || null,
      };

      const [announcement] = await db("announcements")
        .insert(insertData)
        .returning("*");

      return announcement;
    } catch (error) {
      console.error("Error creating announcement:", error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      if (insertData) {
        console.error("Insert data:", JSON.stringify(insertData, null, 2));
      } else {
        console.error("Insert data was not created due to earlier error");
      }
      console.error("Announcement data received:", JSON.stringify(announcementData, null, 2));
      throw new Error(`Failed to create announcement: ${error.message}`);
    }
  }

  // Get all announcements with filters
  static async getAll(filters = {}) {
    try {
      let query = db("announcements").select("*");

      // Exclude soft-deleted announcements by default
      if (!filters.include_deleted) {
        query = query.whereNull("deleted_at");
      }

      // Filter by active status
      if (filters.is_active !== undefined) {
        query = query.where("is_active", filters.is_active);
      }

      // Filter by valid date range
      const now = new Date();
      if (filters.only_active) {
        query = query
          .where("is_active", true)
          .where("valid_from", "<=", now)
          .where(function () {
            this.whereNull("valid_until").orWhere("valid_until", ">=", now);
          });
      }

      // Search in title, subtitle, description
      if (filters.search) {
        query = query.where(function () {
          this.where("title", "ilike", `%${filters.search}%`)
            .orWhere("subtitle", "ilike", `%${filters.search}%`)
            .orWhere("description", "ilike", `%${filters.search}%`);
        });
      }

      // Order by display_order, then by created_at desc
      query = query.orderBy("display_order", "asc").orderBy("created_at", "desc");

      // Limit results
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      // Offset for pagination
      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      const announcements = await query;

      return announcements;
    } catch (error) {
      console.error("Error fetching announcements:", error);
      throw new Error("Failed to fetch announcements");
    }
  }

  // Get active announcements for public display
  static async getActiveAnnouncements() {
    try {
      const now = new Date();
      // Start of today for date comparison (to handle date-only comparisons)
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      console.log("Fetching active announcements at:", now.toISOString());
      console.log("Start of today:", startOfToday.toISOString());
      
      const announcements = await db("announcements")
        .select("*")
        .where("is_active", true)
        .whereNull("deleted_at") // Exclude deleted announcements
        .where(function () {
          // valid_from should be <= now (allows same-day announcements)
          this.where("valid_from", "<=", now);
        })
        .where(function () {
          // valid_until should be >= now OR null (no expiration)
          this.whereNull("valid_until").orWhere("valid_until", ">=", startOfToday);
        })
        .orderBy("display_order", "asc")
        .orderBy("created_at", "desc");

      console.log(`Found ${announcements.length} active announcements`);
      if (announcements.length > 0) {
        console.log("Announcement dates:", announcements.map(a => ({
          id: a.id,
          title: a.title,
          valid_from: a.valid_from,
          valid_until: a.valid_until,
        })));
      }

      return announcements;
    } catch (error) {
      console.error("Error fetching active announcements:", error);
      throw new Error("Failed to fetch active announcements");
    }
  }

  // Get announcement by ID
  static async getById(id) {
    try {
      const announcement = await db("announcements")
        .select("*")
        .where("id", id)
        .first();

      return announcement;
    } catch (error) {
      console.error("Error fetching announcement by ID:", error);
      throw new Error("Failed to fetch announcement");
    }
  }

  // Update announcement
  static async update(id, updateData) {
    try {
      // Get current announcement to check if is_active is changing
      const currentAnnouncement = await this.getById(id);
      const isActiveChanging = updateData.is_active !== undefined && 
                               updateData.is_active !== currentAnnouncement?.is_active;
      
      let autoDisplayOrder = undefined;
      
      // Recalculate display_order if active status is changing
      if (isActiveChanging) {
        const maxActiveOrder = await db("announcements")
          .where("is_active", true)
          .whereNull("deleted_at")
          .where("id", "!=", id)
          .max("display_order as max_order")
          .first();
        
        const maxInactiveOrder = await db("announcements")
          .where("is_active", false)
          .whereNull("deleted_at")
          .where("id", "!=", id)
          .max("display_order as max_order")
          .first();
        
        if (updateData.is_active) {
          // Moving to active: place at end of active announcements
          autoDisplayOrder = (maxActiveOrder?.max_order ?? -1) + 1;
        } else {
          // Moving to inactive: place after all active announcements
          const activeCount = await db("announcements")
            .where("is_active", true)
            .whereNull("deleted_at")
            .where("id", "!=", id)
            .count("id as count")
            .first();
          autoDisplayOrder = (activeCount?.count ?? 0) + (maxInactiveOrder?.max_order ?? 0) + 1;
        }
      }

      // Handle images: use images array or fallback to image_url
      let imagesJson = undefined;
      if (updateData.images !== undefined) {
        if (Array.isArray(updateData.images) && updateData.images.length > 0) {
          imagesJson = JSON.stringify(updateData.images);
        } else if (updateData.images === null) {
          imagesJson = null;
        }
      } else if (updateData.image_url !== undefined && updateData.image_url) {
        imagesJson = JSON.stringify([updateData.image_url]);
      }

      const updateFields = {
        title: updateData.title ? updateData.title.trim() : undefined,
        subtitle: updateData.subtitle !== undefined ? (updateData.subtitle || null) : undefined,
        description: updateData.description !== undefined ? (updateData.description || null) : undefined,
        content: updateData.content !== undefined ? (updateData.content || null) : undefined,
        image_url: updateData.images && updateData.images.length > 0 
          ? updateData.images[0] 
          : (updateData.image_url !== undefined ? (updateData.image_url || null) : undefined),
        images: imagesJson,
        video_url: updateData.video_url !== undefined ? (updateData.video_url || null) : undefined,
        promo_details: updateData.promo_details !== undefined ? (updateData.promo_details || null) : undefined,
        announcement_type: updateData.announcement_type !== undefined ? (updateData.announcement_type || null) : undefined,
        content_format: updateData.content_format !== undefined ? (updateData.content_format || null) : undefined,
        image_display_type: updateData.image_display_type !== undefined ? (updateData.image_display_type || 'single') : undefined,
        promo_position: updateData.promo_position !== undefined ? (updateData.promo_position || 'below') : undefined,
        content_order: updateData.content_order !== undefined ? (updateData.content_order || JSON.stringify(['description', 'images', 'video'])) : undefined,
        valid_from: updateData.valid_from ? new Date(updateData.valid_from) : undefined,
        valid_until: updateData.valid_until !== undefined
          ? (updateData.valid_until ? new Date(updateData.valid_until) : null)
          : undefined,
        action_link: updateData.action_link !== undefined ? (updateData.action_link || null) : undefined,
        action_text: updateData.action_text !== undefined ? (updateData.action_text || null) : undefined,
        is_active: updateData.is_active !== undefined ? updateData.is_active : undefined,
        display_order: autoDisplayOrder !== undefined ? autoDisplayOrder : undefined,
        updated_at: new Date(),
      };

      // Remove undefined fields
      Object.keys(updateFields).forEach(
        (key) => updateFields[key] === undefined && delete updateFields[key]
      );

      const [announcement] = await db("announcements")
        .where("id", id)
        .update(updateFields)
        .returning("*");

      return announcement;
    } catch (error) {
      console.error("Error updating announcement:", error);
      throw new Error("Failed to update announcement");
    }
  }

  // Delete announcement (soft delete)
  static async delete(id) {
    try {
      const [announcement] = await db("announcements")
        .where("id", id)
        .update({
          is_active: false,
          deleted_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      return announcement;
    } catch (error) {
      console.error("Error deleting announcement:", error);
      throw new Error("Failed to delete announcement");
    }
  }

  // Hard delete announcement
  static async hardDelete(id) {
    try {
      await db("announcements").where("id", id).del();
      return true;
    } catch (error) {
      console.error("Error hard deleting announcement:", error);
      throw new Error("Failed to delete announcement");
    }
  }
}

module.exports = Announcement;

