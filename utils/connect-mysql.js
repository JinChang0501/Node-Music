// 新德老師寫法
import mysql from "mysql2/promise";

const { DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE } = process.env;

console.log({ DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE });

const db = await mysql.createPool({
  host: DB_HOST,
  user: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

export default db;