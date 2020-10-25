//@ts-nocheck
import path from "path";

import { dbConnection } from "../../knex/db";
import { BaseService, FilterCondition, OrderDirection } from "../Base";
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
        const tableColumns = userService.tableColumns;
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
            return baseService.getList(tableName, pk, tableColumns, options).then(({ data }) => {
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
                .getList(tableName, pk, tableColumns, { ...options, itemsPerPage })
                .then(({ data }) => {
                    expect(data.length).toEqual(itemsPerPage);
                });
        });

        test("successfully returns the correct index when passing in a page number", () => {
            const pageNo = Math.floor(Math.random() * 10) + 1;
            const itemsPerPage = 1;

            return baseService
                .getList(tableName, pk, tableColumns, { ...options, itemsPerPage, pageNo })
                .then(({ data }) => {
                    expect(data.length).toEqual(1);
                    expect.arrayContaining([expect.objectContaining({ [pk]: pageNo })]);
                });
        });

        test("successfully return the list in ascending order", () => {
            return baseService
                .getList(tableName, pk, tableColumns, {
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
                .getList(tableName, pk, tableColumns, {
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

        describe("Where", () => {
            describe("Validate Where Clauses", () => {
                test("throws a bad request error (400) if passed a column that is not filterable", () => {
                    const invalidFilterableColumn = "adamSandler";

                    return baseService
                        .getList(tableName, pk, tableColumns, {
                            ...options,
                            where: {
                                [invalidFilterableColumn]: 1
                            }
                        })
                        .catch((error) => {
                            expect(error.statusCode).toEqual(400);
                            expect(error.message).toEqual("Bad Request");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `You cannot filter by column: ${invalidFilterableColumn}`
                                ])
                            );
                        });
                });

                test("throws a bad request error (400) when filtering a column with an invalid condition", () => {
                    const invalidFilterCondition = "newest";
                    const validColumn = tableColumns.find((column) => column.filterOptions);

                    return baseService
                        .getList(tableName, pk, tableColumns, {
                            ...options,
                            where: {
                                [validColumn.key]: {
                                    value: 1,
                                    condition: invalidFilterCondition
                                }
                            }
                        })
                        .catch((error) => {
                            expect(error.statusCode).toEqual(400);
                            expect(error.message).toEqual("Bad Request");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `You cannot filter column ${validColumn.key} on condition: ${invalidFilterCondition}`
                                ])
                            );
                        });
                });

                [undefined, null].forEach((filterValue) => {
                    test(`throws a bad request error (400) when filtering a column with value: ${filterValue}`, () => {
                        const validColumn = tableColumns.find(
                            (column) =>
                                column.filterOptions &&
                                column.filterOptions.validConditions.length > 0
                        );

                        return baseService
                            .getList(tableName, pk, tableColumns, {
                                ...options,
                                where: {
                                    [validColumn.key]: {
                                        value: filterValue,
                                        condition: validColumn?.filterOptions[0]
                                    }
                                }
                            })
                            .catch((error) => {
                                expect(error.statusCode).toEqual(400);
                                expect(error.message).toEqual("Bad Request");
                                expect(error.details).toEqual(
                                    expect.arrayContaining([
                                        `You must pass a valid value to filter on column: ${validColumn.key}`
                                    ])
                                );
                            });
                    });
                });
            }); // close describe("Validate Where Clauses")

            describe("Build Where Clauses", () => {
                test("successfully returns the correct list of records when passed 'eq' as a condition", () => {
                    const pkValue = Math.floor(Math.random() * 10) + 1;

                    return baseService
                        .getList(tableName, pk, tableColumns, {
                            ...options,
                            where: {
                                [pk]: {
                                    value: pkValue,
                                    condition: FilterCondition.Equal
                                }
                            }
                        })
                        .then(({ data }) => {
                            expect(data.length).toEqual(1);
                            expect(data[0][pk]).toEqual(pkValue);
                        });
                });

                test("successfully returns the correct list of records when passed 'gte' as a condition", () => {
                    const pkValue = Math.floor(Math.random() * 5) + 1;

                    return baseService
                        .getList(tableName, pk, tableColumns, {
                            ...options,
                            where: {
                                [pk]: {
                                    value: pkValue,
                                    condition: FilterCondition.GreaterThanOrEqual
                                }
                            }
                        })
                        .then(({ data }) => {
                            expect(data.length).toBeGreaterThan(0);
                            data.forEach((record) => {
                                expect(record[pk]).toBeGreaterThanOrEqual(pkValue);
                            });
                        });
                });

                test("successfully returns the correct list of records when passed 'gt' as a condition", () => {
                    const pkValue = Math.floor(Math.random() * 5) + 1;

                    return baseService
                        .getList(tableName, pk, tableColumns, {
                            ...options,
                            where: {
                                [pk]: {
                                    value: pkValue,
                                    condition: FilterCondition.GreaterThan
                                }
                            }
                        })
                        .then(({ data }) => {
                            expect(data.length).toBeGreaterThan(0);
                            data.forEach((record) => {
                                expect(record[pk]).toBeGreaterThan(pkValue);
                            });
                        });
                });

                test("successfully returns the correct list of records when passed 'lte' as a condition", () => {
                    const pkValue = Math.floor(Math.random() * 10) + 1;

                    return baseService
                        .getList(tableName, pk, tableColumns, {
                            ...options,
                            where: {
                                [pk]: {
                                    value: pkValue,
                                    condition: FilterCondition.LessThanOrEqual
                                }
                            }
                        })
                        .then(({ data }) => {
                            expect(data.length).toBeGreaterThan(0);
                            data.forEach((record) => {
                                expect(record[pk]).toBeLessThanOrEqual(pkValue);
                            });
                        });
                });

                test("successfully returns the correct list of records when passed 'lt' as a condition", () => {
                    const pkValue = Math.floor(Math.random() * 10) + 2;

                    return baseService
                        .getList(tableName, pk, tableColumns, {
                            ...options,
                            where: {
                                [pk]: {
                                    value: pkValue,
                                    condition: FilterCondition.LessThan
                                }
                            }
                        })
                        .then(({ data }) => {
                            expect(data.length).toBeGreaterThan(0);
                            data.forEach((record) => {
                                expect(record[pk]).toBeLessThan(pkValue);
                            });
                        });
                });
            }); // close describe("Build Where Clauses")
        }); // close describe("Where")

        describe("Order By", () => {
            test("throws a bad request error (400) if the passed column is not sortable", () => {
                const nonSortableColumn = tableColumns.filter((column) => !column.isSortable)[0];

                return baseService
                    .getList(tableName, pk, tableColumns, {
                        ...options,
                        orderBy: {
                            ...options.orderBy,
                            column: nonSortableColumn.key
                        }
                    })
                    .catch((error) => {
                        expect(error.statusCode).toEqual(400);
                        expect(error.message).toEqual("Bad Request");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `You cannot sort by column: ${nonSortableColumn.key}`
                            ])
                        );
                    });
            });

            test("throws a bad request error (400) if the passed direction is invalid", () => {
                const invalidSortDirection = "up";

                return baseService
                    .getList(tableName, pk, tableColumns, {
                        ...options,
                        orderBy: {
                            ...options.orderBy,
                            direction: invalidSortDirection
                        }
                    })
                    .catch((error) => {
                        expect(error.statusCode).toEqual(400);
                        expect(error.message).toEqual("Bad Request");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `You cannot sort by direction: ${invalidSortDirection}`
                            ])
                        );
                    });
            });
        }); // close describe("Order By")

        describe("Pagination", () => {
            test("successfully returns a pagination object", () => {
                const queryOptions = { ...options };

                queryOptions.itemsPerPage = 3;
                queryOptions.pageNo = 2;

                return Promise.all([
                    baseService.getList(tableName, pk, tableColumns, queryOptions),
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

                queryOptions.where = {
                    [pk]: {
                        value: 99999
                    }
                };

                return baseService
                    .getList(tableName, pk, tableColumns, queryOptions)
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
                    .getList(tableName, pk, tableColumns, queryOptions)
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
                    .getList(tableName, pk, tableColumns, queryOptions)
                    .then((recordSet) => {
                        expect(recordSet).toHaveProperty("pagination");
                        expect(recordSet.pagination).toMatchObject({ nextPage: null });
                    });
            });

            test("successfully returns a 'prevPage' of null if the current page is the first page", () => {
                const queryOptions = { ...options };

                return baseService
                    .getList(tableName, pk, tableColumns, queryOptions)
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
        const tableColumns = userService.tableColumns;
        const randomFilter = Object.values(FilterCondition)[
            Math.floor(Math.random() * Object.values(FilterCondition).length)
        ];
        const options = {
            where: {
                [pk]: {
                    value: Math.floor(Math.random() * 10) + 1,
                    condition: randomFilter
                }
            },
            itemsPerPage: 10,
            pageNo: 1,
            orderBy: {
                column: pk,
                direction: OrderDirection.DESC
            }
        };

        test("successfully returns the correct count", () => {
            return Promise.all([
                baseService.getList(tableName, pk, tableColumns, options),
                baseService.getCount(tableName, pk, options.where)
            ]).then(([{ data }, count]) => {
                expect(data.length).toEqual(count);
            });
        });
    }); // close describe("getCount")
}); // close describe("Base Service")
