export const parseValidationError = (validationError: any) => {
    const errorsMessages: string[] = [];
    const errors = (validationError as any).errors;

    for (const fieldErrors in errors) {
        errorsMessages.push(errors[fieldErrors].message);
    }
    return errorsMessages;
}