import knex from "knex";

const knexFile = require("./knexfile");

const env = process.env.NODE_ENV || "development";
const configOptions = knexFile[env];

const dbConnection = knex(configOptions);

export default dbConnection;
export { dbConnection };
