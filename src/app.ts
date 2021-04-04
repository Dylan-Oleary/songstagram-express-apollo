import compression from "compression";
import cors from "cors";
import express, { Express, Request, Response, NextFunction } from "express";
import { ApolloError, ApolloServer } from "apollo-server-express";

import { DB_CONNECTION, SPOTIFY_WEB_API_TOKEN } from "./config/constants";
import { buildSchema } from "./graphql";
import { initializeSpotify, testDatabaseConnection } from "./config";
import { baseRouter } from "./routes";
import { AuthenticationService, IError } from "./services";

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
             * Setup endpoints and middleware
             */
            app.use("/", baseRouter);

            /**
             * Setup the Apollo GraphQL Server
             */
            new ApolloServer({
                schema: buildSchema(app),
                context: async ({ req }) => {
                    const user = await new AuthenticationService(app.get(DB_CONNECTION))
                        .authenticateAccessToken(req)
                        .catch((error: IError) => {
                            throw new ApolloError(
                                error?.message || "An unexpected error has occurred",
                                error.statusCode ? String(error.statusCode) : "500",
                                error
                            );
                        });

                    return {
                        spotifyWebApiToken: app.get(SPOTIFY_WEB_API_TOKEN),
                        user
                    };
                },
                introspection: process.env.NODE_ENV !== "production"
            }).applyMiddleware({ app });

            /**
             * Setup global error handler
             */
            app.use((err: Error | IError, req: Request, res: Response, next: NextFunction) => {
                let status = 500;
                let message = err.message || "Server Error";
                let details: string[] = [];

                if ((err as IError)?.statusCode) {
                    status = (err as IError)?.statusCode;
                    details = (err as IError)?.details;
                }

                /**
                 * Log 500 errors to error reporting
                 */
                if (new RegExp(/^5\d{2}$/).test(String(status))) {
                    console.error(status);
                }

                //TODO: Invalidate any tokens/log users out when unauthenticated

                return res.status(status).json({
                    status,
                    message,
                    details
                });
            });

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
