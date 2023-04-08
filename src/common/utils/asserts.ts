import {Nuly} from "./types";

class AssertionError extends Error {
}

class NullOrUndefinedValueError extends Error {
	public readonly nullOrUndefined: null | undefined;

	constructor (error: string, nullOrUndefined: null | undefined) {
		super(error);
		this.nullOrUndefined = nullOrUndefined;
	}
}

function assert (
	expr: boolean,
	message: string | (() => string) = "The value was expected to be truthy but wasn't."
): asserts expr {
	if (!Boolean(expr)) {
		if (typeof message == "function")
			throw new AssertionError(message());
		else
			throw new AssertionError(message);
	}
}

function nn<T> (
	val: T | Nuly,
	message: string = "The value was expected to be not null or undefined but it was."
): T {
	if (val === null) {
		throw new NullOrUndefinedValueError(message, null);
	}
	if (val === undefined) {
		throw new NullOrUndefinedValueError(message, undefined);
	}
	return val;
}

export {nn, assert, NullOrUndefinedValueError};
