import config from '../config/env.js';
import db from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator';

import encrypt from '../security/encrypt.js';

import formatResponse from '../utils/responseFormatter.js';

import createRedisClient from '../config/redis.js';
const redis = await createRedisClient();
const { encryptPassword, comparePassword } = encrypt;

const router = express.Router();
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register Credentials
 *     description: Register to the system with full name, email address and password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                  type: string
 *                  description: Full name
 *                  example: Juan Dela Cruz
 *               email:
 *                 type: string
 *                 description: Enter your email address
 *                 example: juandelacruz@gmail.com
 *               password:
 *                 type: string
 *                 description: Enter your password
 *                 example: admin@123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *       400:
 *         description: Failed to register user
 */
router.post('/register',
    body('full_name').isLength({ min: 2 }).withMessage('Full name should be at least 2 characters'),
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').isLength({ min: 8 }).withMessage('Password should be at least 8 characters long'),
    async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { full_name, email, password } = req.body;

        const hashedPassword = await encryptPassword(password);

        const db = await db.getDB();
        const user_login = await db.collection('user_login');

        const existingUser = await user_login.findOne({ email_address: email });

        if (existingUser) {
            return res.status(400).json({ message: 'Email is already registered' });
        }

        try {
            const uuid = uuidv4();

            const userRegister = await user_login.insertOne({
                _id: uuid,
                avatar: null,
                full_name: full_name,
                email_address: email,
                password: hashedPassword,
                groups: [],
                roles: "",
                verified: false,
                created_at: new Date(),
                updated_at: null
            });

            if (userRegister.acknowledged) {
                return res.status(201).json(formatResponse(201, "User registered successfully"));
            } else {
                return res.status(400).json(formatResponse(400, "Failed to register user"));
            }
        } catch (error) {
            return res.status(500).json(formatResponse(500, "Internal server error"));
        }
    }
);
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login Credentials
 *     description: Login to the system with username and password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email address
 *                 example: admin@gmail.com
 *               password:
 *                 type: string
 *                 description: your password credential
 *                 example: admin
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *       400:
 *         description: Invalid credentials. Please try again!
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await db.getDB();
    const user_login = await user.collection('user_login');
    const generated_tokens = await user.collection('generated_tokens');

    const existingUser = await user_login.findOne({ email_address: email });

    if (!existingUser) {
        return res.status(401).json(formatResponse(401, 'Invalid credentials. Please try again!'));
    }

    const match = await comparePassword(password, existingUser.password);

    if (!match) return res.status(401).json(formatResponse(401, 'Invalid credentials. Please try again!'));

    try {
        const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const accessToken = jwt.sign(
            { _id: existingUser._id, email: existingUser.email_address, jti: `${existingUser._id}-${new Date().getTime()}`, },
            config.jwt.jwt_secret_token,
            { expiresIn: config.jwt.jwt_secret_token_expiry }
        );

        const refreshToken = jwt.sign(
            { _id: existingUser._id, email: existingUser.email_address },
            config.jwt.jwt_refresh_token,
            { expiresIn: config.jwt.jwt_refresh_token_expiry }
        );

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: config.server.app_env === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        await generated_tokens.updateOne(
            {
                email: existingUser.email_address,
            },
            {
                $set: {
                    lastLoginIp: userIp,
                    lastLoginUserAgent: userAgent,
                    lastLoginAt: new Date(),
                }
            },
            { upsert: true }
        )

        res.json({
            message: 'Logged in successfully',
            token: accessToken,
        });
    } catch (error) {
        return res.status(401).json(formatResponse(401, 'Invalid credentials. Please try again!'));
    }
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
 * /api/auth/logout:
 *   post:
 *     summary: Logs the user out
 *     description: Logs the user out by clearing the refresh token cookie.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 example: ""
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *       400:
 *         description: Invalid credentials. Please try again!
 */
router.post('/logout', async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    const payload = req.body.token;

    if (token === payload) {
        if(token) {
            const decoded = jwt.decode(token);
            await redis.set(decoded.jti, 'blacklisted', { EX: 3600 });

            const user = await db.getDB();
            const generated_tokens = await user.collection('generated_tokens');

            const existingUser = await generated_tokens.findOne({ email: decoded.email });

            if (existingUser) {
                await generated_tokens.deleteOne({
                    email: decoded.email,
                });
            }
        }

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: config.server.app_env === 'production',
            sameSite: 'Strict',
            maxAge: 0,
        });

        return res.status(200).json(formatResponse(200, 'Logged out successfully'));
    }

    return res.status(401).json(formatResponse(401, 'Invalid Token'));
});

export default router;