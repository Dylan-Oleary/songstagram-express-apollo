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
            return baseService
                .getList(tableName, pk, selectableColumns, options)
                .then(({ data }) => {
                    data.forEach((record) => {
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
                .then(({ data }) => {
                    expect(data.length).toEqual(itemsPerPage);
                });
        });

        test("successfully returns the correct index when passing in a page number", () => {
            const pageNo = Math.floor(Math.random() * 10) + 1;
            const itemsPerPage = 1;

            return baseService
                .getList(tableName, pk, selectableColumns, { ...options, itemsPerPage, pageNo })
                .then(({ data }) => {
                    expect(data.length).toEqual(1);
                    expect.arrayContaining([expect.objectContaining({ [pk]: pageNo })]);
                });
        });

        test("successfully return the list in ascending order", () => {
            return baseService
                .getList(tableName, pk, selectableColumns, {
                    ...options,
                    orderBy: { ...options.orderBy, direction: OrderDirection.ASC }
                })
                .then(({ data }) => {
                    let expectedKey = 1;

                    data.forEach((record, index) => {
                        if (index > 0 && index < data.length - 1) {
                            expect(record[pk]).toEqual(expectedKey);
                            expect(record[pk]).toBeLessThan(data[index + 1][pk]);
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
                .then(({ data }) => {
                    let expectedKey = data.length;

                    data.forEach((record, index) => {
                        if (index > 0 && index < data.length - 1) {
                            expect(record[pk]).toEqual(expectedKey);
                            expect(record[pk]).toBeGreaterThan(data[index + 1][pk]);
                        } else {
                            expect(record[pk]).toEqual(expectedKey);
                        }

                        expectedKey--;
                    });
                });
        });

        describe("Pagination", () => {
            test("successfully returns a pagination object", () => {
                const queryOptions = { ...options };

                queryOptions.itemsPerPage = 3;
                queryOptions.pageNo = 2;

                return Promise.all([
                    baseService.getList(tableName, pk, selectableColumns, queryOptions),
                    baseService.getCount(tableName, pk, queryOptions.where)
                ]).then(([recordSet, count]) => {
                    expect(recordSet).toHaveProperty("pagination");
                    expect(recordSet.pagination).toEqual({
                        currentPage: queryOptions.pageNo,
                        itemsPerPage: queryOptions.itemsPerPage,
                        nextPage: queryOptions.pageNo === 1 ? null : queryOptions.pageNo + 1,
                        prevPage: queryOptions.pageNo === 1 ? null : queryOptions.pageNo - 1,
                        totalPages: Math.ceil(count / queryOptions.itemsPerPage),
                        totalRecords: count
                    });
                });
            });

            test("successfully returns the correct pagination object if no records are found", () => {
                const queryOptions = { ...options };

                queryOptions.where = { [pk]: 10000 };

                return baseService
                    .getList(tableName, pk, selectableColumns, queryOptions)
                    .then((recordSet) => {
                        expect(recordSet).toHaveProperty("pagination");
                        expect(recordSet.pagination).toEqual({
                            currentPage: 1,
                            itemsPerPage: queryOptions.itemsPerPage,
                            nextPage: null,
                            prevPage: null,
                            totalPages: 0,
                            totalRecords: 0
                        });
                    });
            });

            test("successfully returns the correct pagination object if the requested page has no records", () => {
                const queryOptions = { ...options };

                queryOptions.pageNo = 1000;
                queryOptions.itemsPerPage = 10000;

                return baseService
                    .getList(tableName, pk, selectableColumns, queryOptions)
                    .then((recordSet) => {
                        expect(recordSet.data).toEqual([]);
                        expect(recordSet).toHaveProperty("pagination");
                        expect(recordSet.pagination).toEqual({
                            currentPage: queryOptions.pageNo,
                            itemsPerPage: queryOptions.itemsPerPage,
                            nextPage: null,
                            prevPage: null,
                            totalPages: 1,
                            totalRecords: 10
                        });
                    });
            });

            test("successfully returns a 'nextPage' of null if the current page is the last page", () => {
                const queryOptions = { ...options };

                queryOptions.itemsPerPage = 3;
                queryOptions.pageNo = 4;

                return baseService
                    .getList(tableName, pk, selectableColumns, queryOptions)
                    .then((recordSet) => {
                        expect(recordSet).toHaveProperty("pagination");
                        expect(recordSet.pagination).toMatchObject({ nextPage: null });
                    });
            });

            test("successfully returns a 'prevPage' of null if the current page is the first page", () => {
                const queryOptions = { ...options };

                return baseService
                    .getList(tableName, pk, selectableColumns, queryOptions)
                    .then((recordSet) => {
                        expect(recordSet).toHaveProperty("pagination");
                        expect(recordSet.pagination).toMatchObject({ prevPage: null });
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
            ]).then(([{ data }, count]) => {
                expect(data.length).toEqual(count);
            });
        });
    }); // close describe("getCount")
}); // close describe("Base Service")
