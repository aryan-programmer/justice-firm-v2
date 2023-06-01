import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {SSMClient} from "@aws-sdk/client-ssm";
import {nn} from "../../common/utils/asserts";

export const randomNumber = require("random-number-csprng");

export const region                        = nn(process.env.AWS_REGION);
export const s3Bucket                      = nn(process.env.S3_BUCKET);
export const connectionsTableName          = nn(process.env.CONNECTIONS_TABLE_NAME);
export const messagesTableName             = nn(process.env.MESSAGES_TABLE_NAME);
export const eventsSnsTopicArn             = nn(process.env.EVENTS_SNS_TOPIC_ARN);
export const JWT_SECRET_PARAMETER_NAME     = nn(process.env.JWT_SECRET);
export const REDIS_PASSWORD_PARAMETER_NAME = nn(process.env.REDIS_PASSWORD);
export const REDIS_ENDPOINT                = nn(process.env.REDIS_ENDPOINT);
export const REDIS_PORT                    = +nn(process.env.REDIS_PORT);
export const REDIS_USERNAME                = nn(process.env.REDIS_USERNAME);

export const ssmClient      = new SSMClient({region});
export const dynamoDbClient = new DynamoDBClient({region});

