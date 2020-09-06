import bodyParser from "body-parser";
import compression from "compression";
import cors from "cors";
import express from "express";
import { ApolloServer } from "apollo-server-express";

import { initializeMongo } from "./config";
import { SPOTIFY_WEB_API_TOKEN } from "./config/constants";
import { schema } from "./graphql";
import initializeSpotify from "./config/spotify";

/**
 * Main application initialization
 */
const initializeApp = () => {
    const app = express();

    Promise.all([initializeMongo(), initializeSpotify(app)])
        .then(() => {
            /**
             * Configure Application
             */
            app.use(bodyParser.json());
            app.use(bodyParser.urlencoded({ extended: true }));
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
