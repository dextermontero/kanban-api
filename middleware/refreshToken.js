import config from '../config/env.js';
import db from '../config/db.js';
import jwt from 'jsonwebtoken';
import formatResponse from '../utils/responseFormatter.js';
import encrypt from '../security/encrypt.js';
import createRedisClient from '../config/redis.js';

const { comparePassword } = encrypt;

const refreshToken = (req, res, next) => {

    const token = req.cookies.refreshToken || req.headers['authorization']?.split(' ')[1];

    if (!token) return res.status(401).json(formatResponse(401, 'Refresh token is missing'));

    jwt.verify(token, config.jwt.jwt_refresh_token, async (err, user) => {
        if (err) {
            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: config.server.app_env === 'production',
                sameSite: 'Strict',
            });

            const statusCode = err.name === 'TokenExpiredError' ? 401 : 403;
            const errorMessage = err.name === 'TokenExpiredError' ? 'Refresh token has expired' : 'Invalid refresh token';
            return res.status(statusCode).json(formatResponse(statusCode, errorMessage));
        }

        try {
            const redisClient = await createRedisClient();
            const redisKey = `refreshToken:${user.email}`;
            const storedHashedToken = await redisClient.get(redisKey);

            const rateKey = `refresh:rate:${user.email}`;
            const attempts = await redisClient.incr(rateKey);

            if (attempts === 1) await redisClient.expire(rateKey, 10);
            if (attempts > 5) return res.status(429).json(formatResponse(429, 'Too many refresh attempts. Please wait a moment.'));

            if (!storedHashedToken) {
                res.clearCookie('refreshToken');
                return res.status(401).json(formatResponse(401, 'Session no longer exists'));
            }

            const isValid = await comparePassword(token, storedHashedToken);

            if (!isValid) {
                console.warn(`[REPLAY ATTACK] Detected token reuse for user ${user.email}`);

                const conn = await db.getDB();
                await conn.collection('security_logs').insertOne({
                    type: 'refresh_token_reuse',
                    email: user.email,
                    ip: req.ip || req.headers['x-forwarded-for'],
                    userAgent: req.headers['user-agent'],
                    occurredAt: new Date()
                });

                await redisClient.del(redisKey);
                res.clearCookie('refreshToken');
                return res.status(401).json(formatResponse(401, 'Token reuse detected. Please log in again.'));
            }

            const jti = `${user._id}-${Date.now()}`;
            const accessToken = jwt.sign(
                { 
                    _id: user._id, 
                    email: user.email, 
                    jti, 
                },
                config.jwt.jwt_secret_token,
                { expiresIn: config.jwt.jwt_secret_token_expiry }
            );

            const newRefreshToken = jwt.sign(
                {
                    _id: user._id,
                    email: user.email,
                    jti,
                },
                config.jwt.jwt_refresh_token,
                { expiresIn: config.jwt.jwt_refresh_token_expiry }
            )

            const hashedNewRefreshToken = await encryptPassword(newRefreshToken);

            await redisClient.set(redisKey, hashedNewRefreshToken, {EX: 7 * 24 * 60 * 60});
            await redisClient.del(rateKey);

            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: config.server.app_env === 'production',
                sameSite: 'Strict',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            res.setHeader('Authorization', `Bearer ${accessToken}`);
            req.user = user;
            next();
        } catch (error) {
            console.error('Refresh token rotation error:', error);
            res.clearCookie('refreshToken');
            return res.status(500).json(formatResponse(500, 'Internal server error'));
        }
    });
}

export default refreshToken;