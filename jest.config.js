module.exports = {
    collectCoverageFrom: ["src/**/*.ts", "!src/graphql/*.ts", "!src/knex/**/*.ts"],
    coverageDirectory: "coverage",
    globals: {
        "ts-jest": {
            tsConfig: "./tsconfig.test.json"
        }
    },
    moduleDirectories: ["node_modules", "src"],
    moduleFileExtensions: ["ts", "js"],
    moduleNameMapper: {
        "^~knex/(.*)$": "<rootDir>/src/knex/$1",
        "^~services/(.*)$": "<rootDir>/src/services/$1"
    },
    roots: ["<rootDir>/src"],
    testEnvironment: "node",
    testMatch: ["**/__tests__/**/*.+(ts|tsx|js)", "**/?(*.)+(spec|test).+(ts|tsx|js)"],
    testTimeout: 15000,
    transform: {
        "^.+\\.(ts|tsx)$": "ts-jest"
    }
};
