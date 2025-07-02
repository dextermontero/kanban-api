import config from '../config/env.js';
import createRedisClient from '../config/redis.js';
import jwt from 'jsonwebtoken';
import formatResponse from '../utils/responseFormatter.js';

const redis = await createRedisClient();

const authToken = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json(formatResponse(401, 'Access Denied: Token is missing'));
    }

    const decoded = jwt.decode(token);
    const isBlacklisted = await redis.get(decoded.jti);

    if (isBlacklisted === 'blacklisted') {
        return res.status(403).json(formatResponse(403, 'This token has been invalidated (blacklisted)'));
    }

    jwt.verify(token, config.jwt.jwt_secret_token, (err, user) => {
        if (err) {
            let errorMessage = 'Invalid Token';
            let statusCode = 403;

            if (err.name === 'TokenExpiredError') {
                errorMessage = 'Token has expired';
                statusCode = 401;
            }
            if (err.name === 'JsonWebTokenError') {
                errorMessage = 'Invalid token format';
                statusCode = 400;
            }
            if (err.name === 'NotBeforeError') {
                errorMessage = 'Token not active yet';
                statusCode = 400;
            }
            return res.status(statusCode).json(formatResponse(statusCode, errorMessage));
        }
        req.user = user;
        next();
    });
}

export default authToken;