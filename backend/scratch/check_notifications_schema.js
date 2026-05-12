const knex = require('knex')(require('../knexfile').development);

async function checkUserPermissions() {
  try {
    const hasTable = await knex.schema.hasTable('user_permissions');
    if (!hasTable) {
      console.log('user_permissions table does not exist');
      return;
    }

    const columnInfo = await knex('user_permissions').columnInfo();
    console.log('Columns in user_permissions:', Object.keys(columnInfo));

  } catch (err) {
    console.error(err);
  } finally {
    await knex.destroy();
  }
}

checkUserPermissions();
