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

    Object.keys(submission).forEach((key) => {
        if (submission[key] === undefined || submission[key] === null) delete submission[key];
    });

    Object.keys(validation).forEach((validationKey) => {
        if (submission[validationKey]) {
            if (
                validation[validationKey].isRequired &&
                String(submission[validationKey]).trim().length === 0
            )
                submissionErrors.push(`${validation[validationKey].label} is a required field`);

            const fieldError = validation[validationKey].check(
                submission[validationKey],
                submission
            );

            if (fieldError && fieldError.message) {
                submissionErrors.push(fieldError.message);
            }
        } else {
            if (validation[validationKey].isRequired)
                submissionErrors.push(`${validation[validationKey].label} is a required field`);
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
