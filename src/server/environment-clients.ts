import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {S3Client} from "@aws-sdk/client-s3";
import {SESClient} from "@aws-sdk/client-ses";
import {SSMClient} from "@aws-sdk/client-ssm";
import {nn} from "../common/utils/asserts";

export const randomNumber = require("random-number-csprng");

export const region                    = nn(process.env.AWS_REGION);
export const s3Bucket                  = nn(process.env.S3_BUCKET);
export const passwordResetOtpTableName = nn(process.env.PASSWORD_RESET_OTP_TABLE_NAME);
export const connectionsTableName      = nn(process.env.CONNECTIONS_TABLE_NAME);
export const messagesTableName         = nn(process.env.MESSAGES_TABLE_NAME);
export const sesSourceEmailAddress     = nn(process.env.SES_SOURCE_EMAIL_ADDRESS);
// export const wsApiCallbackUrl          = nn(process.env.WS_API_CALLBACK_URLexport);

export const ssmClient      = new SSMClient({region});
export const s3Client       = new S3Client({region});
export const dynamoDbClient = new DynamoDBClient({region});
export const sesClient      = new SESClient({region});

