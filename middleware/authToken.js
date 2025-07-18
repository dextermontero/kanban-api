import config from '../config/env.js';
import createRedisClient from '../config/redis.js';
import jwt from 'jsonwebtoken';
import formatResponse from '../utils/responseFormatter.js';

const redis = await createRedisClient();

const authToken = async (req, res, next) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];

        if (!token) {
            return res.status(401).json(formatResponse(401, 'Access Denied: Token is missing'));
        } 

        const decoded = jwt.decode(token);

        if (!decoded || !decoded.jti || !decoded.exp) {
            return res.status(400).json(formatResponse(400, 'Invalid token structure'));
        }

        const currentTimestamp = Math.floor(Date.now() / 1000);

        if (decoded.exp < currentTimestamp) {
            return res.status(401).json(formatResponse(401, 'Access token has expired'));
        }

        const blacklistKey = `accessToken:blacklist:${decoded.jti}`;
        const isBlacklisted = await redis.get(blacklistKey);

        if (isBlacklisted === 'blacklisted') {
            return res.status(403).json(formatResponse(403, 'Token has been blacklisted'));
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
    } catch (err) {
        console.error('AuthToken middleware error:', err);
        return res.status(500).json(formatResponse(500, 'Internal Server Error'));
    }
}

export default authToken;