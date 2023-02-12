#!/usr/bin/env node
import {Option, program} from "commander";
import * as esbuild      from "esbuild";
import {BuildOptions}    from "esbuild";
import * as fs           from "fs-extra";
import path              from "path";

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
	.option("--no-maps", "Output no source maps");

program.parse();

let opts      = program.opts();
let watch     = (opts.watch ?? false) === true;
let minify    = (opts.minify ?? false) === true;
let maps      = (opts.maps ?? false) === true;
let clean     = (opts.clean ?? false) === true;
let cleanOnly = (opts.cleanOnly ?? false) === true;

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
	bundle:        true,
	format:        "cjs",
	platform:      "node",
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
};

// let apiImplOptions: BuildOptions = {
// 	...commonOptions,
// 	entryPoints: /**/[path.resolve(sourcePath, "api-impl.ts")],
// 	outfile: /*     */path.resolve(buildPath, "api-impl/nodejs/api-impl.js"),
// };

// const s = "./api-impl/nodejs/api-impl.js";
let apiAppOptions: BuildOptions = {
	...commonOptions,
	entryPoints: /**/ [path.resolve(sourcePath, "app.ts")],
	outfile: /*     */path.resolve(buildPath, "app.js"),
	absWorkingDir:    __dirname,
	// external: ["src/server/api-impl", s],
	// alias: {
	// 	"src/server/api-impl": s
	// },
};

(async () => {
	if (watch) {
		// let apiImplContext = await esbuild.context(apiImplOptions);
		let apiAppContext = await esbuild.context(apiAppOptions);
		// console.log("Watching src/server/api-impl.ts");
		console.log("Watching src/server/app.ts");
		// await apiImplContext.watch();
		await apiAppContext.watch();
	} else {
		// await esbuild.build(apiImplOptions);
		await esbuild.build(apiAppOptions);
		process.exit(0);
	}
})();
