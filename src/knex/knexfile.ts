require("dotenv").config({ path: __dirname + "/../../.env" });
const path = require("path");

module.exports = {
    test: {
        client: "sqlite3",
        connection: ":memory:",
        migrations: { directory: path.join(__dirname, "./migrations") },
        seeds: { directory: path.join(__dirname, "./seeds") },
        useNullAsDefault: true,
        log: {
            warn() {
                return null;
            }
        }
    },
    development: {
        client: "mysql2",
        connection: {
            host: process.env.MYSQL_HOST,
            port: process.env.MYSQL_PORT,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE
        },
        migrations: { directory: "./migrations" },
        seeds: { directory: "./seeds" }
    },
    production: {
        client: "mysql2",
        connection: {
            host: process.env.MYSQL_HOST,
            port: process.env.MYSQL_PORT,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE
        },
        migrations: { directory: "./migrations" },
        seeds: { directory: "./seeds" }
    }
};
