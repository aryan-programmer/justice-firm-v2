import {region, s3Bucket} from "../environment-clients";

export const saltRounds      = 7;
export const otpExpiryTimeMs = 1000 // ms in 1 second
                               * 60 // seconds in 1 minute
                               * 5 // minutes

export const S3_BUCKET_DATA_URL = `https://${s3Bucket}.s3.${region}.amazonaws.com`;
