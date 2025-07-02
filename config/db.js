import config from './env.js';
import { MongoClient } from 'mongodb';

let client;
let dbInstance;

const uri = config.database.uri;
const db_name = config.database.db_name;

const poolOptions = {
    maxPoolSize: 50,
    minPoolSize: 5,
    maxIdleTimeMS: 300000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000
};

async function connectToDatabase() {
    if(dbInstance) {
        return dbInstance;
    }

    try {
        client = new MongoClient(uri, poolOptions);
        await client.connect();

        dbInstance = client.db(db_name);
        return dbInstance;
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
}

async function closeConnection() {
    if(client) {
        await client.close();
        console.log('MongoDB connection closed');
    }
}

async function getDB() {
    if (!dbInstance) {
        await connectToDatabase();
    }
    return dbInstance;
}

export default {
    connectToDatabase,
    closeConnection,
    getDB
}