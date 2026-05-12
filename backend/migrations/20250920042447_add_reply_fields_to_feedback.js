/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasStatus = await knex.schema.hasColumn("feedback", "status");
  const hasReplyMessage = await knex.schema.hasColumn(
    "feedback",
    "reply_message"
  );
  const hasReplyNote = await knex.schema.hasColumn(
    "feedback",
    "reply_internal_note"
  );
  const hasReplySent = await knex.schema.hasColumn("feedback", "reply_sent_at");

  // Perform alterations outside of a single large transaction block if possible,
  // or at least be very careful with existing columns.
  await knex.schema.table("feedback", function (table) {
    if (!hasStatus) {
      table.string("status", 50).defaultTo("new");
    } else {
      table.string("status", 50).defaultTo("new").alter();
    }

    if (!hasReplyMessage) {
      table.text("reply_message").nullable();
    }

    if (!hasReplyNote) {
      table.text("reply_internal_note").nullable();
    }

    if (!hasReplySent) {
      table.timestamp("reply_sent_at").nullable();
    }
  });

  // Check for index existence before adding to avoid transaction abort
  const indexCheck = await knex.raw(`
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'feedback' AND indexname = 'feedback_status_index'
  `);

  if (indexCheck.rows.length === 0) {
    try {
      await knex.schema.table("feedback", function (table) {
        table.index("status", "feedback_status_index");
      });
    } catch (e) {
      console.log("Status index might already exist or could not be created");
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return Promise.resolve();
};