import { Express } from "express";

import { DB_CONNECTION, DB_TEST_QUERY } from "./constants";
import { dbConnection } from "../knex/db";

const testDatabaseConnection = (app: Express) => {
    return new Promise((resolve, reject) => {
        dbConnection
            .raw(DB_TEST_QUERY)
            .then(() => {
                console.info("");
                console.info("SQL Connection Successful!");

                app.set(DB_CONNECTION, dbConnection);
                resolve();
            })
            .catch((error) => {
                console.info("");
                console.error("SQL Connection Failed!");

                reject(error);
            });
    });
};

export default testDatabaseConnection;
export { testDatabaseConnection };
