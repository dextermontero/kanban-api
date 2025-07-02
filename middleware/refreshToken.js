import config from '../config/env.js';
import db from '../config/db.js';
import jwt from 'jsonwebtoken';
import formatResponse from '../utils/responseFormatter.js';

const refreshToken = (req, res, next) => {

    const token = req.cookies.refreshToken || req.headers['authorization']?.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Refresh token is missing' });

    jwt.verify(token, config.jwt.jwt_refresh_token, async (err, user) => {
        if (err) {
            let errorMessage = 'Invalid refresh token';
            let statusCode = 403;

            if (err.name === 'TokenExpiredError') {
                errorMessage = 'Refresh token has expired';
                statusCode = 401;
            }

            return res.status(statusCode).json(formatResponse(statusCode, errorMessage));
        }

        const get_user = await db.getDB();
        const generated_tokens = await get_user.collection('generated_tokens');

        req.user = user;

        const existingToken = await generated_tokens.findOne({ email: user.email });

        if (!existingToken) {
            return res.status(401).json(formatResponse(401, 'Invalid token. Please try again!'));
        }

        const accessToken = jwt.sign(
            { _id: user._id, email: user.email, jti: `${user._id}-${new Date().getTime()}`, },
            config.jwt.jwt_secret_token,
            { expiresIn: config.jwt.jwt_secret_token_expiry }
        );

        res.setHeader('Authorization', `Bearer ${accessToken}`);
        next();
    });
}

export default refreshToken;