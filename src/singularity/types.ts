import {Either} from "fp-ts/lib/Either";
import {Nuly} from "../common/utils/types";

export type TypeCheckError = { path: string; message: string; value: unknown; schemaId?: string; schemaTitle?: string };
export type CheckerErrors = TypeCheckError[];
export type CheckerErrorsOrNully = TypeCheckError[] | undefined | null;

export interface CheckerFunction<T> {
	check (val: unknown): CheckerErrorsOrNully
}

export interface Parser<T> {
	parse (val: string | null | undefined): Either<CheckerErrors, T>

	stringify (val: T): string | Nuly
}

export type Class<T, TArgs extends any[] = []> = (new (...args: TArgs) => T);
