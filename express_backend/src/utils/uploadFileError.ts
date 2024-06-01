export class uploadFileError extends Error {
  constructor(message: string, public code: number) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}