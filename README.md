# Kanban API

A RESTful API for user authentication and session management, built with Node.js, Express, MongoDB, and Redis.

## Features

- User registration and login with JWT authentication
- Refresh token mechanism
- Token blacklisting (logout)
- Rate limiting, CORS, and security headers
- Swagger API documentation

## Project Structure

```
.
├── api.js                # Main entry point
├── config/               # Configuration files (DB, Redis, Env)
├── middleware/           # Express middlewares (auth, refresh)
├── routes/               # API route handlers
├── security/             # Security utilities (encryption)
├── utils/                # Utility functions (response formatting)
├── .env                  # Environment variables
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB instance
- Redis instance

### Installation

1. Clone the repository:
   ```sh
   git clone <repo-url>
   cd kanban-api
   ```

2. Install dependencies:
   ```sh
   yarn install
   ```

3. Configure environment variables in `.env` (see `.env.example` for reference).

4. Start the server:
   ```sh
   yarn dev
   ```

   The server will run on the port specified in `.env` (default: 8002).

## API Documentation

Swagger UI is available at:  
[http://localhost:8002/docs](http://localhost:8002/docs)

### Authentication Endpoints

#### Register

- **POST** `/api/auth/register`
- Body:  
  ```json
  {
    "full_name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- Response: `201 Created` on success

#### Login

- **POST** `/api/auth/login`
- Body:  
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- Response: `200 OK` with JWT access token

#### Logout

- **POST** `/api/auth/logout`
- Headers: `Authorization: Bearer <access_token>`
- Body:  
  ```json
  {
    "token": "<access_token>"
  }
  ```
- Response: `200 OK` on success

#### Refresh Token

- **POST** `/refresh_token`
- Cookie: `refreshToken=<refresh_token>`
- Response: `200 OK` with new access token

### Protected Endpoint

- **GET** `/`
- Headers: `Authorization: Bearer <access_token>`
- Response: Welcome message

## Environment Variables

See `.env` for all required variables, including:

- `MONGODB_CONNECTION_STRING`
- `MONGODB_DB`
- `JWT_SECRET_TOKEN`
- `JWT_REFRESH_TOKEN`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD`

## License

MIT © 2025 Dexter Montero