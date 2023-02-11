import * as Types                                                                     from "@sinclair/typebox";
import {Type}                                                                         from "@sinclair/typebox";
import {TypeCheck, TypeCompiler}                                                      from "@sinclair/typebox/compiler";
import {ValueError}                                                                   from "@sinclair/typebox/errors";
import {chain as EitherChain, Either, left, right}                                    from "fp-ts/lib/Either";
import {constants}                                                                    from "http2";
import memoizee                                                                       from "memoizee";
import {Nuly}                                                                         from "../common/utils/types";
import {
	EndpointPathDefinition,
	EndpointPathDefinitionWithPathParams,
	EndpointResult,
	PathParametersSchema,
	PathParamSchema
}                                                                                     from "./endpoint";
import {CheckerErrors, CheckerErrorsOrNully, CheckerFunction, Parser, TypeCheckError} from "./types";

const memoizeWeak: <F extends (...args: any[]) => any>(f: F, options?: memoizee.Options<F>) => F & memoizee.Memoized<F> = require(
	"memoizee/weak");

// region ...CheckerFunction
const fakeChecker: CheckerFunction<unknown> = {
	check (val: unknown): ValueError[] | null {
		return null;
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

export const memoizedCompiler = memoizeWeak(function check<T extends Types.TSchema> (schema: T, references?: Types.TSchema[]): TypeCheck<T> {
	// console.log("memoizedCompiler: ",{schema, references});
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
}

export function lazyCheck<T extends Types.TSchema> (schema: T, references?: Types.TSchema[]): CheckerFunction<Types.Static<T>> {
	// console.log("lazyCheck: ",{schema, references});
	return new LazyChecker(schema, references);
}

export function compiledChecker<T extends Types.TSchema> (checker: TypeCheck<T>): CheckerFunction<Types.Static<T>> {
	return {
		check (val: unknown): CheckerErrorsOrNully {
			return typeCheckErrorsFromValueErrors(checker.Errors(val));
		}
	};
}

// endregion CheckerFunction

// region ...Parser
function getCheckerErrorsFromStatic (schemaId: string, val: any, message: string): Either<CheckerErrors, never> {
	return left([{
		path:    "",
		schemaId,
		value:   val,
		message: message,
	}]);
}

export const presenceParser: Parser<boolean> = {
	parse (val: string | null | undefined): Either<CheckerErrors, boolean> {
		return right(val != null);
	},
	stringify (val: boolean): string | Nuly {
		return val ? "true" : null;
	}
};
export const stringParser: Parser<string>    = {
	parse (val: string | null | undefined): Either<CheckerErrors, string> {
		if (val == null) {
			return getCheckerErrorsFromStatic("String", val, "Must not be null");
		}
		return right(val);
	},
	stringify (val: string): string {
		return val;
	}
};
export const numberParser: Parser<number>    = {
	parse (val: string | null | undefined): Either<CheckerErrors, number> {
		if (val == null) {
			return getCheckerErrorsFromStatic("Number", val, "Must not be null");
		}
		const res = Number(val);
		if (isNaN(res) || res == null) {
			return getCheckerErrorsFromStatic("Number", val, "Can't parse as number");
		}
		return right(res);
	},
	stringify (val: number): string {
		return val.toString();
	}
};

export function constrainedNumberParser (
	minIncl      = Number.MIN_VALUE,
	maxExcl      = Number.MAX_VALUE,
	checkInteger = false,
) {
	return {
		stringify: numberParser.stringify,
		parse (val: string | null | undefined): Either<CheckerErrors, number> {
			return EitherChain(chainFn)(numberParser.parse(val));
		}
	};

	function chainFn (a: number) {
		if (checkInteger && !Number.isInteger(a)) {
			return getCheckerErrorsFromStatic("Number", a, "Is not an integer");
		}
		if (a >= maxExcl) {
			return getCheckerErrorsFromStatic("Number", a, "Must be less than " + maxExcl);
		}
		if (a < minIncl) {
			return getCheckerErrorsFromStatic("Number", a, "Must be greater than or equal to " + minIncl);
		}
		return right(a);
	}
}

export function optionalParser<T> (parser: Parser<T>, nullString = "null"): Parser<T | Nuly> {
	return {
		parse (val: string | null | undefined): Either<CheckerErrors, Nuly | T> {
			if (val == null) return right(val);
			return parser.parse(val);
		},
		stringify (val: Nuly | T): string | Nuly {
			if (val == null) return nullString;
			return parser.stringify(val);
		}
	}
}

// endregion Parser

// region ...PathParams
export function pathParams<TPathParams extends PathParametersSchema> (pathSegments: TemplateStringsArray, ...v: TPathParams): EndpointPathDefinitionWithPathParams<TPathParams> {
	return {
		pathSegments: [...pathSegments],
		pathParams:   v,
	}
}

export namespace pathParams {
	export function parse<T> (name: string, parser: Parser<T>): PathParamSchema<T> {
		return {name, parser};
	}

	export function string (name: string): PathParamSchema<string> {
		return {name, parser: stringParser};
	}

	export function constrainedNumber (name: string, ...args: Parameters<typeof constrainedNumberParser>): PathParamSchema<number> {
		return {name, parser: constrainedNumberParser(...args)};
	}

	export function number (name: string): PathParamSchema<number> {
		return {name, parser: numberParser};
	}
}

export function pathSchemaToString (val: string): string;
export function pathSchemaToString<TPathParams extends PathParametersSchema> (val: EndpointPathDefinitionWithPathParams<TPathParams>): string;
export function pathSchemaToString (val: EndpointPathDefinition<PathParametersSchema | null | undefined>): string
export function pathSchemaToString (val: string | EndpointPathDefinitionWithPathParams): string {
	if (typeof val === "string") return val;
	return String.raw({raw: val.pathSegments}, ...val.pathParams.map(param => `{${param.name}}`));
}

// endregion PathParams

export const Message = Type.Object({
	message: Type.Any()
}, {$id: "Message"});
export type Message = Types.Static<typeof Message>;

export function response<T> (
	statusCode: number,
	body: T,
): EndpointResult<T> {
	return {
		statusCode,
		body,
	};
}

export function responseWithMore<T> (
	statusCode: number,
	body: T,
	stuff: Omit<EndpointResult<T>, "statusCode" | "body">
): EndpointResult<T> {
	return {
		statusCode,
		body,
		...stuff
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
