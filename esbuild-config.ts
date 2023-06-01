#!/usr/bin/env node
import {Option, program} from "commander";
import * as esbuild from "esbuild";
import {BuildOptions} from "esbuild";
import * as fs from "fs-extra";
import path from "path";

// TODO: moment-timezone/data/packed/latest.json

// const __filename = fileURLToPath(import.meta.url);
// const __dirname  = path.dirname(__filename);
const sourcePath = path.resolve(__dirname, "./src/server");
const buildPath  = path.resolve(__dirname, "./src/server/dist");

program
	.option("-w, --watch", "Watch files")
	.option("--minify", "Minify output files")
	.option("--clean-only", "Clean & delete all output files, and then exit")
	.addOption(new Option("--no-clean", "Do not clean files").conflicts("cleanOnly"))
	.option("--no-maps", "Output no source maps")
	.option("--metafile", "Output metafile for module size analysis");

program.parse();

let opts      = program.opts();
let watch     = (opts.watch ?? false) === true;
let minify    = (opts.minify ?? false) === true;
let maps      = (opts.maps ?? false) === true;
let clean     = (opts.clean ?? false) === true;
let cleanOnly = (opts.cleanOnly ?? false) === true;
let metafile  = (opts.metafile ?? false) === true;

console.log(opts);

if (clean) {
	console.log(`Cleaning ${buildPath}`);
	fs.emptyDirSync(buildPath);
	console.log(`Cleaned  ${buildPath} successfully`);
	if (cleanOnly) {
		process.exit(0);
	}
}

let commonOptions: BuildOptions = {
	bundle:   true,
	format:   "cjs",
	platform: "node",
	//target:        "node16",
	tsconfig:      path.resolve(__dirname, "./tsconfig.json"),
	sourcemap:     maps ? "linked" : false,
	logLevel:      "info",
	color:         true,
	treeShaking:   true,
	supported:     {
		"object-rest-spread": false
	},
	minify,
	absWorkingDir: __dirname,
	metafile,
};

let apiAppOptions: BuildOptions           = {
	...commonOptions,
	entryPoints:   [path.resolve(sourcePath, "./rest-ws-apis/app.ts")],
	outfile:       path.resolve(buildPath, "./rest-ws-apis/app.js"),
	absWorkingDir: __dirname,
};
let snsEventListenerOptions: BuildOptions = {
	...commonOptions,
	entryPoints:   [path.resolve(sourcePath, "./events-and-notifications-apis/app.ts")],
	outfile:       path.resolve(buildPath, "./events-and-notifications-apis/app.js"),
	absWorkingDir: __dirname,
};

(async () => {
	if (watch) {
		let apiAppContext = await esbuild.context(apiAppOptions);
		console.log("Watching src/server/rest-ws-apis/app.ts");
		await apiAppContext.watch();

		let snsEventListenerContext = await esbuild.context(snsEventListenerOptions);
		console.log("Watching src/server/events-and-notifications-apis/app.ts");
		await snsEventListenerContext.watch();
	} else {
		const restWsApiRes        = await esbuild.build(apiAppOptions);
		const snsEventListenerRes = await esbuild.build(snsEventListenerOptions);
		if (metafile) {
			fs.writeFileSync('./server-build-metafiles/rest-ws-apis.json', JSON.stringify(restWsApiRes.metafile));
			fs.writeFileSync('./server-build-metafiles/events-and-notifications-apis.json', JSON.stringify(snsEventListenerRes.metafile));
		}
		process.exit(0);
	}
})();
