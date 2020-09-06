import axios from "axios";
import { Express } from "express";
import ms from "ms";
import qs from "qs";

import { SPOTIFY_WEB_API_TOKEN } from "./constants";

const initializeSpotify = async (app: Express) => {
    try {
        if (process.env.NODE_ENV === "production") {
            const renewSpotifyWebToken = () => {
                const applicationToken = Buffer.from(
                    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
                ).toString("base64");
                const url = "https://accounts.spotify.com/api/token";
                const headers = {
                    Authorization: `Basic ${applicationToken}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                };
                const body = { grant_type: "client_credentials" };

                return axios
                    .post(url, qs.stringify(body), { headers })
                    .then(({ data }) => {
                        const { access_token } = data;

                        app.set(SPOTIFY_WEB_API_TOKEN, access_token);
                        setTimeout(() => {
                            console.info("Refreshing Spotify Web Token");

                            renewSpotifyWebToken().catch((error) => {
                                throw error;
                            });
                        }, ms(process.env.SPOTIFY_TOKEN_REFRESH || "45m"));

                        return;
                    })
                    .catch((error) => {
                        throw error;
                    });
            };

            await renewSpotifyWebToken();
        } else {
            app.set(SPOTIFY_WEB_API_TOKEN, process.env.SPOTIFY_DEV_TOKEN);
        }
    } catch (error) {
        throw error;
    }
};

export default initializeSpotify;
export { initializeSpotify };
