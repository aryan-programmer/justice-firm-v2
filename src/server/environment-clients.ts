import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {S3Client} from "@aws-sdk/client-s3";
import {SESClient} from "@aws-sdk/client-ses";
import {SSMClient} from "@aws-sdk/client-ssm";
import {nn} from "../common/utils/asserts";

export const randomNumber = require("random-number-csprng");

export const region                        = nn(process.env.AWS_REGION);
export const s3Bucket                      = nn(process.env.S3_BUCKET);
export const passwordResetOtpTableName     = nn(process.env.PASSWORD_RESET_OTP_TABLE_NAME);
export const connectionsTableName          = nn(process.env.CONNECTIONS_TABLE_NAME);
export const messagesTableName             = nn(process.env.MESSAGES_TABLE_NAME);
export const sesSourceEmailAddress         = nn(process.env.SES_SOURCE_EMAIL_ADDRESS);
export const JWT_SECRET_PARAMETER_NAME     = nn(process.env.JWT_SECRET);
export const DB_PASSWORD_PARAMETER_NAME    = nn(process.env.DB_PASSWORD);
export const DB_ENDPOINT                   = nn(process.env.DB_ENDPOINT);
export const DB_PORT                       = +nn(process.env.DB_PORT);
export const DB_USERNAME                   = nn(process.env.DB_USERNAME);
export const REDIS_PASSWORD_PARAMETER_NAME = nn(process.env.REDIS_PASSWORD);
export const REDIS_ENDPOINT                = nn(process.env.REDIS_ENDPOINT);
export const REDIS_PORT                    = +nn(process.env.REDIS_PORT);
export const REDIS_USERNAME                = nn(process.env.REDIS_USERNAME);

export const WS_CHATTER_BOX_API_CALLBACK_URL_PARAM_NAME   = nn(process.env.WS_CHATTER_BOX_API_CALLBACK_URL_PARAM_NAME);
export const WS_NOTIFICATIONS_API_CALLBACK_URL_PARAM_NAME = nn(process.env.WS_NOTIFICATIONS_API_CALLBACK_URL_PARAM_NAME);

export const ssmClient      = new SSMClient({region});
export const s3Client       = new S3Client({region});
export const dynamoDbClient = new DynamoDBClient({region});
export const sesClient      = new SESClient({region});

