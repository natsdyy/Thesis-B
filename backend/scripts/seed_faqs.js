require("dotenv").config();
const knex = require("../knexfile.js").development;
const db = require("knex")({
  client: "pg",
  connection: knex.connection,
});

const faqs = [
  {
    question: "What are your operating hours?",
    answer:
      "We are open Monday to Sunday, but specific hours vary by branch. Please check the schedule for your nearest location in our Store Directory page. For special holiday hours, please check our social media page for the latest announcements.",
    category: "General",
    display_order: 1,
    is_active: true,
  },
  {
    question: "Do you offer delivery services?",
    answer:
      "Yes! We only offer delivery through our partners, Foodpanda and GrabFood.",
    category: "Orders",
    display_order: 2,
    is_active: true,
  },
  {
    question: "How do I rate the food?",
    answer:
      "After you purchase your food, you can find instructions on how to rate us on your receipt.",
    category: "General",
    display_order: 3,
    is_active: true,
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept Cash for in-store purchases. For delivery orders, payment is handled directly through the Foodpanda or Grab apps, where you can typically use options like GCash, PayMaya, and GrabPay.",
    category: "Payment",
    display_order: 4,
    is_active: true,
  },
  {
    question: "Are you hiring?",
    answer:
      'Yes, we are! Hiring depends on the specific needs and available slots at each branch. You can visit the "Join Us" page on our website to see all open jobs and submit your application. We look forward to hearing from you!',
    category: "General",
    display_order: 5,
    is_active: true,
  },
  {
    question: "What is your return or refund policy?",
    answer:
      "If you're not satisfied with your meal, please let us know immediately and we'll make it right. We stand behind the quality of our food and service.",
    category: "General",
    display_order: 6,
    is_active: true,
  },
];

async function seedFAQs() {
  try {
    console.log("Starting FAQ seed...");

    // Check if FAQs already exist
    const existingFAQs = await db("faqs")
      .whereNull("deleted_at")
      .select("question");

    const existingQuestions = existingFAQs.map((faq) => faq.question);

    // Filter out duplicates
    const newFAQs = faqs.filter(
      (faq) => !existingQuestions.includes(faq.question)
    );

    if (newFAQs.length === 0) {
      console.log("All FAQs already exist in the database.");
      process.exit(0);
    }

    // Insert FAQs
    for (const faq of newFAQs) {
      await db("faqs").insert({
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        display_order: faq.display_order,
        is_active: faq.is_active,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`✓ Added: ${faq.question}`);
    }

    console.log(`\nSuccessfully added ${newFAQs.length} FAQ(s)!`);
  } catch (error) {
    console.error("Error seeding FAQs:", error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

seedFAQs();

