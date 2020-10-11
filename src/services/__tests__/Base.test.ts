//@ts-nocheck
import path from "path";

import { dbConnection } from "../../knex/db";
import { BaseService, OrderDirection } from "../Base";
import { UserService } from "../User";

describe("Base Service", () => {
    const baseService = new BaseService(dbConnection);
    const userService = new UserService(dbConnection);

    beforeAll(async (done) => {
        await dbConnection.migrate.latest();
        await dbConnection.seed.run({
            directory: path.join(__dirname, "../../knex/seeds"),
            loadExtensions: [".ts"],
            specific: "01_users.ts"
        });
        done();
    });

    afterAll(async (done) => {
        await dbConnection.destroy();
        done();
    });

    describe("getList", () => {
        const tableName = "users";
        const pk = "userNo";
        const selectableColumns = userService.tableColumns
            .filter((column) => column.isSelectable)
            .map((column) => column.key);
        const options = {
            where: {},
            itemsPerPage: 10,
            pageNo: 1,
            orderBy: {
                column: pk,
                direction: OrderDirection.ASC
            }
        };

        test("successfully returns a list of records", () => {
            return baseService.getList(tableName, pk, selectableColumns, options).then((list) => {
                list.forEach((record) => {
                    expect.objectContaining({
                        [pk]: record[pk]
                    });
                });
            });
        });

        test("successfully returns the correct amount of items", () => {
            const itemsPerPage = 5;

            return baseService
                .getList(tableName, pk, selectableColumns, { ...options, itemsPerPage })
                .then((list) => {
                    expect(list.length).toEqual(itemsPerPage);
                });
        });

        test("successfully returns the correct index when passing in a page number", () => {
            const pageNo = Math.floor(Math.random() * 10) + 1;
            const itemsPerPage = 1;

            return baseService
                .getList(tableName, pk, selectableColumns, { ...options, itemsPerPage, pageNo })
                .then((list) => {
                    expect(list.length).toEqual(1);
                    expect.arrayContaining([expect.objectContaining({ [pk]: pageNo })]);
                });
        });

        test("successfully return the list in ascending order", () => {
            return baseService
                .getList(tableName, pk, selectableColumns, {
                    ...options,
                    orderBy: { ...options.orderBy, direction: OrderDirection.ASC }
                })
                .then((list) => {
                    let expectedKey = 1;

                    list.forEach((record, index) => {
                        if (index > 0 && index < list.length - 1) {
                            expect(record[pk]).toEqual(expectedKey);
                            expect(record[pk]).toBeLessThan(list[index + 1][pk]);
                        } else {
                            expect(record[pk]).toEqual(expectedKey);
                        }

                        expectedKey++;
                    });
                });
        });

        test("successfully returns the list in descending order", () => {
            return baseService
                .getList(tableName, pk, selectableColumns, {
                    ...options,
                    orderBy: { ...options.orderBy, direction: OrderDirection.DESC }
                })
                .then((list) => {
                    let expectedKey = list.length;

                    list.forEach((record, index) => {
                        if (index > 0 && index < list.length - 1) {
                            expect(record[pk]).toEqual(expectedKey);
                            expect(record[pk]).toBeGreaterThan(list[index + 1][pk]);
                        } else {
                            expect(record[pk]).toEqual(expectedKey);
                        }

                        expectedKey--;
                    });
                });
        });
    }); // close describe("getList")

    describe("getCount", () => {
        const tableName = "users";
        const pk = "userNo";
        const selectableColumns = userService.tableColumns
            .filter((column) => column.isSelectable)
            .map((column) => column.key);
        const options = {
            where: { [pk]: 2 },
            itemsPerPage: 10,
            pageNo: 1,
            orderBy: {
                column: pk,
                direction: OrderDirection.DESC
            }
        };

        test("successfully returns the correct count", () => {
            return Promise.all([
                baseService.getList(tableName, pk, selectableColumns, options),
                baseService.getCount(tableName, pk, options.where)
            ]).then(([list, count]) => {
                expect(list.length).toEqual(count);
            });
        });
    }); // close describe("getCount")
}); // close describe("Base Service")
