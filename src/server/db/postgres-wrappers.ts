import {Pool, PoolClient, QueryResult} from "pg";
import {assert} from "../../common/utils/asserts";
import {uniqId} from "../../common/utils/uniq-id";
import {repeatedNTimesWithDelimiter, repeatedQuestionMarks} from "../common/utils/functions";

export type UpsertResult = {
	affectedRows: number;
	insertId?: number | bigint;
	result: QueryResult
};

export type SelectResult = Record<string, any>[];

function wrapWithQuotesIfNot (s: string) {
	if (s.startsWith("\"")) return s;
	assert(!s.includes("\""), "Invalid identifier name");
	return `"${s}"`;
}

function queryPreprocessing (queryText: string) {
	const parts = queryText.split("?");
	if (parts.length === 1) return parts[0];
	let res = "";
	let i   = 0;
	for (const part of parts) {
		if (i === 0) res += part;
		else res += "$" + i + part;
		i++;
	}
	res = res.replace(/\s\s+/g, ' ');
	return res;
}

async function execQuery<I extends any[] = any[]> (
	runner: Pool | PoolClient,
	queryText: string,
	values?: I,
	idColumn: string = "id"
): Promise<SelectResult | UpsertResult> {
	let isSelect = false;
	let getId    = false;
	if (queryText.startsWith("SELECT")) {
		isSelect = true;
	} else if (queryText.startsWith("INSERT") && !queryText.includes("RETURNING")) {
		queryText = queryText.replace(";", "") + " RETURNING " + idColumn + ";";
		getId     = true;
	}
	queryText = queryPreprocessing(queryText);
	const res = await runner.query(queryText, values);
	if (isSelect) {
		return res.rows as Record<string, any>[];
	} else {
		return {
			affectedRows: res.rowCount,
			result:       res,
			insertId:     getId ? BigInt(((res.rows[0] as Record<string, any>)[idColumn].toString() ?? "0") as string) : undefined
		};
	}
}


export class PoolConnectionPatch {
	constructor (public client: PoolClient) {
	}

	async beginTransaction () {
		return await this.client.query("BEGIN");
	}

	async commit () {
		return await this.client.query("COMMIT");
	}

	async rollback () {
		return await this.client.query("ROLLBACK");
	}

	async release () {
		await this.client.release();
	}

	async execute<I extends any[] = any[]> (
		queryText: string,
		values?: I,
		idColumn: string = "id"
	): Promise<UpsertResult> {
		queryText = queryText.trim();
		if (queryText.startsWith("SELECT")) {
			throw new Error("Execute queries can not start with SELECT");
		}
		return (await execQuery(this.client, queryText, values, idColumn)) as UpsertResult;
	}

	async query<I extends any[] = any[]> (
		queryText: string,
		values?: I,
		idColumn: string = "id"
	): Promise<SelectResult> {
		queryText = queryText.trim();
		if (!queryText.startsWith("SELECT")) {
			throw new Error("Queries must start with SELECT");
		}
		return (await execQuery(this.client, queryText, values, idColumn)) as SelectResult;
	}

	async batchInsert<I extends any[][] = any[][]> (
		tableName: string,
		columnNames: string[],
		values: I
	) {
		if (values.length === 0) return;
		assert(values.every(v => v.length === columnNames.length),
			"The number of values in each row to insert must match the number of columns");
		tableName               = wrapWithQuotesIfNot(tableName);
		columnNames             = columnNames.map(wrapWithQuotesIfNot)
		const valuesPlaceholder = repeatedNTimesWithDelimiter(
			`(${repeatedQuestionMarks(columnNames.length)})`,
			',',
			values.length
		);
		let insertQuery         = `INSERT INTO ${tableName} (${columnNames.join(",")}) VALUES ${valuesPlaceholder};`;
		insertQuery             = queryPreprocessing(insertQuery);
		const flatValues        = values.flat(1);
		console.log({insertQuery, flatValues});
		return await this.client.query(insertQuery, flatValues);
	}

	async batchUpdate (
		tableName: string,
		idName: string,
		idType: string,
		columnNames: string[],
		columnTypes: string[],
		values: {
			id: any,
			values: any[]
		}[]
	) {
		if (values.length === 0) return;
		assert(values.every(v => v.values.length === columnNames.length),
			"The number of values in each row to insert must match the number of columns");
		const origTableName       = wrapWithQuotesIfNot("orig_" + uniqId());
		const tempTableName       = wrapWithQuotesIfNot("temp_vals_" + uniqId());
		tableName                 = wrapWithQuotesIfNot(tableName);
		idName                    = wrapWithQuotesIfNot(idName);
		columnNames               = columnNames.map(wrapWithQuotesIfNot);
		const valuesPlaceholders  = "VALUES " + repeatedNTimesWithDelimiter(
			`(?::${idType.toUpperCase()}, ${columnTypes.map(v => `?::${v.toUpperCase()}`)})`,
			',',
			values.length
		);
		const columnsForSetClause = columnNames.map(v => `${v}=${tempTableName}.${v}`).join(",");
		let updateQuery           =
			    `UPDATE ${tableName} AS ${origTableName}
			     SET ${columnsForSetClause}
			     FROM (${valuesPlaceholders}) AS ${tempTableName}(${idName}, ${columnNames.join(",")})
			     WHERE ${tempTableName}.${idName} = ${origTableName}.${idName};`;
		updateQuery               = queryPreprocessing(updateQuery);
		const flatValues          = values.flatMap(v => [v.id, ...v.values]);
		console.log({updateQuery, flatValues});
		return await this.client.query(updateQuery, flatValues);
	}
}

export class PoolPatch {
	constructor (public pool: Pool) {
	}

	async execute<I extends any[] = any[]> (
		queryText: string,
		values?: I,
		idColumn: string = "id"
	): Promise<UpsertResult> {
		queryText = queryText.trim();
		if (queryText.startsWith("SELECT")) {
			throw new Error("Execute queries can not start with SELECT");
		}
		return (await execQuery(this.pool, queryText, values, idColumn)) as UpsertResult;
	}

	async query<I extends any[] = any[]> (
		queryText: string,
		values?: I,
		idColumn: string = "id"
	): Promise<SelectResult> {
		queryText = queryText.trim();
		if (!queryText.startsWith("SELECT")) {
			throw new Error("Queries must start with SELECT");
		}
		return (await execQuery(this.pool, queryText, values, idColumn)) as SelectResult;
	}
}
