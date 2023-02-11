#!/usr/bin/env node
import * as cdk           from 'aws-cdk-lib';
import 'source-map-support/register';
import {JusticeFirmStack} from './justice-firm-stack';

const app = new cdk.App();
new JusticeFirmStack(app, 'JusticeFirmStack', {});
