import {PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {extension} from "mime-types";
import fetch from 'node-fetch';
import {Stream} from "stream";
import {nn} from "../../common/utils/asserts";
import {badFileNameChars} from "../../common/utils/constants";
import {uniqId} from "../../common/utils/uniq-id";

export async function streamToBuffer (stream: Stream): Promise<Buffer> {
	return new Promise<Buffer>((resolve, reject) => {
		const _buf: any[] = [];

		stream.on('data', (chunk) => _buf.push(chunk));
		stream.on('end', () => resolve(Buffer.concat(_buf)));
		stream.on('error', (err) => reject(err));
	});
}

export async function uploadDataUrlToS3 (args: {
	name: string,
	dataUrl: string,
	s3Client: S3Client,
	s3Bucket: string,
	prefix: string,
	region: string,
}) {
	const {dataUrl, s3Client, name, s3Bucket, prefix, region} = args;

	const fileName        = name.replace(badFileNameChars, '_');
	const dataUrlResponse = await fetch(dataUrl);
	const contentType     = dataUrlResponse.headers.get('Content-Type') ?? "text/plain";
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
