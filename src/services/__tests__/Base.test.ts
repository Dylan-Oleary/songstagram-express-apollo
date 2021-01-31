import path from "path";

import { dbConnection } from "~knex/db";
import { BaseService, FilterCondition, OrderDirection } from "~services/Base";
import { UserService } from "~services/User";

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
        //@ts-ignore - Accessing private variables for testing
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
            //@ts-ignore - Accessing protected method for testing
            return baseService.getList(tableName, pk, tableColumns, options).then((recordSet) => {
                recordSet.forEach((record) => {
                    expect.objectContaining({
                        [pk]: record[pk]
                    });
                });
            });
        });

        test("successfully returns the correct amount of items", () => {
            const itemsPerPage = 5;

            return (
                baseService
                    //@ts-ignore - Accessing protected method for testing
                    .getList(tableName, pk, tableColumns, { ...options, itemsPerPage })
                    .then((recordSet) => {
                        expect(recordSet.length).toEqual(itemsPerPage);
                    })
            );
        });

        test("successfully returns the correct index when passing in a page number", () => {
            const pageNo = Math.floor(Math.random() * 10) + 1;
            const itemsPerPage = 1;

            return (
                baseService
                    //@ts-ignore - Accessing protected method for testing
                    .getList(tableName, pk, tableColumns, { ...options, itemsPerPage, pageNo })
                    .then((recordSet) => {
                        expect(recordSet.length).toEqual(1);
                        expect.arrayContaining([expect.objectContaining({ [pk]: pageNo })]);
                    })
            );
        });

        test("successfully return the list in ascending order", () => {
            return (
                baseService
                    //@ts-ignore - Accessing protected method for testing
                    .getList(tableName, pk, tableColumns, {
                        ...options,
                        orderBy: { ...options.orderBy, direction: OrderDirection.ASC }
                    })
                    .then((recordSet) => {
                        let expectedKey = 1;

                        recordSet.forEach((record, index) => {
                            if (index > 0 && index < recordSet.length - 1) {
                                expect(record[pk]).toEqual(expectedKey);
                                expect(record[pk]).toBeLessThan(recordSet[index + 1][pk]);
                            } else {
                                expect(record[pk]).toEqual(expectedKey);
                            }

                            expectedKey++;
                        });
                    })
            );
        });

        test("successfully returns the list in descending order", () => {
            return (
                baseService
                    //@ts-ignore - Accessing protected method for testing
                    .getList(tableName, pk, tableColumns, {
                        ...options,
                        orderBy: { ...options.orderBy, direction: OrderDirection.DESC }
                    })
                    .then((recordSet) => {
                        let expectedKey = recordSet.length;

                        recordSet.forEach((record, index) => {
                            if (index > 0 && index < recordSet.length - 1) {
                                expect(record[pk]).toEqual(expectedKey);
                                expect(record[pk]).toBeGreaterThan(recordSet[index + 1][pk]);
                            } else {
                                expect(record[pk]).toEqual(expectedKey);
                            }

                            expectedKey--;
                        });
                    })
            );
        });

        describe("Where", () => {
            describe("Validate Where Clauses", () => {
                test("throws a bad request error (400) if passed a column that is not filterable", () => {
                    const invalidFilterableColumn = "adamSandler";

                    return (
                        baseService
                            //@ts-ignore - Accessing protected method for testing
                            .getList(tableName, pk, tableColumns, {
                                ...options,
                                where: {
                                    //@ts-ignore - Testing invalid columns
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
                            })
                    );
                });

                test("throws a bad request error (400) when filtering a column with an invalid condition", () => {
                    const invalidFilterCondition = "newest";
                    const validColumn = tableColumns.find((column) => column.filterOptions);

                    return (
                        baseService
                            //@ts-ignore - Accessing protected method for testing
                            .getList(tableName, pk, tableColumns, {
                                ...options,
                                //@ts-ignore - Testing invalid conditions
                                where: {
                                    [validColumn!.key]: {
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
                                        `You cannot filter column ${
                                            validColumn!.key
                                        } on condition: ${invalidFilterCondition}`
                                    ])
                                );
                            })
                    );
                });

                [undefined, null].forEach((filterValue) => {
                    test(`throws a bad request error (400) when filtering a column with value: ${filterValue}`, () => {
                        const validColumn = tableColumns.find(
                            (column) =>
                                column.filterOptions &&
                                column.filterOptions.validConditions.length > 0
                        );

                        return (
                            baseService
                                //@ts-ignore - Accessing protected method for testing
                                .getList(tableName, pk, tableColumns, {
                                    ...options,
                                    //@ts-ignore - Testing invalid condition values
                                    where: {
                                        [validColumn!.key]: {
                                            value: filterValue,
                                            //@ts-ignore - Testing invalid condition values
                                            condition: validColumn.filterOptions[0]
                                        }
                                    }
                                })
                                .catch((error) => {
                                    expect(error.statusCode).toEqual(400);
                                    expect(error.message).toEqual("Bad Request");
                                    expect(error.details).toEqual(
                                        expect.arrayContaining([
                                            `You must pass a valid value to filter on column: ${
                                                validColumn!.key
                                            }`
                                        ])
                                    );
                                })
                        );
                    });
                });
            }); // close describe("Validate Where Clauses")

            describe("Build Where Clauses", () => {
                test("successfully returns the correct list of records when passed 'eq' as a condition", () => {
                    const pkValue = Math.floor(Math.random() * 10) + 1;

                    return (
                        baseService
                            //@ts-ignore - Accessing protected method for testing
                            .getList(tableName, pk, tableColumns, {
                                ...options,
                                where: {
                                    [pk]: {
                                        value: pkValue,
                                        condition: FilterCondition.Equal
                                    }
                                }
                            })
                            .then((recordSet) => {
                                expect(recordSet.length).toEqual(1);
                                expect(recordSet[0][pk]).toEqual(pkValue);
                            })
                    );
                });

                test("successfully returns the correct list of records when passed 'gte' as a condition", () => {
                    const pkValue = Math.floor(Math.random() * 5) + 1;

                    return (
                        baseService
                            //@ts-ignore - Accessing protected method for testing
                            .getList(tableName, pk, tableColumns, {
                                ...options,
                                where: {
                                    [pk]: {
                                        value: pkValue,
                                        condition: FilterCondition.GreaterThanOrEqual
                                    }
                                }
                            })
                            .then((recordSet) => {
                                expect(recordSet.length).toBeGreaterThan(0);
                                recordSet.forEach((record) => {
                                    expect(record[pk]).toBeGreaterThanOrEqual(pkValue);
                                });
                            })
                    );
                });

                test("successfully returns the correct list of records when passed 'gt' as a condition", () => {
                    const pkValue = Math.floor(Math.random() * 5) + 1;

                    return (
                        baseService
                            //@ts-ignore - Accessing protected method for testing
                            .getList(tableName, pk, tableColumns, {
                                ...options,
                                where: {
                                    [pk]: {
                                        value: pkValue,
                                        condition: FilterCondition.GreaterThan
                                    }
                                }
                            })
                            .then((recordSet) => {
                                expect(recordSet.length).toBeGreaterThan(0);
                                recordSet.forEach((record) => {
                                    expect(record[pk]).toBeGreaterThan(pkValue);
                                });
                            })
                    );
                });

                test("successfully returns the correct list of records when passed 'lte' as a condition", () => {
                    const pkValue = Math.floor(Math.random() * 10) + 1;

                    return (
                        baseService
                            //@ts-ignore - Accessing protected method for testing
                            .getList(tableName, pk, tableColumns, {
                                ...options,
                                where: {
                                    [pk]: {
                                        value: pkValue,
                                        condition: FilterCondition.LessThanOrEqual
                                    }
                                }
                            })
                            .then((recordSet) => {
                                expect(recordSet.length).toBeGreaterThan(0);
                                recordSet.forEach((record) => {
                                    expect(record[pk]).toBeLessThanOrEqual(pkValue);
                                });
                            })
                    );
                });

                test("successfully returns the correct list of records when passed 'lt' as a condition", () => {
                    const pkValue = Math.floor(Math.random() * 10) + 2;

                    return (
                        baseService
                            //@ts-ignore - Accessing protected method for testing
                            .getList(tableName, pk, tableColumns, {
                                ...options,
                                where: {
                                    [pk]: {
                                        value: pkValue,
                                        condition: FilterCondition.LessThan
                                    }
                                }
                            })
                            .then((recordSet) => {
                                expect(recordSet.length).toBeGreaterThan(0);
                                recordSet.forEach((record) => {
                                    expect(record[pk]).toBeLessThan(pkValue);
                                });
                            })
                    );
                });

                test("successfully returns the correct list of records when no condition is passed", () => {
                    const pkValue = Math.floor(Math.random() * 10) + 1;

                    return (
                        baseService
                            //@ts-ignore - Accessing protected method for testing
                            .getList(tableName, pk, tableColumns, {
                                ...options,
                                where: {
                                    [pk]: {
                                        value: pkValue
                                    }
                                }
                            })
                            .then((recordSet) => {
                                expect(recordSet.length).toEqual(1);
                                expect(recordSet[0][pk]).toEqual(pkValue);
                            })
                    );
                });
            }); // close describe("Build Where Clauses")
        }); // close describe("Where")

        describe("Order By", () => {
            test("throws a bad request error (400) if the passed column is not sortable", () => {
                const nonSortableColumn = tableColumns.filter((column) => !column.isSortable)[0];

                return (
                    baseService
                        //@ts-ignore - Accessing protected method for testing
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
                        })
                );
            });

            test("throws a bad request error (400) if the passed direction is invalid", () => {
                const invalidSortDirection = "up";

                return (
                    baseService
                        //@ts-ignore - Accessing protected method for testing
                        .getList(tableName, pk, tableColumns, {
                            ...options,
                            orderBy: {
                                ...options.orderBy,
                                //@ts-ignore - Testing invalid sort directions
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
                        })
                );
            });
        }); // close describe("Order By")
    }); // close describe("getList")

    describe("buildPagination", () => {
        test("successfully returns a pagination object", () => {
            const count = 50;
            const itemsPerPage = Math.floor(Math.random() * 10) + 1;
            const pageNo = Math.floor(Math.random() * (count / itemsPerPage)) + 1;
            //@ts-ignore - Accessing protected method for testing
            const pagination = baseService.buildPagination(count, pageNo, itemsPerPage);

            expect(pagination).toEqual({
                currentPage: pageNo,
                itemsPerPage: itemsPerPage,
                nextPage: pageNo === Math.ceil(count / itemsPerPage) ? null : pageNo + 1,
                prevPage: pageNo === 1 ? null : pageNo - 1,
                totalPages: Math.ceil(count / itemsPerPage),
                totalRecords: count
            });
        });

        test("successfully returns the correct pagination object if no records are found", () => {
            const count = 0;
            const itemsPerPage = Math.floor(Math.random() * 10) + 1;
            const pageNo = Math.floor(Math.random() * (count / itemsPerPage)) + 1;
            //@ts-ignore - Accessing protected method for testing
            const pagination = baseService.buildPagination(count, pageNo, itemsPerPage);

            expect(pagination).toEqual({
                currentPage: pageNo,
                itemsPerPage: itemsPerPage,
                nextPage: null,
                prevPage: null,
                totalPages: 0,
                totalRecords: count
            });
        });

        test("successfully returns the correct pagination object if the requested page has no records", () => {
            const count = 10;
            const itemsPerPage = 100000;
            const pageNo = 1000;
            //@ts-ignore - Accessing protected method for testing
            const pagination = baseService.buildPagination(count, pageNo, itemsPerPage);

            expect(pagination).toEqual({
                currentPage: pageNo,
                itemsPerPage: itemsPerPage,
                nextPage: null,
                prevPage: null,
                totalPages: 1,
                totalRecords: count
            });
        });

        test("successfully returns a 'nextPage' of null if the current page is the last page", () => {
            const count = 100;
            const itemsPerPage = 10;
            const pageNo = 10;
            //@ts-ignore - Accessing protected method for testing
            const pagination = baseService.buildPagination(count, pageNo, itemsPerPage);

            expect(pagination).toEqual({
                currentPage: pageNo,
                itemsPerPage: itemsPerPage,
                nextPage: null,
                prevPage: 9,
                totalPages: 10,
                totalRecords: count
            });
        });

        test("successfully returns a 'prevPage' of null if the current page is the first page", () => {
            const count = 10;
            const itemsPerPage = 1;
            const pageNo = 1;
            //@ts-ignore - Accessing protected method for testing
            const pagination = baseService.buildPagination(count, pageNo, itemsPerPage);

            expect(pagination).toEqual({
                currentPage: pageNo,
                itemsPerPage: itemsPerPage,
                nextPage: pageNo + 1,
                prevPage: null,
                totalPages: 10,
                totalRecords: count
            });
        });
    }); // close describe("buildPagination")

    describe("getCount", () => {
        const tableName = "users";
        const pk = "userNo";
        //@ts-ignore - Accessing private variables for testing
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
                //@ts-ignore - Accessing protected method for testing
                baseService.getList(tableName, pk, tableColumns, options),
                //@ts-ignore - Accessing protected method for testing
                baseService.getCount(tableName, pk, tableColumns, options.where)
            ]).then(([recordSet, count]) => {
                expect(recordSet.length).toEqual(count);
            });
        });

        test("throws an error when the count could not be retrieved", () => {
            return (
                baseService
                    //@ts-ignore - Accessing protected method for testing
                    .getCount(tableName, "pantomime", tableColumns, options.where)
                    .catch((error) => {
                        expect(error.statusCode).toEqual(500);
                        expect(error).toHaveProperty("message");
                        expect(error).toHaveProperty("details");
                    })
            );
        });
    }); // close describe("getCount")

    describe("validateRecordNo", () => {
        test("successfully resolves if recordNo is valid", () => {
            //@ts-ignore - Accessing protected method for testing
            return baseService.validateRecordNo(1, "userNo").then((response) => {
                expect(response).toBe(undefined);
            });
        });

        test("throws a bad request error (400) if recordNo is undefined", () => {
            //@ts-ignore - Accessing protected method for testing
            return baseService.validateRecordNo(undefined, "userNo").catch((error) => {
                expect(error.statusCode).toEqual(400);
                expect(error.message).toEqual("Bad Request");
                expect(error.details).toEqual(
                    expect.arrayContaining(["Parameter Error: userNo must be a number"])
                );
            });
        });

        test("throws a bad request error (400) if recordNo is null", () => {
            //@ts-ignore - Accessing protected method for testing
            return baseService.validateRecordNo(null, "userNo").catch((error) => {
                expect(error.statusCode).toEqual(400);
                expect(error.message).toEqual("Bad Request");
                expect(error.details).toEqual(
                    expect.arrayContaining(["Parameter Error: userNo must be a number"])
                );
            });
        });

        test("throws a bad request error (400) if recordNo is a string", () => {
            //@ts-ignore - Accessing protected method for testing
            return baseService.validateRecordNo("thebiglebowski", "userNo").catch((error) => {
                expect(error.statusCode).toEqual(400);
                expect(error.message).toEqual("Bad Request");
                expect(error.details).toEqual(
                    expect.arrayContaining(["Parameter Error: userNo must be a number"])
                );
            });
        });
    }); // close describe("validateRecordNo")

    describe("cleanRecord", () => {
        const record = {
            isDeleted: 1,
            username: "userW00T"
        };

        //@ts-ignore - Testing protected method
        const cleanedRecord = baseService.cleanRecord(record);

        expect(cleanedRecord).toEqual({
            ...record,
            isDeleted: true
        });
    }); // close describe("cleanRecord")
}); // close describe("Base Service")
