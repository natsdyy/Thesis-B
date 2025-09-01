const { db } = require("../config/database");

class Recipe {
  // Get all recipes with ingredients
  static async getAll(filters = {}) {
    try {
      let query = db("recipes as r")
        .select(
          "r.*",
          "u.name as created_by_name",
          db.raw("COUNT(ri.id) as ingredient_count"),
          db.raw("COUNT(DISTINCT po.id) as usage_count")
        )
        .leftJoin("users as u", "r.created_by", "u.id")
        .leftJoin("recipe_ingredients as ri", "r.id", "ri.recipe_id")
        .leftJoin("production_orders as po", "r.id", "po.recipe_id")
        .whereNull("r.deleted_at")
        .groupBy("r.id", "u.name");

      // Apply filters
      if (filters.category) {
        query = query.where("r.category", filters.category);
      }

      if (filters.is_active !== undefined) {
        query = query.where("r.is_active", filters.is_active);
      }

      if (filters.search) {
        query = query.where(function () {
          this.where("r.recipe_name", "ilike", `%${filters.search}%`)
            .orWhere("r.recipe_code", "ilike", `%${filters.search}%`)
            .orWhere("r.description", "ilike", `%${filters.search}%`);
        });
      }

      return await query.orderBy("r.recipe_name", "asc");
    } catch (error) {
      console.error("Error fetching recipes:", error);
      throw new Error("Failed to retrieve recipes");
    }
  }

  // Get recipe by ID with full details including ingredients
  static async getById(id) {
    try {
      const recipe = await db("recipes as r")
        .select("r.*", "u.name as created_by_name")
        .leftJoin("users as u", "r.created_by", "u.id")
        .where("r.id", id)
        .whereNull("r.deleted_at")
        .first();

      if (recipe) {
        // Get ingredients for this recipe
        recipe.ingredients = await db("recipe_ingredients as ri")
          .select(
            "ri.*",
            "iit.name as ingredient_name",
            "iit.unit_of_measure",
            "ic.name as category_name"
          )
          .join(
            "inventory_item_types as iit",
            "ri.inventory_item_type_id",
            "iit.id"
          )
          .join("inventory_categories as ic", "iit.category_id", "ic.id")
          .where("ri.recipe_id", id)
          .orderBy("ri.sequence_order", "asc");

        // Calculate total estimated cost
        recipe.total_estimated_cost = recipe.ingredients.reduce(
          (sum, ingredient) => {
            return (
              sum +
              parseFloat(ingredient.quantity_required) *
                parseFloat(ingredient.cost_per_unit || 0)
            );
          },
          0
        );
      }

      return recipe;
    } catch (error) {
      console.error("Error fetching recipe by ID:", error);
      throw new Error("Failed to retrieve recipe");
    }
  }

  // Create new recipe with ingredients
  static async create(recipeData, ingredients = []) {
    const trx = await db.transaction();

    try {
      // Generate recipe code
      const recipeCode = await this.generateRecipeCode(recipeData.category);

      // Calculate total time (removed prep and cooking time fields)
      const totalTime = 0;

      const [recipe] = await trx("recipes")
        .insert({
          recipe_code: recipeCode,
          recipe_name: recipeData.recipe_name,
          description: recipeData.description,
          category: recipeData.category,
          batch_size: recipeData.batch_size,
          batch_unit: recipeData.batch_unit,
          instructions: recipeData.instructions,
          total_time_minutes: totalTime,
          is_active: recipeData.is_active !== false,
          created_by: recipeData.created_by,
        })
        .returning("*");

      // Add ingredients if provided
      if (ingredients.length > 0) {
        const ingredientData = ingredients.map((ingredient, index) => ({
          recipe_id: recipe.id,
          inventory_item_type_id: ingredient.inventory_item_type_id,
          quantity_required: ingredient.quantity_required,
          unit: ingredient.unit,
          cost_per_unit: ingredient.cost_per_unit || 0,
          preparation_notes: ingredient.preparation_notes,
          is_optional: ingredient.is_optional || false,
          sequence_order: ingredient.sequence_order || index + 1,
        }));

        await trx("recipe_ingredients").insert(ingredientData);

        // Calculate and update cost per batch
        const totalCost = ingredientData.reduce((sum, ing) => {
          return (
            sum +
            parseFloat(ing.quantity_required) * parseFloat(ing.cost_per_unit)
          );
        }, 0);

        await trx("recipes")
          .where("id", recipe.id)
          .update({ cost_per_batch: totalCost });
      }

      await trx.commit();
      return await this.getById(recipe.id);
    } catch (error) {
      await trx.rollback();
      console.error("Error creating recipe:", error);
      throw new Error("Failed to create recipe");
    }
  }

  // Update recipe
  static async update(id, recipeData, ingredients = null) {
    const trx = await db.transaction();

    try {
      // Calculate total time (removed prep and cooking time fields)
      const updateData = { ...recipeData };
      updateData.total_time_minutes = 0;

      const [updated] = await trx("recipes")
        .where("id", id)
        .whereNull("deleted_at")
        .update({
          ...updateData,
          updated_at: new Date(),
        })
        .returning("*");

      if (!updated) {
        throw new Error("Recipe not found");
      }

      // Update ingredients if provided
      if (ingredients !== null) {
        // Delete existing ingredients
        await trx("recipe_ingredients").where("recipe_id", id).del();

        // Add new ingredients
        if (ingredients.length > 0) {
          const ingredientData = ingredients.map((ingredient, index) => ({
            recipe_id: id,
            inventory_item_type_id: ingredient.inventory_item_type_id,
            quantity_required: ingredient.quantity_required,
            unit: ingredient.unit,
            cost_per_unit: ingredient.cost_per_unit || 0,
            preparation_notes: ingredient.preparation_notes,
            is_optional: ingredient.is_optional || false,
            sequence_order: ingredient.sequence_order || index + 1,
          }));

          await trx("recipe_ingredients").insert(ingredientData);

          // Recalculate cost per batch
          const totalCost = ingredientData.reduce((sum, ing) => {
            return (
              sum +
              parseFloat(ing.quantity_required) * parseFloat(ing.cost_per_unit)
            );
          }, 0);

          await trx("recipes")
            .where("id", id)
            .update({ cost_per_batch: totalCost });
        }
      }

      await trx.commit();
      return await this.getById(id);
    } catch (error) {
      await trx.rollback();
      console.error("Error updating recipe:", error);
      throw new Error("Failed to update recipe");
    }
  }

  // Get recipe categories
  static async getCategories() {
    try {
      const categories = await db("recipes")
        .select("category")
        .distinct()
        .whereNull("deleted_at")
        .orderBy("category");

      return categories.map((c) => c.category);
    } catch (error) {
      console.error("Error fetching recipe categories:", error);
      throw new Error("Failed to retrieve recipe categories");
    }
  }

  // Calculate scaled ingredients for different batch sizes
  static async getScaledIngredients(recipeId, targetBatchSize) {
    try {
      const recipe = await this.getById(recipeId);
      if (!recipe) {
        throw new Error("Recipe not found");
      }

      const scaleFactor = targetBatchSize / recipe.batch_size;

      const scaledIngredients = recipe.ingredients.map((ingredient) => ({
        ...ingredient,
        scaled_quantity: parseFloat(ingredient.quantity_required) * scaleFactor,
        scaled_cost:
          parseFloat(ingredient.cost_per_unit) *
          parseFloat(ingredient.quantity_required) *
          scaleFactor,
      }));

      return {
        recipe,
        scale_factor: scaleFactor,
        target_batch_size: targetBatchSize,
        scaled_ingredients: scaledIngredients,
        total_scaled_cost: scaledIngredients.reduce(
          (sum, ing) => sum + ing.scaled_cost,
          0
        ),
      };
    } catch (error) {
      console.error("Error calculating scaled ingredients:", error);
      throw new Error("Failed to calculate scaled ingredients");
    }
  }

  // Generate unique recipe code
  static async generateRecipeCode(category) {
    const categoryCode = category.substring(0, 3).toUpperCase();
    const year = new Date().getFullYear().toString().slice(-2);

    const lastRecipe = await db("recipes")
      .where("recipe_code", "like", `${categoryCode}${year}%`)
      .orderBy("recipe_code", "desc")
      .first();

    let sequence = 1;
    if (lastRecipe) {
      const lastSequence = parseInt(lastRecipe.recipe_code.slice(-3));
      sequence = lastSequence + 1;
    }

    return `${categoryCode}${year}${String(sequence).padStart(3, "0")}`;
  }

  // Check ingredient availability for recipe
  static async checkIngredientAvailability(recipeId, batchSize = null) {
    try {
      const recipe = await this.getById(recipeId);
      if (!recipe) {
        throw new Error("Recipe not found");
      }

      const scaleFactor = batchSize ? batchSize / recipe.batch_size : 1;

      const availability = await Promise.all(
        recipe.ingredients.map(async (ingredient) => {
          const requiredQuantity =
            parseFloat(ingredient.quantity_required) * scaleFactor;

          // Get current inventory for this ingredient
          const currentStock = await db("inventory_items as ii")
            .join("inventory_item_types as iit", "ii.item_type_id", "iit.id")
            .select(db.raw("SUM(ii.quantity) as total_available"))
            .where("iit.id", ingredient.inventory_item_type_id)
            .where("ii.quantity", ">", 0)
            .first();

          const availableQuantity = parseFloat(
            currentStock?.total_available || 0
          );
          const isAvailable = availableQuantity >= requiredQuantity;

          return {
            ...ingredient,
            required_quantity: requiredQuantity,
            available_quantity: availableQuantity,
            is_available: isAvailable,
            shortage: isAvailable ? 0 : requiredQuantity - availableQuantity,
          };
        })
      );

      const allAvailable = availability.every((ing) => ing.is_available);

      return {
        recipe_id: recipeId,
        batch_size: batchSize || recipe.batch_size,
        scale_factor: scaleFactor,
        all_ingredients_available: allAvailable,
        ingredient_availability: availability,
      };
    } catch (error) {
      console.error("Error checking ingredient availability:", error);
      throw new Error("Failed to check ingredient availability");
    }
  }

  // Soft delete recipe
  static async delete(id) {
    try {
      const [deleted] = await db("recipes")
        .where("id", id)
        .whereNull("deleted_at")
        .update({
          deleted_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      if (!deleted) {
        throw new Error("Recipe not found");
      }

      return deleted;
    } catch (error) {
      console.error("Error deleting recipe:", error);
      throw new Error("Failed to delete recipe");
    }
  }
}

module.exports = Recipe;
