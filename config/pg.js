// const { Client } = require('pg');
// require('dotenv').config();

// class Database {
//     constructor() {
//         if(!Database.instance){
//             this.client = new Client({
//                 host: process.env.PG_HOST || 'db.hyttivxpaulouzswzjzn.supabase.co',  // Corrected here
//                 port: process.env.PG_PORT || 5432,
//                 database: process.env.PG_DB || 'postgres',
//                 user: process.env.PG_USER || 'postgres',
//                 password: process.env.PG_PASS || '',
//                 connectionTimeoutMillis: 5000, // Optional: Set connection timeout
//                 ssl: { rejectUnauthorized: false },
//             });

//             this.client.connect()
//                 .then(() => console.log('Database connected successfully'))
//                 .catch(err => console.error('Error connecting to database', err));

//             Database.instance = this;
//         }

//         return Database.instance;
//     }

//     async query(text, params) {
//         try {
//             const res = await this.client.query(text, params);
//             return res.rows;
//         } catch (err) {
//             console.error('Database query error', err);
//             throw err;
//         }
//     }

//     async close() {
//         try {
//             await this.client.end();
//             console.log('Database connection closed');
//         } catch (err) {
//             console.error('Error closing connection:', err);
//         }
//     }
// }

// const dbInstance = new Database();
// Object.freeze(dbInstance);  

// module.exports = dbInstance;
