import config from "../../config/env.js";
import db from '../../config/db.js';
import express from "express";
import jwt from 'jsonwebtoken';

import authenticateToken from '../../middleware/authToken.js';
import formatResponse from "../../utils/responseFormatter.js";

import userTransform from '../../utils/transformer/userTransform.js'

import { body, validationResult } from 'express-validator';

import encrypt from '../../security/encrypt.js';
const { encryptPassword } = encrypt;

const router = express.Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 * /api/users:
 *   get:
 *     summary: User List
 *     description: Fetching the user lists with optional filtering by parameters.
 *     security:
 *       - BearerAuth: []  # Security definition to use the BearerAuth for JWT-based authentication.
 *     parameters:
 *       - in: query
 *         name: full_name
 *         schema:
 *           type: string
 *           example: "John Doe"
 *         required: false
 *         description: Filter users by full name
 *       - in: query
 *         name: email_address
 *         schema:
 *           type: string
 *           example: "admin@gmail.com"
 *         required: false
 *         description: Filter users by email address
 *       - in: query
 *         name: role
 *         schema:
 *           type: array
 *           example: ["admin", "user", "superadmin"]
 *         required: false
 *         description: Filter users by role
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Filter users by verified status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         required: false
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         required: false
 *         description: Number of records per page for pagination
 *     responses:
 *       200:
 *         description: Successfully retrieved user data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Successfully retrieved user data"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       full_name:
 *                         type: string
 *                       email_address:
 *                         type: string
 *                       roles:
 *                         type: array
 *                         items:
 *                           type: string
 *                       verified:
 *                         type: boolean
 *       400:
 *         description: Failed to retrieve user data.
 */
router.get('/users', authenticateToken, async (req, res) => {
    try {
        const users = await db.getDB();
        const userCollection = await users.collection('user_login');

        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 10, 100);
        const skip = (page - 1) * limit;

        let queryData = {};

        if (req.query.full_name) {
            queryData.full_name = req.query.full_name;
        }

        if (req.query.email_address) {
            queryData.email_address = req.query.email_address;
        }

        if(req.query.role) {
            const roles = Array.isArray(req.query.role) ? req.query.role : req.query.role.split(',').map(role => role.trim());
            queryData.roles = { $in: roles };
        }

        if (req.query.verified !== undefined) {
            const verified = req.query.verified === 'true' || req.query.verified === true;
            queryData.verified = verified;
        }

        const total = await userCollection.countDocuments(queryData);
        const userLists = await userCollection.find(queryData)
                .sort({ _id: 1 })
                .skip(skip)
                .limit(limit)
                .toArray();

        const transformed = userLists.map(userTransform)

        const meta = {
            current_page: page,
            per_page: limit,
            total_records: total,
            total_pages: Math.ceil(total / limit)
        };

        return res.status(200).json(formatResponse(200, 'Successfully retrieved user data', transformed, meta));
    } catch (error) {
        return res.status(400).json(formatResponse(400, 'Failed to retrieve user data'));
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
 * /api/users/create:
 *   post:
 *     summary: Create a new user.
 *     description: This endpoint allows for the creation of a new user. The default password is `admin@123`. An auto-generated password will be implemented in the future, which will be sent to the provided email address.
 *     security:
 *       - BearerAuth: []  # Security definition to use the BearerAuth for JWT-based authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               email_address:
 *                 type: string
 *               groups:
 *                 type: array
 *                 example: []
 *     responses:
 *       201:
 *         description: Successfully created user data.
 *       400:
 *         description: Invalid input or failed to create user.
 *       500:
 *         description: Internal Server Error. Something went wrong on the server.
 */
router.post('/users/create', 
    body('full_name').isLength({ min: 2 }).withMessage('Full name should be at least 2 characters'),
    body('email_address').isEmail().withMessage('Invalid email format'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(formatResponse(400, 'Validation Failed', null, null, errors.array()));
        }
        next();
    },
    authenticateToken, async (req, res) => {
    
    try {
        const token = req.headers['authorization']?.split(' ')[1];

        const userID = jwt.verify(token, config.jwt.jwt_secret_token);

        const hashedPassword = await encryptPassword(password);

        const userData = {
            avatar: null,
            full_name: req.body.full_name,
            email_address: req.body.email_address,
            password: hashedPassword,
            groups: req.body.groups,
            roles: "",
            verified: false,
            created_at: new Date(),
            updated_at: null,
            created_by: userID._id,
            updated_by: null
        }

        const users = await db.getDB();
        const userCollection = await users.collection('user_login');

        await userCollection.insertOne(userData)

        return res.status(201).json(formatResponse(201, 'Successfully created user data'));
    } catch(error) {
        if(error.code === 11000){
            return res.status(400).json(formatResponse(400, 'Email already exists'));
        }

        return res.status(500).json(formatResponse(500, 'Something went wrong', null, null, error.message));
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
 * /api/users/update:
 *   post:
 *     summary: Update user details.
 *     description: This endpoint allows the updating of user details.
 *     security:
 *       - BearerAuth: []  # Security definition to use the BearerAuth for JWT-based authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: string
 *               full_name:
 *                 type: string
 *               email_address:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, user, superadmin]
 *                 example: "user"
 *               verified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Successfully updated user data.
 *       400:
 *         description: Invalid input or failed to update user.
 */
router.post('/users/update', authenticateToken, async (req, res) => {
    // Endpoint logic here
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
 * /api/users/delete:
 *   post:
 *     summary: Delete a user.
 *     description: This endpoint allows the deletion of a user by their user ID.
 *     security:
 *       - BearerAuth: []  # Security definition to use the BearerAuth for JWT-based authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully deleted the user.
 *       400:
 *         description: Invalid user ID or failed to delete user.
 */
router.post('/users/delete', authenticateToken, async (req, res) => {
    // Endpoint logic here
});

export default router;
