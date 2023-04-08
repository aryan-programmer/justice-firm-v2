import {AttributeValue, ConsumedCapacity} from "@aws-sdk/client-dynamodb";
import {PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {fileTypeFromBuffer} from "file-type";
import {verify} from "jsonwebtoken";
import mapValues from "lodash/mapValues";
import {extension} from "mime-types";
import fetch from 'node-fetch';
import {Stream} from "stream";
import {nn} from "../../common/utils/asserts";
import {badFileNameChars, isIterable} from "../../common/utils/constants";
import {uniqId} from "../../common/utils/uniq-id";

export async function streamToBuffer (stream: Stream): Promise<Buffer> {
	return new Promise<Buffer>((resolve, reject) => {
		const _buf: any[] = [];

		stream.on('data', (chunk) => _buf.push(chunk));
		stream.on('end', () => resolve(Buffer.concat(_buf)));
		stream.on('error', (err) => reject(err));
	});
}

export async function getMimeTypeFromUrlServerSide (dataUrl: string) {
	const dataUrlResponse = await fetch(dataUrl);
	if (dataUrlResponse.body == null) return "text/plain";
	let bodyBuffer = await streamToBuffer(nn(await dataUrlResponse.body));
	const fileType = await fileTypeFromBuffer(bodyBuffer);
	return fileType?.mime ?? dataUrlResponse.headers.get('Content-Type') ?? "text/plain";
}

export async function uploadDataUrlToS3 (args: {
	name: string,
	dataUrl: string,
	s3Client: S3Client,
	contentType: string,
	s3Bucket: string,
	prefix: string,
	region: string,
}) {
	const {dataUrl, s3Client, name, s3Bucket, prefix, region, contentType} = args;

	const fileName        = name.replace(badFileNameChars, '_');
	const dataUrlResponse = await fetch(dataUrl);
	const ext             = extension(contentType);
	const uid             = uniqId();
	let fileKey           = `${prefix}${fileName}${uid}.${ext}`;
	let bodyBuffer        = await streamToBuffer(nn(await dataUrlResponse.body));
	const res             = await s3Client.send(new PutObjectCommand({
		Bucket:      s3Bucket,
		Body:        bodyBuffer,
		Key:         fileKey,
		ContentType: contentType,
		ACL:         "public-read",
		// ContentLength: body
	}));

	return {
		result: res,
		url:    `https://${s3Bucket}.s3.${region}.amazonaws.com/${fileKey}`
	};
}

export function verifyAndDecodeJwtToken<T> (data: string, jwtSecret: string) {
	const decoded = verify(data, jwtSecret);
	const obj: T  = typeof decoded === "string" ? JSON.parse(decoded) : decoded;
	return obj;
}

export type ReallyBasicTypes = string | number | bigint | boolean | null | undefined;

export type BasicData = ReallyBasicTypes | (BasicData)[] | {
	[index: string]: BasicData
};

export function toDynamoDBAttributeValue (v: BasicData): AttributeValue {
	if (v == null) {
		return {NULL: true}
	} else if (typeof v === "string") {
		return {S: v}
	} else if (typeof v === "number" || typeof v === "bigint") {
		return {N: v.toString()};
	} else if (typeof v === "boolean") {
		return {BOOL: v};
	} else if (Array.isArray(v)) {
		return {L: v.map(toDynamoDBAttributeValue)}
	} else if (isIterable(v)) {
		return {L: Array.from(v, toDynamoDBAttributeValue)}
	} else if (typeof v === "object") {
		return {M: mapValues(v, toDynamoDBAttributeValue)}
	}
	return {S: "__JSON__:" + JSON.stringify(v)};
}

export function toDynamoDBItem (v: Record<string, BasicData>): Record<string, AttributeValue> {
	return mapValues(v, toDynamoDBAttributeValue);
}

export function fromDynamoDBAttributeValue (v: AttributeValue): BasicData {
	if ("NULL" in v) {
		return null
	} else if ("S" in v) {
		if (v.S?.startsWith("__JSON__:") === true) {
			return JSON.parse(v.S.substring("__JSON__:".length));
		}
		return v.S;
	} else if ("N" in v) {
		return BigInt(v.N ?? 0);
	} else if ("BOOL" in v) {
		return v.BOOL;
	} else if ("L" in v) {
		return v.L?.map(fromDynamoDBAttributeValue) ?? []
	} else if ("M" in v) {
		return mapValues(v.M, fromDynamoDBAttributeValue)
	}
	return null;
}

export function fromDynamoDBItem (v: Record<string, AttributeValue>): Record<string, BasicData> {
	return mapValues(v, fromDynamoDBAttributeValue);
}

export function printConsumedCapacity (text: string, queryResponse: { ConsumedCapacity?: ConsumedCapacity; }) {
	console.log(`Consumed Capacity for ${text}: `, JSON.stringify(queryResponse.ConsumedCapacity, null, 4));
}
