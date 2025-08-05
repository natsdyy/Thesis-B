# Thesis B

A full-stack application built with Vue.js frontend and Express.js backend with PostgreSQL database.

## Project Structure

```
├── frontend/          # Vue.js application
├── backend/           # Express.js API server
│   ├── config/        # Database configuration
│   ├── models/        # Database models
│   ├── routes/        # API routes
│   ├── server.js      # Main server file
│   └── .env           # Environment variables
├── README.md
└── package.json
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm
- PostgreSQL database (Railway PostgreSQL is already configured)

### Installation

1. Clone the repository

```bash
git clone git@github.com:natsdyy/Thesis-B.git
cd Thesis-B
```

2. Install dependencies for both frontend and backend

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. Set up environment variables

Create a `.env` file in the `backend` directory with the following content:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=your_postgresql_connection_string
```

**Note:** The Railway PostgreSQL database is already configured in the project.

### Running the Application

#### Development Mode

1. Start the backend server:

```bash
cd backend
npm run dev
```

The backend will run on http://localhost:5000

2. Start the frontend development server:

```bash
cd frontend
npm run dev
```

The frontend will run on http://localhost:5173

#### Production Mode

1. Build the frontend:

```bash
cd frontend
npm run build
```

2. Start the backend:

```bash
cd backend
npm start
```

## API Endpoints

### General

- `GET /` - Welcome message
- `GET /api/health` - Server health check
- `GET /api/db-health` - Database connection health check

### Users API

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Example API Usage

**Create a user:**

```bash
POST /api/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@example.com"
}
```

**Get all users:**

```bash
GET /api/users
```

## Technologies Used

### Frontend

- Vue.js 3
- Vite
- Pinia (State Management)
- Tailwind CSS (Utility-first CSS framework)
- Daisy UI (Tailwind CSS components)
- PostCSS & Autoprefixer

### Backend

- Express.js
- Node.js
- PostgreSQL (Railway)
- pg (PostgreSQL driver)
- CORS middleware
- dotenv for environment variables
- nodemon for development

## Development

- Backend uses nodemon for hot reloading during development
- Frontend uses Vite's hot module replacement
- Database tables are automatically created when the server starts
- Use `backend/test-api.http` file for testing API endpoints (works with REST Client extension in VS Code)

## Frontend Features

### Pinia State Management

- Centralized state management for user data
- Reactive state with Vue 3 Composition API
- Automatic API integration with error handling

### Tailwind CSS + Daisy UI

- Utility-first CSS framework for rapid development
- 30+ pre-built themes (light, dark, cyberpunk, etc.)
- Responsive design components
- Theme switcher with persistence

### Vue 3 Composition API

- Modern reactive components
- Script setup syntax
- Composable functions for reusability

## Database Schema

### Users Table

- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR(255) NOT NULL)
- `email` (VARCHAR(255) UNIQUE NOT NULL)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

## Testing

1. **Test server health:**

   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Test database connection:**

   ```bash
   curl http://localhost:5000/api/db-health
   ```

3. **Use the provided test file:**
   Open `backend/test-api.http` in VS Code with REST Client extension to test all endpoints.
