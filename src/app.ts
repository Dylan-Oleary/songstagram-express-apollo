import compression from "compression";
import cors from "cors";
import express, { Express } from "express";
import { ApolloServer } from "apollo-server-express";

import { SPOTIFY_WEB_API_TOKEN } from "./config/constants";
import { schema } from "./graphql";
import { initializeSpotify, testDatabaseConnection } from "./config";

/**
 * Main application initialization
 */
const initializeApp: () => Express = () => {
    const app = express();

    Promise.all([testDatabaseConnection(app), initializeSpotify(app)])
        .then(() => {
            /**
             * Configure Application
             */
            app.use(express.json());
            app.use(express.urlencoded({ extended: true }));
            app.use(compression());
            app.use(cors());

            /**
             * Setup the Apollo GraphQL Server
             */
            new ApolloServer({
                schema,
                context: () => ({
                    spotifyWebApiToken: app.get(SPOTIFY_WEB_API_TOKEN)
                    // TODO: Authorize Application
                }),
                introspection: process.env.NODE_ENV !== "production"
            }).applyMiddleware({ app });

            app.emit("ready");
        })
        .catch((error) => {
            console.error(error);

            app.emit("fail");
        });

    return app;
};

export default initializeApp;
export { initializeApp };
