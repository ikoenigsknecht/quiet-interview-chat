/* Misc Errors */

export class NotImplementedError extends Error {
    constructor(functionName: string) {
        super(`${functionName} not implemented!`);
    }
}

export function extractErrorMessage(error: any): string {
    if (error instanceof Error) {
        return error.message;
    }
    return "Unknown Error";
}