const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Documentation",
      version: "1.0.0",
      description: "API documentation for the application",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local development server",
      },
    ],
  },
  apis: ["./server.js", "./routes/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = {
  specs: swaggerSpec,
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: "Thesis B API Documentation",
  }),
};
