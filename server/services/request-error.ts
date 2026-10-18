// A problem with what the client sent. The error handler turns it into a JSON response with
// this status and message; anything else is a 500 with the details kept in the server log.
export class RequestError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'RequestError'
    this.status = status
  }
}
