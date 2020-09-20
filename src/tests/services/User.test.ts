const { dbConnection } = require("~knex/db");

describe("User Service", () => {
    beforeAll(async (done) => {
        await dbConnection.migrate.latest();
        done();
    });

    afterAll((done) => {
        dbConnection.close();
        done();
    });

    test("select users", async () => {
        let users = await dbConnection.from("users");
        expect(users.length).toEqual(0);
    });
}); // close describe("User Service")
