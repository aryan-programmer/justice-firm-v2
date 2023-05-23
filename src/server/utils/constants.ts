import {region, s3Bucket} from "../environment-clients";

export const saltRounds      = 7;
export const otpExpiryTimeMs = 1000 // ms in 1 second
                               * 60 // seconds in 1 minute
                               * 5; // minutes

export const cacheExpiryTimeMs = 24 /*hours in a day*/ *
                                 60 /*minutes in an hour*/ *
                                 60 /*seconds in a minute*/ *
                                 1000 /*milliseconds in a second*/;

export const S3_BUCKET_DATA_URL = `https://${s3Bucket}.s3.${region}.amazonaws.com`;
