# Thesis B

A full-stack application built with Vue.js frontend and Express.js backend.

## Project Structure

```
├── frontend/          # Vue.js application
├── backend/           # Express.js API server
├── README.md
└── package.json
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm

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

- `GET /` - Welcome message
- `GET /api/health` - Health check endpoint

## Technologies Used

### Frontend
- Vue.js 3
- Vite

### Backend
- Express.js
- Node.js
- CORS middleware
- dotenv for environment variables

## Development

- Backend uses nodemon for hot reloading during development
- Frontend uses Vite's hot module replacement