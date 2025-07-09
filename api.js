import config from './config/env.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import db from './config/db.js';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import formatResponse from './utils/responseFormatter.js';

import swaggerJSDoc from 'swagger-jsdoc';  // <-- Correct placement
import swaggerUi from 'swagger-ui-express';

import authenticateToken from './middleware/authToken.js';
import refreshToken from './middleware/refreshToken.js';

const app = express();

app.set('trust proxy', 1);

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

app.use(cookieParser());
app.use(express.json());
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: [
                "'self'",
                "https://kanban-api-tyww.onrender.com/"
            ],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
        }
    }
}));

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 * /:
 *   get:
 *     summary: Welcome to the API
 *     description: This is the welcome endpoint of the API.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successful response with the app's version and name
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: A welcome message for the user.
 *                   example: "Welcome to the Kanban API build version 1.0.0"
 *                 app_name:
 *                   type: string
 *                   description: The name of the app
 *                   example: "Kanban API"
 *                 app_tag:
 *                   type: string
 *                   description: The version of the app
 *                   example: "1.0.0"
 */
app.get('/', authenticateToken, async (req, res) => {
    res.send(`Welcome to ${config.server.app_name} build version ${config.server.app_tag}`);
});

app.get('/test', async (req, res) => {
    res.send(`This is a test endpoint`);
});

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 * /refresh_token:
 *   post:
 *     summary: Refresh access token using a valid refresh token
 *     description: This endpoint refreshes the access token using the provided refresh token.
 *     security:
 *       - BearerAuth: []  # Security definition to use the BearerAuth for JWT-based authentication.
 *     responses:
 *       200:
 *         description: Successfully refreshed token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message for token refresh.
 *                   example: "Access token refreshed successfully."
 *                 new_access_token:
 *                   type: string
 *                   description: The new JWT access token.
 *                   example: "new-access-token-here"
 *       401:
 *         description: Invalid or expired refresh token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message when the refresh token is invalid or expired.
 *                   example: "Invalid or expired refresh token."
 *       400:
 *         description: Bad request due to missing or invalid parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message for bad request.
 *                   example: "Missing or invalid refresh token."
 */
app.post('/refresh_token', refreshToken, async (req, res) => {
    return res.status(200).json(formatResponse(200, 'New access token issued'));
});

import authRouter from './routes/auth.js'
app.use('/api/auth', authRouter);

import userRouter from './routes/users/users.js';
app.use('/api', userRouter);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json(formatResponse(500, 'Internal Server Error'));
});

process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await db.closeConnection()
    process.exit();
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await db.closeConnection()
    process.exit();
});

const app_url = config.server.app_url;
const port = config.server.port;

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Kanban API',
        version: '1.0.0',
        description: 'A simple Kanban API',
    },
    servers: [
        {
        url: `${app_url}`,
        description: 'Development server',
        },
    ],
};

const swaggerOptions = {
    swaggerDefinition,
    apis: ['./routes/*.js', './routes/**/*.js', './api.js'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(port, () => {
    console.log(`Server is running on ${app_url}`);
});