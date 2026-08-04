import dotenv from "dotenv";
import mysql from "mysql2";

dotenv.config();

const db = mysql.createConnection({
    host: process.env.DB_host,
    user: process.env.DB_user,
    password: process.env.DB_password,
    database: process.env.DB_name,
     ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
});

export default db;
