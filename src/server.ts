require("dotenv").config();
import initializeApp from "./app";

/**
 * Initialize application
 */
const app = initializeApp();

/**
 * Server start up log
 */
const port = process.env.PORT || 3000;
const packageName = `${process.env.npm_package_name}:${process.env.npm_package_version}`;
const startString = `Start ${packageName}`;

console.info("");
console.info(":".repeat(startString.length));
console.info(startString);
console.info(":".repeat(startString.length));
console.info("");
console.info(`Environment: ${process.env.NODE_ENV}`);

const envKeys = [
    "ALLOWED_ORIGIN",
    "MONGO_URI",
    "SESSION_SECRET",
    "SPOTIFY_CLIENT_ID",
    "SPOTIFY_CLIENT_SECRET",
    "SPOTIFY_TOKEN_REFRESH"
];

if (process.env.NODE_ENV === "development") envKeys.push("SPOTIFY_DEV_TOKEN");

envKeys.sort();

const longestKey = envKeys.reduce(function (a, b) {
    return a.length > b.length ? a : b;
});

envKeys.forEach((key) => {
    console.info(`ENV: ${key.padEnd(longestKey.length, " ")} -> ${process.env[key]}`);
});

/**
 * Listen for application signal
 */
app.on("ready", () => {
    app.listen(port, () => {
        console.info("");
        console.info("Ready!");
        console.info(`Listening at: http://localhost:${port}`);
        console.info("");
    });
});

app.on("fail", () => {
    console.log("Application has failed to start");
    process.exit(1);
});
