const bcrypt = require("bcryptjs");

exports.up = async function (knex) {
  // Generate default password hash
  const defaultPassword = "Board@123";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // Insert Chairman
  await knex("board_members").insert({
    board_id: "BD001",
    first_name: "Marvin",
    middle_name: "B.",
    last_name: "Flor",
    email: "marvin.flor@company.com",
    phone_number: "+63 912 345 6789",
    position: "Chairman of the Board",
    department: "Administration",
    password: hashedPassword,
    is_active: true,
  });

  // Insert Board Director 1
  await knex("board_members").insert({
    board_id: "BD002",
    first_name: "Marissa",
    middle_name: "G.",
    last_name: "Flor",
    email: "marissa.flor@company.com",
    phone_number: "+63 912 345 6790",
    position: "Board of Directors",
    department: "Administration",
    password: hashedPassword,
    is_active: true,
  });

  // Insert Board Director 2
  await knex("board_members").insert({
    board_id: "BD003",
    first_name: "Angie",
    middle_name: "F.",
    last_name: "Cruz",
    email: "angie.cruz@company.com",
    phone_number: "+63 912 345 6791",
    position: "Board of Directors",
    department: "Administration",
    password: hashedPassword,
    is_active: true,
  });

  console.log("✅ Board members seeded successfully");
  console.log("📧 Default login credentials:");
  console.log("   Chairman: marvin.flor@company.com / Board@123");
  console.log("   Board 1: marissa.flor@company.com / Board@123");
  console.log("   Board 2: angie.cruz@company.com / Board@123");
};

exports.down = async function (knex) {
  await knex("board_members").del();
};
