export type TypeCheckError = { path: string; message: string; value: unknown; schemaId?: string; schemaTitle?: string };
export type CheckerErrors = TypeCheckError[];
export type CheckerErrorsOrNully = TypeCheckError[] | undefined | null;

export interface CheckerFunction<T> {
	check (val: unknown): CheckerErrorsOrNully;

	get typeName (): string;
}

export type Class<T, TArgs extends any[] = []> = (new (...args: TArgs) => T);
