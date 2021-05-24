import { ApolloError, ApolloServer } from "apollo-server-express";
import express, { Express, Request, Response, NextFunction } from "express";
import compression from "compression";
import cors from "cors";
import Redis from "ioredis";
import cookieSession from "cookie-session";
import ms from "ms";

import { DB_CONNECTION, REDIS_CLIENT, SPOTIFY_WEB_API_TOKEN } from "./config/constants";
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
            app.use(
                cookieSession({
                    name: "session",
                    keys: [process.env.SESSION_KEY_ONE || "", process.env.SESSION_KEY_TWO || ""],
                    secret: process.env.SESSION_SECRET || "iseedeadpeople",
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    maxAge: ms(
                        process.env.REFRESH_TOKEN_EXPIRES_IN
                            ? String(process.env.REFRESH_TOKEN_EXPIRES_IN)
                            : "90 days"
                    )
                })
            );

            /**
             * Configure Redis
             */
            app.set(REDIS_CLIENT, new Redis());

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
             * Catch-all 404 handler
             */
            app.use("*", (req: Request, res: Response, next: NextFunction) => {
                const params = (Object.values(req.params) || []).map((param) => param);

                next({
                    statusCode: 404,
                    message: "Not Found",
                    details:
                        params.length > 0
                            ? [`${params.join("")} does not exist`]
                            : ["The requested resource could not be found or does not exist"]
                });
            });

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
