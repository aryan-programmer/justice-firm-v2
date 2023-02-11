export enum HttpMethods {
	/**
	 * The GET method requests a representation of the specified resource.
	 */
	GET     = "GET",
	/**
	 * The PUT method replaces all current representations of the target resource with the request payload.
	 */
	PUT     = "PUT",
	/**
	 * The HEAD method asks for a response identical to that of a GET request, but without the response body.
	 */
	HEAD    = "HEAD",
	/**
	 * The POST method is used to submit an entity to the specified resource, often causing a change in state or side effects on the server.
	 */
	POST    = "POST",
	/**
	 * The DELETE method deletes the specified resource.
	 */
	DELETE  = "DELETE",
	/**
	 * The PATCH method applies partial modifications to a resource.
	 */
	PATCH   = "PATCH",
	/**
	 * The OPTIONS method describes the communication options for the target resource.
	 */
	OPTIONS = "OPTIONS",
	/**
	 * The wildcard entry to allow all methods.
	 */
	ALL     = "*"
}
