export interface IFormSubmission {
    [key: string]: any;
}

export type IFormValidation = IFormValidationField[];

export interface IFormValidationField {
    isRequired?: boolean;
    key: string;
    label: string;
    check?: (value: string, submission?: IFormSubmission) => Error | undefined;
}

export interface IFormValidationError {
    statusCode: number;
    message: string;
    details: string[];
}

export const validateSubmission: (
    validation: IFormValidation,
    submission: IFormSubmission
) => IFormValidationError | undefined = (validation, submission) => {
    let submissionErrors: string[] = [];

    Object.keys(submission).forEach((key) => {
        if (submission[key] === undefined || submission[key] === null) delete submission[key];
    });

    validation.forEach(({ check, isRequired, key, label }) => {
        if (submission[key] !== undefined) {
            if (isRequired && String(submission[key]).trim().length === 0)
                submissionErrors.push(`${label} is a required field`);

            const fieldError = check ? check(submission[key], submission) : undefined;

            if (fieldError && fieldError.message) {
                submissionErrors.push(fieldError.message);
            }
        } else {
            if (isRequired) submissionErrors.push(`${label} is a required field`);
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
