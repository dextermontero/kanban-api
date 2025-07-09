// test/app.test.js
const request = require('supertest');
const app = require('../app');
const chai = require('chai');
const jwt = require('jsonwebtoken');
const expect = chai.expect;

const secretKey = 'your_secret_key';  // Same secret key as in the app.js

describe('Express API Authorization Tests', () => {
    
    // Generate a valid JWT token
    const generateToken = (user) => {
        return jwt.sign(user, secretKey, { expiresIn: '1h' });
    };

    // Test for a protected route (GET /protected)
    it('should return 200 with a valid token in the Authorization header', (done) => {
        const validToken = generateToken({ userId: '12345', username: 'john_doe' });

        request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`)  // Set the Authorization header
        .expect(200)
        .end((err, res) => {
            if (err) return done(err);
            expect(res.body.message).to.equal('You have access to the protected route!');
            done();
        });
    });

    // Test for a protected route with an invalid token
    it('should return 403 with an invalid token in the Authorization header', (done) => {
        const invalidToken = 'invalid_token';

        request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(403)
        .end((err, res) => {
            if (err) return done(err);
            expect(res.body.message).to.equal('Forbidden');
            done();
        });
    });

    // Test for a protected route without an Authorization header
    it('should return 401 if no Authorization header is provided', (done) => {
        request(app)
        .get('/protected')
        .expect(401)
        .end((err, res) => {
            if (err) return done(err);
            expect(res.body.message).to.equal('Token is missing');
            done();
        });
    });
});