const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Thesis B - RBAC API Documentation",
      version: "1.0.0",
      description:
        "Complete API documentation for the Role-Based Access Control system",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local development server",
      },
    ],
    tags: [
      {
        name: "Health",
        description: "Health check endpoints",
      },
      {
        name: "Users",
        description: "User management endpoints",
      },
      {
        name: "Roles",
        description: "Role management endpoints",
      },
      {
        name: "Permissions",
        description: "Permission management endpoints",
      },
      {
        name: "Role-Permissions",
        description: "Role-Permission assignment endpoints",
      },
    ],
    components: {
      schemas: {
        Permission: {
          type: "object",
          properties: {
            permission_id: {
              type: "integer",
              description: "The auto-generated ID of the permission",
              example: 1,
            },
            permission_name: {
              type: "string",
              description: "The name of the permission",
              example: "Manage Users",
            },
          },
          required: ["permission_name"],
        },
        Role: {
          type: "object",
          properties: {
            role_id: {
              type: "integer",
              description: "The auto-generated ID of the role",
              example: 1,
            },
            role: {
              type: "string",
              description: "The name of the role",
              example: "Manager",
            },
            department: {
              type: "string",
              description: "The department the role belongs to",
              example: "Human Resource",
            },
            description: {
              type: "string",
              description: "The description of the role",
              example: "Manage the human resource department",
            },
            created_at: {
              type: "string",
              format: "date-time",
              description: "When the role was created",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              description: "When the role was last updated",
            },
            deleted_at: {
              type: "string",
              format: "date-time",
              nullable: true,
              description: "When the role was deleted (soft delete)",
            },
            is_active: {
              type: "boolean",
              description: "Whether the role is active",
              example: true,
            },
          },
          required: ["role", "department", "description"],
        },
        RoleWithPermissions: {
          allOf: [
            { $ref: "#/components/schemas/Role" },
            {
              type: "object",
              properties: {
                permissions: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Permission" },
                  description: "List of permissions assigned to this role",
                },
              },
            },
          ],
        },
        RolePermission: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "The auto-generated ID of the assignment",
              example: 1,
            },
            role_id: {
              type: "integer",
              description: "The ID of the role",
              example: 1,
            },
            permission_id: {
              type: "integer",
              description: "The ID of the permission",
              example: 1,
            },
            created_at: {
              type: "string",
              format: "date-time",
              description: "When the assignment was created",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              description: "When the assignment was last updated",
            },
            is_active: {
              type: "boolean",
              description: "Whether the assignment is active",
              example: true,
            },
            deleted_at: {
              type: "string",
              format: "date-time",
              nullable: true,
              description: "When the assignment was deleted (soft delete)",
            },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              example: "Operation completed successfully",
            },
            data: {
              type: "object",
              description: "Response data",
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Error message",
            },
            error: {
              type: "string",
              example: "Detailed error description",
            },
            code: {
              type: "string",
              example: "ERROR_CODE",
            },
          },
        },
      },
    },
  },
  apis: ["./server.js", "./routes/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = {
  specs: swaggerSpec,
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: "Thesis B - RBAC API Documentation",
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #2c3e50; }
    `,
    swaggerOptions: {
      docExpansion: "list",
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
    },
  }),
};
