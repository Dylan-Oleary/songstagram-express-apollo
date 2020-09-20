export interface IFormSubmission {
    [key: string]: any;
}

export interface IFormValidationObject {
    [key: string]: IFormValidationField;
}

export interface IFormValidationField {
    isRequired: boolean;
    label: string;
    check: (value: string, submission?: IFormSubmission) => Error | undefined;
}

export interface IFormValidationError {
    statusCode: number;
    message: string;
    details: string[];
}

export const validateSubmission: (
    validation: IFormValidationObject,
    submission: IFormSubmission
) => IFormValidationError | undefined = (validation, submission) => {
    let submissionErrors: string[] = [];

    Object.keys(submission).forEach((submissionKey) => {
        if (validation[submissionKey]) {
            if (
                validation[submissionKey].isRequired &&
                String(submission[submissionKey]).trim().length === 0
            )
                submissionErrors.push(`${validation[submissionKey].label} is a required field`);

            const fieldError = validation[submissionKey].check(
                submission[submissionKey],
                submission
            );

            if (fieldError && fieldError.message) {
                submissionErrors.push(fieldError.message);
            }
        }
    });

    return submissionErrors.length > 0
        ? {
              statusCode: 422,
              message: "Validation Error",
              details: submissionErrors
          }
        : undefined;
};

export default validateSubmission;
