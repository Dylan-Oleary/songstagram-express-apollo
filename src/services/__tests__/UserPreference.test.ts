import faker from "faker";
import path from "path";

import { dbConnection } from "~knex/db";
import {
    ICreateUserValues,
    IUpdateUserValues,
    IUserColumnKeys,
    IUserRecord,
    UserService
} from "~services/User";
import {
    IUserPreferenceColumnKeys,
    IUserPreferenceColumnLabels,
    IUserPreferences,
    UserPreferenceService
} from "~services/UserPreference";

describe("User Preference Service", () => {
    const userPreferenceRecordKeys = Object.values(IUserPreferenceColumnKeys).map((value) => value);

    /**
     * Builds a valid user submission
     *
     * @param username A valid username
     * @param deletePasswords Determines whether or not to omit `password` & `confirmPassword` from the submission. This becomes useful when building submissions for both creating a user and updating a user
     */
    const buildValidUserSubmission: (
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
        describe("Prefers Dark Mode", () => {
            test("throws a validation error (422) if its value is a string", () => {
                let submission = buildValidUserSubmission(
                    "bioshock_infinite_rulez"
                ) as ICreateUserValues;
                const preferences: IUserPreferences = {
                    //@ts-ignore - Testing invalid value validation
                    prefersDarkMode: "hello"
                };

                return new UserService(dbConnection)
                    .createUser(submission, preferences)
                    .then(() => {
                        throw new Error("Expected an error to be thrown");
                    })
                    .catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserPreferenceColumnLabels.PrefersDarkMode} must be a boolean value`
                            ])
                        );
                    });
            });

            test("throws a validation error (422) if its value is a number", () => {
                let submission = buildValidUserSubmission("bioshock_2_rulez") as ICreateUserValues;
                const preferences: IUserPreferences = {
                    //@ts-ignore - Testing invalid value validation
                    prefersDarkMode: Math.floor(Math.random() * 100) > 50 ? 0 : 1
                };

                return new UserService(dbConnection)
                    .createUser(submission, preferences)
                    .then(() => {
                        throw new Error("Expected an error to be thrown");
                    })
                    .catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IUserPreferenceColumnLabels.PrefersDarkMode} must be a boolean value`
                            ])
                        );
                    });
            });
        }); // close describe("Prefers Dark Mode")
    }); // close describe("Column Validation")

    describe("getUserPreference", () => {
        let user: IUserRecord;
        let submission = buildValidUserSubmission("dazedandconfused") as ICreateUserValues;

        beforeAll(async (done) => {
            user = await new UserService(dbConnection).createUser(submission);
            done();
        });

        test("returns a user preference record", () => {
            return new UserPreferenceService(dbConnection)
                .getUserPreference(user.userNo)
                .then((record) => {
                    for (const key of userPreferenceRecordKeys) {
                        expect(record).toHaveProperty(key);
                    }
                    expect(record.userNo).toEqual(user.userNo);
                });
        });

        test("throws a not found error (404) if no user preference record is found", () => {
            const invalidUserNo = 1000;

            return new UserPreferenceService(dbConnection)
                .getUserPreference(invalidUserNo)
                .then(() => {
                    throw new Error("Expected an error to be thrown");
                })
                .catch((error) => {
                    expect(error.statusCode).toEqual(404);
                    expect(error.message).toEqual("Not Found");
                    expect(error.details).toEqual(
                        expect.arrayContaining([
                            `User preference with a ${IUserPreferenceColumnKeys.UserNo} of ${invalidUserNo} could not be found`
                        ])
                    );
                });
        });
    }); // close describe("getUserPreference")

    describe("createUserPreference", () => {
        test("successfully creates a user preference record when preferences are passed", () => {
            const submission = buildValidUserSubmission("spaghetti_stringers") as ICreateUserValues;
            const preferences: IUserPreferences = {
                prefersDarkMode: Math.floor(Math.random() * 100) > 50
            };

            return new UserService(dbConnection)
                .createUser(submission, preferences)
                .then((userRecord) => {
                    return new UserPreferenceService(dbConnection).getUserPreference(
                        userRecord.userNo
                    );
                })
                .then((userPreferenceRecord) => {
                    for (const key of Object.keys(preferences)) {
                        expect(userPreferenceRecord[key as keyof IUserPreferences]).toEqual(
                            preferences[key as keyof IUserPreferences]
                        );
                    }
                });
        });

        test("successfully creates a user preference record when no preferences are passed", () => {
            const submission = buildValidUserSubmission("bobs_burgers_353") as ICreateUserValues;
            const defaultPreferences: IUserPreferences = {
                prefersDarkMode: false
            };

            return new UserService(dbConnection)
                .createUser(submission)
                .then((userRecord) => {
                    return new UserPreferenceService(dbConnection).getUserPreference(
                        userRecord.userNo
                    );
                })
                .then((userPreferenceRecord) => {
                    for (const key of Object.keys(defaultPreferences)) {
                        expect(userPreferenceRecord[key as keyof IUserPreferences]).toEqual(
                            defaultPreferences[key as keyof IUserPreferences]
                        );
                    }
                });
        });
    }); // close describe("createUserPreference")

    describe("deleteUserPreference", () => {
        let newUser: IUserRecord;
        let submission = buildValidUserSubmission("gurth_mcgurth_the_furst") as ICreateUserValues;

        beforeAll(async (done) => {
            newUser = await new UserService(dbConnection).createUser(submission);
            done();
        });

        test("successfully deletes a user preference record", () => {
            return new UserService(dbConnection).deleteUser(newUser.userNo).then(() => {
                return new UserPreferenceService(dbConnection)
                    .getUserPreference(newUser.userNo)
                    .then(() => {
                        throw new Error("Expected an error to be thrown");
                    })
                    .catch((error) => {
                        expect(error.statusCode).toEqual(404);
                        expect(error.message).toEqual("Not Found");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `User preference with a userNo of ${newUser.userNo} could not be found`
                            ])
                        );
                    });
            });
        });
    }); // close describe("deleteUserPreference")

    describe("updateUserPreference", () => {
        let user: IUserRecord;
        let submission = buildValidUserSubmission("I_AM_GR00T") as ICreateUserValues;

        beforeAll(async (done) => {
            user = await new UserService(dbConnection).createUser(submission);
            done();
        });

        test("successfully updates a user's preferences", () => {
            const expectedPreferences: IUserPreferences = {
                prefersDarkMode: Math.floor(Math.random() * 100) > 50
            };

            return new UserPreferenceService(dbConnection)
                .updateUserPreference(user.userNo, expectedPreferences)
                .then((updatedRecord) => {
                    for (const key of Object.keys(expectedPreferences)) {
                        expect(updatedRecord[key as keyof IUserPreferences]).toEqual(
                            expectedPreferences[key as keyof IUserPreferences]
                        );
                    }
                });
        });
    }); // close describe("updateUserPreference")
}); // close describe("User Preference Service")
