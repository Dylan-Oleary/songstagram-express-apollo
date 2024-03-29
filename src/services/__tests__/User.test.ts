import bcrypt from "bcrypt";
import faker from "faker";
import path from "path";

import { dbConnection } from "~knex/db";
import {
    ICreateUserValues,
    IUpdateUserValues,
    IUserColumnKeys,
    IUserColumnLabels,
    IUserRecord,
    UserService
} from "~services/User";

describe("User Service", () => {
    const pk = "userNo";
    const tableName = "users";
    const userRecordKeys = [
        "userNo",
        "firstName",
        "lastName",
        "bio",
        "username",
        "email",
        "profilePicture",
        "isDeleted",
        "isBanned",
        "lastLoginDate",
        "createdDate",
        "lastUpdated"
    ];
    const userService = new UserService(dbConnection);

    /**
     * Builds a valid user submission
     *
     * @param username A valid username
     * @param deletePasswords Determines whether or not to omit `password` & `confirmPassword` from the submission. This becomes useful when building submissions for both creating a user and updating a user
     */
    const buildValidSubmission: (
        username: string,
        deletePasswords?: boolean
    ) => ICreateUserValues | IUpdateUserValues = (username, deletePasswords = false) => {
        const submission: ICreateUserValues = {
            [IUserColumnKeys.FirstName]: faker.name.firstName(),
            [IUserColumnKeys.LastName]: faker.name.lastName(),
            [IUserColumnKeys.Username]: username,
            [IUserColumnKeys.Email]: faker.internet.email(),
            [IUserColumnKeys.Password]: "M0N3y!",
            [IUserColumnKeys.ConfirmPassword]: "M0N3y!"
        };

        if (deletePasswords) {
            //@ts-ignore - Delete passwords to build valid submission
            delete submission[IUserColumnKeys.Password];
            //@ts-ignore - Delete passwords to build valid submission
            delete submission[IUserColumnKeys.ConfirmPassword];
        }

        return submission;
    };

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

    describe("Column Validation", () => {
        describe("Create", () => {
            let submission = buildValidSubmission("saved_by-the-bell");

            [
                { key: IUserColumnKeys.FirstName, label: IUserColumnLabels.FirstName },
                { key: IUserColumnKeys.LastName, label: IUserColumnLabels.LastName }
            ].forEach(({ key, label }) => {
                describe(`${label}`, () => {
                    test("throws a validation error (422) if its value is undefined", () => {
                        const invalidSubmission = { ...submission, [key]: undefined };

                        //@ts-ignore - Testing for incorrect types
                        return userService.createUser(invalidSubmission).catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([`${label} is a required field`])
                            );
                        });
                    });

                    test("throws a validation error (422) if its value is null", () => {
                        const invalidSubmission = { ...submission, [key]: null };

                        //@ts-ignore - Testing for incorrect types
                        return userService.createUser(invalidSubmission).catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([`${label} is a required field`])
                            );
                        });
                    });

                    test("throws a validation error (422) if its value is empty", () => {
                        const invalidSubmission = { ...submission, [key]: "" };

                        //@ts-ignore - Testing for incorrect types
                        return userService.createUser(invalidSubmission).catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([`${label} is a required field`])
                            );
                        });
                    });

                    test("throws a validation error (422) if its value is too long", () => {
                        const invalidSubmission = {
                            ...submission,
                            [key]: new Array(257).join("x")
                        };

                        //@ts-ignore - Testing for incorrect types
                        return userService.createUser(invalidSubmission).catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${label} cannot be more than 255 characters`
                                ])
                            );
                        });
                    });
                }); // close describe("First Name / Last Name")
            }); // close forEach

            describe("Username", () => {
                test("throws a validation error (422) if its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserColumnKeys.Username]: undefined
                    };

                    //@ts-ignore - Testing for incorrect types
                    return userService.createUser(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserColumnLabels.Username} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserColumnKeys.Username]: null
                    };

                    //@ts-ignore - Testing for incorrect types
                    return userService.createUser(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserColumnLabels.Username} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserColumnKeys.Username]: ""
                    };

                    //@ts-ignore - Testing for incorrect types
                    return userService.createUser(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserColumnLabels.Username} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is too long", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserColumnKeys.Username]: new Array(32).join("x")
                    };

                    //@ts-ignore - Testing for incorrect types
                    return userService.createUser(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserColumnLabels.Username} cannot be more than 30 characters`
                            ])
                        );
                    });
                });

                [
                    "-breakfastwithroxy",
                    "jack@thedals",
                    "<script>Inject_me!</script>",
                    "follow.me",
                    "protest'the'hero",
                    "I_LOVE+44"
                ].forEach((username) => {
                    test(`throws a validation error (422) if the username is invalid. Username: ${username}`, () => {
                        let invalidSubmission = {
                            ...submission,
                            [IUserColumnKeys.Username]: username
                        };

                        //@ts-ignore - Testing for incorrect types
                        return userService.createUser(invalidSubmission).catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([`${IUserColumnLabels.Username} is invalid`])
                            );
                        });
                    });
                }); // close forEach
            }); // close describe("Username")

            describe("Email Address", () => {
                test("throws a validation error (422) if its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserColumnKeys.Email]: undefined
                    };

                    //@ts-ignore - Testing for incorrect types
                    return userService.createUser(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserColumnLabels.Email} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserColumnKeys.Email]: null
                    };

                    //@ts-ignore - Testing for incorrect types
                    return userService.createUser(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserColumnLabels.Email} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserColumnKeys.Email]: ""
                    };

                    //@ts-ignore - Testing for incorrect types
                    return userService.createUser(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserColumnLabels.Email} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is too long", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserColumnKeys.Email]: new Array(257).join("x")
                    };

                    //@ts-ignore - Testing for incorrect types
                    return userService.createUser(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserColumnLabels.Email} cannot be more than 255 characters`
                            ])
                        );
                    });
                });

                [
                    "plainaddress",
                    "#@%^%#$@#$@#.com",
                    "@example.com",
                    "Joe Smith <email@example.com>",
                    "email.example.com",
                    "email@example@example.com",
                    ".email@example.com",
                    "email.@example.com",
                    "email..email@example.com",
                    "email@example.com (Joe Smith)",
                    "email@example",
                    "email@111.222.333.44444",
                    "email@example..com"
                ].forEach((invalidEmail) => {
                    test(`throws a validation error (422) if the email is invalid. Email: ${invalidEmail}`, () => {
                        const invalidSubmission = {
                            ...submission,
                            [IUserColumnKeys.Email]: invalidEmail
                        };

                        //@ts-ignore - Testing for incorrect types
                        return userService.createUser(invalidSubmission).catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([`${IUserColumnLabels.Email} is invalid`])
                            );
                        });
                    });
                });
            }); // close describe("Email Address")

            describe("Password", () => {
                test("throws a validation error (422) when its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserColumnKeys.Password]: undefined
                    };

                    //@ts-ignore - Testing for incorrect types
                    return userService.createUser(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserColumnLabels.Password} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) when its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserColumnKeys.Password]: null
                    };

                    //@ts-ignore - Testing for incorrect types
                    return userService.createUser(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserColumnLabels.Password} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) when its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserColumnKeys.Password]: ""
                    };

                    //@ts-ignore - Testing for incorrect types
                    return userService.createUser(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserColumnLabels.Password} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) when its value is too long", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserColumnKeys.Password]: new Array(52).join("x")
                    };

                    //@ts-ignore - Testing for incorrect types
                    return userService.createUser(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserColumnLabels.Password} cannot be more than 50 characters`
                            ])
                        );
                    });
                });
            }); // close describe("Password")

            describe("Confirm Password", () => {
                test("throws a validation error (422) when its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserColumnKeys.ConfirmPassword]: undefined
                    };

                    //@ts-ignore - Testing for incorrect types
                    return userService.createUser(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserColumnLabels.ConfirmPassword} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) when its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserColumnKeys.ConfirmPassword]: null
                    };

                    //@ts-ignore - Testing for incorrect types
                    return userService.createUser(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserColumnLabels.ConfirmPassword} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) when its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserColumnKeys.ConfirmPassword]: ""
                    };

                    //@ts-ignore - Testing for incorrect types
                    return userService.createUser(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserColumnLabels.ConfirmPassword} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) when its value does match the 'Password' value", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserColumnKeys.Password]: "supersecretpassword",
                        [IUserColumnKeys.ConfirmPassword]: "password"
                    };

                    //@ts-ignore - Testing for incorrect types
                    return userService.createUser(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining(["Passwords must match"])
                        );
                    });
                });
            }); // close describe("Confirm Password")
        }); // close describe("Create")

        describe("Edit", () => {
            let submission = buildValidSubmission("superbad");

            [
                { key: IUserColumnKeys.FirstName, label: IUserColumnLabels.FirstName },
                { key: IUserColumnKeys.LastName, label: IUserColumnLabels.LastName }
            ].forEach(({ key, label }) => {
                describe(`${label}`, () => {
                    test("throws a validation error (422) if its value is too long", () => {
                        const invalidSubmission = {
                            ...submission,
                            [key]: new Array(257).join("x")
                        };

                        return userService.updateUser(1, invalidSubmission).catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${label} cannot be more than 255 characters`
                                ])
                            );
                        });
                    });
                }); // close describe("First Name / Last Name")
            }); // close forEach

            describe("Username", () => {
                test("throws a validation error (422) if its value is too long", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserColumnKeys.Username]: new Array(32).join("x")
                    };

                    return userService.updateUser(1, invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserColumnLabels.Username} cannot be more than 30 characters`
                            ])
                        );
                    });
                });

                [
                    "-breakfastwithroxy",
                    "jack@thedals",
                    "<script>Inject_me!</script>",
                    "follow.me",
                    "protest'the'hero",
                    "I_LOVE+44"
                ].forEach((username) => {
                    test(`throws a validation error (422) if the username is invalid. Username: ${username}`, () => {
                        let invalidSubmission = {
                            ...submission,
                            [IUserColumnKeys.Username]: username
                        };

                        return userService.updateUser(1, invalidSubmission).catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([`${IUserColumnLabels.Username} is invalid`])
                            );
                        });
                    });
                }); // close forEach
            }); // close describe("Username")

            describe("Email Address", () => {
                test("throws a validation error (422) if its value is too long", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserColumnKeys.Email]: new Array(257).join("x")
                    };

                    return userService.updateUser(1, invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserColumnLabels.Email} cannot be more than 255 characters`
                            ])
                        );
                    });
                });

                [
                    "plainaddress",
                    "#@%^%#$@#$@#.com",
                    "@example.com",
                    "Joe Smith <email@example.com>",
                    "email.example.com",
                    "email@example@example.com",
                    ".email@example.com",
                    "email.@example.com",
                    "email..email@example.com",
                    "email@example.com (Joe Smith)",
                    "email@example",
                    "email@111.222.333.44444",
                    "email@example..com"
                ].forEach((invalidEmail) => {
                    test(`throws a validation error (422) if the email is invalid. Email: ${invalidEmail}`, () => {
                        const invalidSubmission = {
                            ...submission,
                            [IUserColumnKeys.Email]: invalidEmail
                        };

                        return userService.updateUser(1, invalidSubmission).catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([`${IUserColumnLabels.Email} is invalid`])
                            );
                        });
                    });
                });
            }); // close describe("Email Address")

            describe("Bio", () => {
                test("throws a validation error (422) if its value is too long", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserColumnKeys.Bio]: new Array(155).join("z")
                    };

                    return userService.updateUser(1, invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserColumnLabels.Bio} cannot be more than 150 characters`
                            ])
                        );
                    });
                });
            }); // close describe("Bio")

            describe("Profile Picture", () => {
                test("throws a validation error (422) if its value is to long", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserColumnKeys.ProfilePicture]: new Array(260).join("z")
                    };

                    return userService.updateUser(1, invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserColumnLabels.ProfilePicture} cannot be more than 255 characters`
                            ])
                        );
                    });
                });
            }); // close describe("Profile Picture")
        }); // close describe("Edit")
    }); // close describe("Column Validation")

    describe("getUserList", () => {
        test("returns a list of users", () => {
            return userService.getUserList().then(({ data }) => {
                expect(data.length).toEqual(10);

                data.forEach((user) => {
                    userRecordKeys.forEach((key) => {
                        expect(user).toHaveProperty(key);
                    });
                });
            });
        });

        test("returns a pagination object", () => {
            return userService.getUserList().then((response) => {
                expect(response).toHaveProperty("pagination");
            });
        });

        test("successfully return the correct amount of items when itemsPerPage is passed", () => {
            return userService.getUserList({ itemsPerPage: 3 }).then(({ data, pagination }) => {
                expect(data.length).toEqual(3);

                data.forEach((user) => {
                    userRecordKeys.forEach((key) => {
                        expect(user).toHaveProperty(key);
                    });
                });
                expect(pagination).toHaveProperty("itemsPerPage", 3);
            });
        });

        test("successfuly returns only selectable columns", () => {
            //@ts-ignore - Accessing private variables for testing
            const selectableColumns = userService.tableColumns
                .filter((column) => column.isSelectable)
                .map((column) => column.key);

            //@ts-ignore - Accessing private variables for testing
            const nonselectableColumns = userService.tableColumns
                .filter((column) => !column.isSelectable)
                .map((column) => column.key);

            return userService.getUserList().then(({ data }) => {
                data.forEach((user) => {
                    selectableColumns.forEach((column) => {
                        expect(user).toHaveProperty(column);
                    });
                    nonselectableColumns.forEach((column) => {
                        expect(user).not.toHaveProperty(column);
                    });
                });
            });
        });
    }); // close describe("getUserList")

    describe("getUser", () => {
        let user: IUserRecord;
        let submission = buildValidSubmission("dazedandconfused") as ICreateUserValues;

        beforeAll(async (done) => {
            user = await userService.createUser(submission);
            done();
        });

        test("returns a user record", () => {
            return userService.getUser(user.userNo).then((userRecord) => {
                userRecordKeys.forEach((key) => {
                    expect(userRecord).toHaveProperty(key);
                });
                expect(userRecord).toEqual(user);
            });
        });

        test("does not return a user's password", () => {
            return userService.getUser(user.userNo).then((userRecord) => {
                expect(userRecord).not.toHaveProperty("password");
            });
        });

        test("throws a not found error (404) if no user is found", () => {
            const invalidUserNo = 867;

            return userService.getUser(invalidUserNo).catch((error) => {
                expect(error.statusCode).toEqual(404);
                expect(error.message).toEqual("Not Found");
                expect(error.details).toEqual(
                    expect.arrayContaining([
                        `User with a ${pk} of ${invalidUserNo} could not be found`
                    ])
                );
            });
        });
    }); // close describe("getUser")

    describe("searchUser", () => {
        let user: IUserRecord;

        //@ts-ignore - Accessing private variables for testing
        const validColumns = userService.tableColumns
            .filter((column) => column.isSearchable)
            .map((column) => column.key);

        //@ts-ignore - Accessing private variables for testing
        const invalidColumns = userService.tableColumns
            .filter((column) => !column.isSearchable)
            .map((column) => column.key);

        beforeAll(async (done) => {
            user = await userService.getUser(Math.ceil(Math.random() * (10 - 1) + 1));
            done();
        });

        test("returns a list of users when passed no search columns", () => {
            return userService
                .searchUser(user.username.slice(0, user.username.length - 1))
                .then((users) => {
                    expect(users).toContainEqual(
                        expect.objectContaining({
                            username: user.username,
                            isDeleted: false,
                            isBanned: false
                        })
                    );
                    expect(users.length).toBeGreaterThan(0);
                });
        });

        test("returns a list of users when passed a valid search column", () => {
            const validColumn = validColumns[Math.floor(Math.random() * validColumns.length)];

            return (
                userService
                    //@ts-ignore - Enum columns used to index records
                    .searchUser(user[validColumn].slice(0, user[validColumn].length - 1), [
                        validColumn
                    ])
                    .then((users) => {
                        expect(users).toContainEqual(
                            expect.objectContaining({
                                //@ts-ignore - Enum columns used to index records
                                [validColumn]: user[validColumn],
                                isDeleted: false,
                                isBanned: false
                            })
                        );
                        expect(users.length).toBeGreaterThan(0);
                    })
            );
        });

        test("returns a list of users when passed multiple valid search columns", () => {
            return userService
                .searchUser(
                    user[IUserColumnKeys.Username].slice(
                        0,
                        user[IUserColumnKeys.Username].length - 1
                    ),
                    validColumns
                )
                .then((users) => {
                    expect(users).toContainEqual(
                        expect.objectContaining({
                            [IUserColumnKeys.Username]: user[IUserColumnKeys.Username],
                            isDeleted: false,
                            isBanned: false
                        })
                    );
                    expect(users.length).toBeGreaterThan(0);
                });
        });

        validColumns.forEach((column) => {
            test(`returns a list of users when searching by: ${column}`, () => {
                return (
                    userService
                        //@ts-ignore - Enum columns used to index records
                        .searchUser(user[column].slice(0, user[column].length - 1), [column])
                        .then((users) => {
                            expect(users).toContainEqual(
                                expect.objectContaining({
                                    //@ts-ignore - Enum columns used to index records
                                    [column]: user[column],
                                    isDeleted: false,
                                    isBanned: false
                                })
                            );
                            expect(users.length).toBeGreaterThan(0);
                        })
                );
            });
        });

        test("returns an empty array when no users are found", () => {
            return userService.searchUser(new Array(50).join("z")).then((users) => {
                expect(users).toEqual([]);
                expect(users.length).toEqual(0);
            });
        });

        test("throws a bad request error (400) if passed an invalid search column", () => {
            const column = invalidColumns[Math.floor(Math.random() * invalidColumns.length)];

            return userService.searchUser("error time!", [column]).catch((error) => {
                expect(error.statusCode).toEqual(400);
                expect(error.message).toEqual("Bad Request");
                expect(error.details).toEqual(
                    expect.arrayContaining([`You cannot search on column: ${column}`])
                );
            });
        });

        test("throws a bad request error (400) if passed multiple invalid search columns", () => {
            return userService.searchUser("error time!", invalidColumns).catch((error) => {
                expect(error.statusCode).toEqual(400);
                expect(error.message).toEqual("Bad Request");
                expect(error.details).toEqual(
                    expect.arrayContaining([`You cannot search on column: ${invalidColumns[0]}`])
                );
            });
        });

        [100, "string", true, { key: 120 }].forEach((invalidColumn) => {
            test(`throws a bad request error (400) if search columns are of invalid type. Passed: ${typeof invalidColumn}`, () => {
                //@ts-ignore - Testing search on an invalid column
                return userService.searchUser("error time!", "throwmeaway!").catch((error) => {
                    expect(error.statusCode).toEqual(400);
                    expect(error.message).toEqual("Bad Request");
                    expect(error.details).toEqual(
                        expect.arrayContaining(["Parameter Error: Search columns must be an array"])
                    );
                });
            });
        });
    }); // close describe("searchUser")

    describe("createUser", () => {
        let submission = buildValidSubmission("spaghetti_strings") as ICreateUserValues;

        test("successfully creates a user", () => {
            return userService.createUser(submission).then((userRecord) => {
                userRecordKeys.forEach((key) => {
                    expect(userRecord).toHaveProperty(key);
                });
                [
                    IUserColumnKeys.FirstName,
                    IUserColumnKeys.LastName,
                    IUserColumnKeys.Username,
                    IUserColumnKeys.Email
                ].forEach((key) => {
                    //@ts-ignore - Enum columns used to index records
                    expect(userRecord[key]).toEqual(submission[key]);
                });
            });
        });

        test("throws a conflict error (409) if an email is passed that is already taken", () => {
            return userService.getUser(1).then((userRecord) => {
                const invalidSubmission = {
                    ...submission,
                    [IUserColumnKeys.Email]: userRecord.email
                };

                return userService.createUser(invalidSubmission).catch((error) => {
                    expect(error.statusCode).toEqual(409);
                    expect(error.message).toEqual("Conflict Error");
                    expect(error.details).toEqual(
                        expect.arrayContaining([`${IUserColumnLabels.Email} is already in use`])
                    );
                });
            });
        });

        test("throws a conflict error (409) if a username is passed that is already taken", () => {
            return userService.getUser(1).then((userRecord) => {
                const submission = buildValidSubmission(userRecord.username) as ICreateUserValues;

                return userService.createUser(submission).catch((error) => {
                    expect(error.statusCode).toEqual(409);
                    expect(error.message).toEqual("Conflict Error");
                    expect(error.details).toEqual(
                        expect.arrayContaining([`${IUserColumnLabels.Username} is already in use`])
                    );
                });
            });
        });
    }); //close describe("createUser")

    describe("updateUser", () => {
        let userOne: IUserRecord;
        let userTwo: IUserRecord;

        beforeAll((done) => {
            return Promise.all([userService.getUser(1), userService.getUser(2)]).then(
                ([recordOne, recordTwo]) => {
                    userOne = recordOne;
                    userTwo = recordTwo;

                    done();
                }
            );
        });

        test("successfully updates a user", () => {
            const validSubmission = {
                ...buildValidSubmission(userOne.username, true),
                [IUserColumnKeys.FirstName]: "Eddie",
                [IUserColumnKeys.LastName]: "Van Halen",
                [IUserColumnKeys.Bio]: "I invented tapping",
                [IUserColumnKeys.ProfilePicture]: "www.vanhalen.com/super-shredder"
            };

            return userService.updateUser(userOne.userNo, validSubmission).then((userRecord) => {
                expect(userRecord).toEqual(
                    expect.objectContaining({
                        userNo: userOne.userNo,
                        ...validSubmission
                    })
                );
            });
        });

        test("throws a conflict error (409) if an email is passed that is already taken", () => {
            const invalidSubmission = {
                ...buildValidSubmission(userTwo.username, true),
                [IUserColumnKeys.Email]: userOne.email
            };

            return userService.updateUser(userTwo.userNo, invalidSubmission).catch((error) => {
                expect(error.statusCode).toEqual(409);
                expect(error.message).toEqual("Conflict Error");
                expect(error.details).toEqual(
                    expect.arrayContaining([`${IUserColumnLabels.Email} is already in use`])
                );
            });
        });

        test("throws a conflict error (409) if a username is passed that is already taken", () => {
            const invalidSubmission = {
                ...buildValidSubmission(userTwo.username, true),
                [IUserColumnKeys.Username]: userOne.username
            };

            return userService.updateUser(userTwo.userNo, invalidSubmission).catch((error) => {
                expect(error.statusCode).toEqual(409);
                expect(error.message).toEqual("Conflict Error");
                expect(error.details).toEqual(
                    expect.arrayContaining([`${IUserColumnLabels.Username} is already in use`])
                );
            });
        });

        test("throws a not found error (404) if no user is found", () => {
            const validSubmission: IUpdateUserValues = {
                ...buildValidSubmission(userTwo.username, true),
                [IUserColumnKeys.FirstName]: "Eddie",
                [IUserColumnKeys.LastName]: "Van Halen",
                [IUserColumnKeys.Bio]: "I invented tapping",
                [IUserColumnKeys.ProfilePicture]: "www.vanhalen.com/super-shredder"
            };

            return userService.updateUser(900, validSubmission).catch((error) => {
                expect(error.statusCode).toEqual(404);
                expect(error.message).toEqual("Not Found");
                expect(error.details).toEqual(
                    expect.arrayContaining(["User with a userNo of 900 could not be found"])
                );
            });
        });
    }); // close describe("updateUser")

    describe("deleteUser", () => {
        let newUser: IUserRecord;
        let submission = buildValidSubmission("gurth_mcgurth") as ICreateUserValues;

        beforeAll(async (done) => {
            newUser = await userService.createUser(submission);
            done();
        });

        test("successfully deletes a user", () => {
            return userService.deleteUser(newUser.userNo).then((response) => {
                return userService.getUser(newUser.userNo).then((userRecord) => {
                    expect(response).toEqual(true);
                    expect(userRecord.userNo).toEqual(newUser.userNo);
                    expect(userRecord.isDeleted).toEqual(true);
                });
            });
        });

        test("throws a not found error (404) if no user is found", () => {
            return userService.deleteUser(900).catch((error) => {
                expect(error.statusCode).toEqual(404);
                expect(error.message).toEqual("Not Found");
                expect(error.details).toEqual(
                    expect.arrayContaining(["User with a userNo of 900 could not be found"])
                );
            });
        });
    }); // close describe("deleteUser")

    describe("banUser", () => {
        let newUser: IUserRecord;
        let submission = buildValidSubmission("steely_dan_the_man") as ICreateUserValues;

        beforeAll(async (done) => {
            newUser = await userService.createUser(submission);
            done();
        });

        test("successfully bans a user", () => {
            return userService.banUser(newUser.userNo).then((response) => {
                return userService.getUser(newUser.userNo).then((userRecord) => {
                    expect(response).toEqual(true);
                    expect(userRecord.userNo).toEqual(newUser.userNo);
                    expect(userRecord.isBanned).toEqual(true);
                });
            });
        });

        test("throws a not found error (404) if no user is found", () => {
            return userService.banUser(900).catch((error) => {
                expect(error.statusCode).toEqual(404);
                expect(error.message).toEqual("Not Found");
                expect(error.details).toEqual(
                    expect.arrayContaining(["User with a userNo of 900 could not be found"])
                );
            });
        });
    }); // close describe("banUser")

    describe("updatePassword", () => {
        let user: IUserRecord;
        let submission = buildValidSubmission("thedirtynil") as ICreateUserValues;
        let passwordSubmission = {
            currentPassword: "M0N3y!",
            newPassword: "thedr3@mis0v3r",
            confirmNewPassword: "thedr3@mis0v3r"
        };

        beforeAll(async (done) => {
            user = await userService.createUser(submission);
            done();
        });

        test("successfully updates a user's password", () => {
            return userService.updatePassword(user.userNo, passwordSubmission).then(() => {
                return dbConnection(tableName)
                    .first("*")
                    .where(pk, user.userNo)
                    .then((rawUser) => {
                        return bcrypt.compare(
                            passwordSubmission.newPassword,
                            rawUser.password,
                            (error, isMatch) => {
                                expect(error).toBe(undefined);
                                expect(rawUser.userNo).toEqual(user.userNo);
                                expect(isMatch).toEqual(true);
                            }
                        );
                    });
            });
        });

        test("throws a validation error (422) if 'confirmPassword' doesn't match 'newPassword'", () => {
            passwordSubmission = {
                ...passwordSubmission,
                confirmNewPassword: "theresarumblingandafiredownbelow"
            };

            return userService.updatePassword(user.userNo, passwordSubmission).catch((error) => {
                expect(error.statusCode).toEqual(422);
                expect(error.message).toEqual("Validation Error");
                expect(error.details).toEqual(expect.arrayContaining(["Passwords must match"]));
            });
        });

        test("throws a not found error (404) if no user is found", () => {
            const userNo = 9999;

            passwordSubmission = {
                ...passwordSubmission,
                newPassword: "everycentanddollar",
                confirmNewPassword: "everycentanddollar"
            };

            return userService.updatePassword(userNo, passwordSubmission).catch((error) => {
                expect(error.statusCode).toEqual(404);
                expect(error.message).toEqual("Not Found");
                expect(error.details).toEqual(
                    expect.arrayContaining([`User with a ${pk} of ${userNo} could not be found`])
                );
            });
        });
    }); // close describe("updatePassword")
}); // close describe("User Service")
