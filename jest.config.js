module.exports = {
    collectCoverageFrom: ["src/**/*.ts", "!src/graphql/*.ts", "!src/knex/**/*.ts"],
    coverageDirectory: "coverage",
    moduleNameMapper: {
        "^~knex/(.*)$": "<rootDir>/src/knex/$1"
    },
    preset: "ts-jest",
    roots: ["<rootDir>/src"],
    testEnvironment: "node",
    testMatch: ["**/__tests__/**/*.+(ts|tsx|js)", "**/?(*.)+(spec|test).+(ts|tsx|js)"],
    transform: {
        "^.+\\.(ts|tsx)$": "ts-jest"
    }
};
