//@ts-nocheck
import { dbConnection } from "../../knex/db";
import { ICreateUserValues, IUser, IUserFormKeys, IUserFormLabels, UserService } from "../User";

describe("User Service", () => {
    const pk = "userNo";
    const userRecordKeys = [
        "userNo",
        "firstName",
        "lastName",
        "bio",
        "username",
        "email",
        "profilePicture",
        "postCount",
        "followerCount",
        "followingCount",
        "isDeleted",
        "isBanned",
        "lastLoginDate",
        "createdDate",
        "lastUpdated"
    ];

    beforeAll(async (done) => {
        await dbConnection.migrate.latest();
        done();
    });

    afterAll(async (done) => {
        await dbConnection.destroy();
        done();
    });

    describe("createUser", () => {
        const submission: ICreateUserValues = {
            [IUserFormKeys.FirstName]: "David",
            [IUserFormKeys.LastName]: "Gilmour",
            [IUserFormKeys.Username]: "spaghetti_strings",
            [IUserFormKeys.Email]: "davidgilmour@darkside.uk",
            [IUserFormKeys.Password]: "M0N3y!",
            [IUserFormKeys.ConfirmPassword]: "M0N3y!"
        };
        let newUser: IUser;

        test("successfully creates a user", () => {
            return new UserService(dbConnection).createUser(submission).then((userRecord) => {
                userRecordKeys.forEach((key) => {
                    expect(userRecord).toHaveProperty(key);
                });
                [
                    IUserFormKeys.FirstName,
                    IUserFormKeys.LastName,
                    IUserFormKeys.Username,
                    IUserFormKeys.Email
                ].forEach((key) => {
                    expect(userRecord[key]).toEqual(submission[key]);
                });

                newUser = userRecord;
            });
        });

        [
            { key: "followerCount", label: "follower" },
            { key: "followingCount", label: "following" },
            { key: "postCount", label: "post" }
        ].forEach(({ key, label }) => {
            test(`successfully creates a user with the correct ${label} count`, () => {
                expect(newUser[key]).toEqual(0);
            });
        });

        describe("Submission Fields", () => {
            [
                { key: IUserFormKeys.FirstName, label: IUserFormLabels.FirstName },
                { key: IUserFormKeys.LastName, label: IUserFormLabels.LastName }
            ].forEach(({ key, label }) => {
                describe(`${label}`, () => {
                    test("throws a validation error (422) if its value is undefined", () => {
                        const invalidSubmission = { ...submission, [key]: undefined };

                        return new UserService(dbConnection)
                            .createUser(invalidSubmission)
                            .catch((error) => {
                                expect(error.statusCode).toEqual(422);
                                expect(error.message).toEqual("Validation Error");
                                expect(error.details).toEqual(
                                    expect.arrayContaining([`${label} is a required field`])
                                );
                            });
                    });

                    test("throws a validation error (422) if its value is null", () => {
                        const invalidSubmission = { ...submission, [key]: null };
                        return new UserService(dbConnection)
                            .createUser(invalidSubmission)
                            .catch((error) => {
                                expect(error.statusCode).toEqual(422);
                                expect(error.message).toEqual("Validation Error");
                                expect(error.details).toEqual(
                                    expect.arrayContaining([`${label} is a required field`])
                                );
                            });
                    });

                    test("throws a validation error (422) if its value is empty", () => {
                        const invalidSubmission = { ...submission, [key]: "" };

                        return new UserService(dbConnection)
                            .createUser(invalidSubmission)
                            .catch((error) => {
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

                        return new UserService(dbConnection)
                            .createUser(invalidSubmission)
                            .catch((error) => {
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
                        [IUserFormKeys.Username]: undefined
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Username} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) if its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Username]: null
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Username} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) if its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Username]: ""
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Username} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) if its value is too long", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Username]: new Array(32).join("x")
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Username} cannot be more than 30 characters`
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
                            [IUserFormKeys.Username]: username
                        };

                        return new UserService(dbConnection)
                            .createUser(invalidSubmission)
                            .catch((error) => {
                                expect(error.statusCode).toEqual(422);
                                expect(error.message).toEqual("Validation Error");
                                expect(error.details).toEqual(
                                    expect.arrayContaining([
                                        `${IUserFormLabels.Username} is invalid`
                                    ])
                                );
                            });
                    });
                }); // close forEach
            }); // close describe("Username")

            describe("Email Address", () => {
                test("throws a validation error (422) if its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Email]: undefined
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Email} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) if its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Email]: null
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Email} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) if its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Email]: ""
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Email} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) if its value is too long", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Email]: new Array(257).join("x")
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Email} cannot be more than 255 characters`
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
                            [IUserFormKeys.Email]: invalidEmail
                        };

                        return new UserService(dbConnection)
                            .createUser(invalidSubmission)
                            .catch((error) => {
                                expect(error.statusCode).toEqual(422);
                                expect(error.message).toEqual("Validation Error");
                                expect(error.details).toEqual(
                                    expect.arrayContaining([`${IUserFormLabels.Email} is invalid`])
                                );
                            });
                    });
                });
            }); // close describe("Email Address")

            describe("Password", () => {
                test("throws a validation error (422) when its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Password]: undefined
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Password} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) when its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Password]: null
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Password} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) when its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Password]: ""
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Password} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) when its value is too long", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Password]: new Array(52).join("x")
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Password} cannot be more than 50 characters`
                                ])
                            );
                        });
                });
            }); // close describe("Password")

            describe("Confirm Password", () => {
                test("throws a validation error (422) when its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.ConfirmPassword]: undefined
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.ConfirmPassword} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) when its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.ConfirmPassword]: null
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.ConfirmPassword} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) when its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.ConfirmPassword]: ""
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.ConfirmPassword} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) when its value does match the 'Password' value", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Password]: "supersecretpassword",
                        [IUserFormKeys.ConfirmPassword]: "password"
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining(["Passwords must match"])
                            );
                        });
                });
            }); // close describe("Confirm Password")
        }); // close describe("Submission Fields")
    }); //close describe("createUser")
}); // close describe("User Service")
