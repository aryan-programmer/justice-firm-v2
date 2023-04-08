import * as Types from "@sinclair/typebox";
import {SchemaOptions, TSchema, Type} from "@sinclair/typebox";
import {TypeCheck, TypeCompiler} from "@sinclair/typebox/compiler";
import {ValueError} from "@sinclair/typebox/errors";
// @ts-ignore
import memoizeWeakOrig from "memoizee/weak";
import {memoizeWeak} from "../common/utils/memoizeWeak";
import {constants} from "./constants";
import {EndpointResult} from "./endpoint";
import {CheckerErrorsOrNully, CheckerFunction, TypeCheckError} from "./types";

// region ...CheckerFunction
const fakeChecker: CheckerFunction<unknown> = {
	check (val: unknown): ValueError[] | null {
		return null;
	},
	get typeName (): string {
		return "ANY"
	}
}

export function fakeCheck<T> (): CheckerFunction<T> {
	return fakeChecker;
}

export function typeCheckErrorsFromValueErrors (errors: IterableIterator<ValueError>, prefix?: string) {
	return Array.from(errors, value => {
		const {$id, title} = value.schema;

		const res: TypeCheckError = {
			path:    value.path,
			value:   value.value,
			message: value.message,
		};
		if ($id != null) {
			res["schemaId"] = $id;
		}
		if (title != null) {
			res["schemaTitle"] = title;
		}
		return res;
	});
}

export const memoizedCompiler = memoizeWeak(function memoizedCompiler<T extends Types.TSchema> (schema: T, references?: Types.TSchema[]): TypeCheck<T> {
	return TypeCompiler.Compile(schema, references);
});

class LazyChecker<T extends Types.TSchema> implements CheckerFunction<Types.Static<T>> {
	checker?: TypeCheck<T>;

	constructor (private schema: T, private references?: Types.TSchema[]) {
	}

	check (val: unknown): CheckerErrorsOrNully {
		this.checker ??= memoizedCompiler(this.schema, this.references);
		return typeCheckErrorsFromValueErrors(this.checker.Errors(val));
	}

	get typeName (): string {
		return this.schema.$id ?? "Unknown";
	}
}

export function lazyCheck<T extends Types.TSchema> (schema: T, references?: Types.TSchema[]): CheckerFunction<Types.Static<T>> {
	return new LazyChecker(schema, references);
}

// endregion CheckerFunction

export const Message = Type.Object({
	message: Type.Any()
}, {$id: "Message"});
export type Message = Types.Static<typeof Message>;

export const MessageOr = memoizeWeak(function MessageOr<T extends TSchema> (item: T, options?: SchemaOptions) {
	return Type.Union([Message, item], {
		$id: `MessageOr${item.$id}`,
		...options
	});
});

export function response<T> (
	statusCode: number,
	body: T,
): EndpointResult<T> {
	return {
		statusCode,
		body,
	};
}

export function message (
	statusCode: number,
	message: any,
): EndpointResult<Message> {
	return {
		statusCode,
		body: {message},
	};
}

export const noContent: EndpointResult<null> = {
	statusCode: constants.HTTP_STATUS_NO_CONTENT,
	body:       null
}
