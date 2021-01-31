import { IFormSubmission, IFormValidation, validateSubmission } from "../validateSubmission";

describe("Validate Submission", () => {
    test("returns a validation error (422) when validation fails", () => {
        const validation: IFormValidation = [
            {
                isRequired: true,
                key: "username",
                label: "Username"
            }
        ];
        const submission: IFormSubmission = {
            userNo: 1
        };
        const result = validateSubmission(validation, submission);

        expect(result!.statusCode).toEqual(422);
        expect(result!.message).toEqual("Validation Error");
        expect(result!.details).toEqual(expect.arrayContaining(["Username is a required field"]));
    });

    test("returns a validation error (422) when a field is required but an empty string is passed", () => {
        const validation: IFormValidation = [
            {
                isRequired: true,
                key: "username",
                label: "Username"
            }
        ];
        const submission: IFormSubmission = {
            username: ""
        };
        const result = validateSubmission(validation, submission);

        expect(result!.statusCode).toEqual(422);
        expect(result!.message).toEqual("Validation Error");
        expect(result!.details).toEqual(expect.arrayContaining(["Username is a required field"]));
    });

    test("returns a validation error (422) when a field's validation fails", () => {
        const validation: IFormValidation = [
            {
                isRequired: true,
                key: "username",
                label: "Username",
                check: (value) => {
                    if (value.length > 50)
                        return new Error("Username cannot be more than 50 characters");

                    return undefined;
                }
            }
        ];
        const submission: IFormSubmission = {
            username: new Array(52).join("x")
        };
        const result = validateSubmission(validation, submission);

        expect(result!.statusCode).toEqual(422);
        expect(result!.message).toEqual("Validation Error");
        expect(result!.details).toEqual(
            expect.arrayContaining(["Username cannot be more than 50 characters"])
        );
    });

    test("returns 'undefined' when the submission is valid", () => {
        const validation: IFormValidation = [
            {
                isRequired: true,
                key: "username",
                label: "Username"
            }
        ];
        const submission: IFormSubmission = {
            username: "R0Xy"
        };
        const result = validateSubmission(validation, submission);

        expect(result).toBeUndefined();
    });

    test("successfully strips submission values of 'null' or 'undefined' and successfulyl validates the submission", () => {
        const validation: IFormValidation = [
            {
                isRequired: true,
                key: "username",
                label: "Username"
            },
            {
                key: "email",
                label: "Email Address"
            },
            {
                key: "food",
                label: "Favourite Food"
            }
        ];
        const submission: IFormSubmission = {
            username: "R0Xy",
            email: null
        };
        const result = validateSubmission(validation, submission);

        expect(result).toBeUndefined();
    });
}); // close describe("Validate Submission")
