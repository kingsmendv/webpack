/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const path = require("path");
const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Compiler")} Compiler */

class StartupChunkDependenciesPlugin {
	constructor(options) {
		this.asyncChunkLoading =
			options && typeof options.asyncChunkLoading === "boolean"
				? options.asyncChunkLoading
				: true;
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"StartupChunkDependenciesPlugin",
			compilation => {
				compilation.hooks.additionalTreeRuntimeRequirements.tap(
					"StartupChunkDependenciesPlugin",
					(chunk, set) => {
						if (compilation.chunkGraph.hasChunkEntryDependentChunks(chunk)) {
							set.add(RuntimeGlobals.startup);
							set.add(RuntimeGlobals.ensureChunk);
							set.add(RuntimeGlobals.ensureChunkIncludeEntries);
							compilation.addRuntimeModule(
								chunk,
								new StartupChunkDependenciesRuntimeModule(
									this.asyncChunkLoading
								)
							);
						}
					}
				);
			}
		);
	}
}

class StartupChunkDependenciesRuntimeModule extends RuntimeModule {
	constructor(asyncChunkLoading) {
		super("startup chunk dependencies");
		this.asyncChunkLoading = asyncChunkLoading;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { chunk, compilation } = this;

		const myPath = path.dirname(chunk.name);

		const target = compilation.compiler.options.target;

		const { chunkGraph, runtimeTemplate } = compilation;
		const chunkPaths = Array.from(
			chunkGraph.getChunkEntryDependentChunksIterable(chunk)
		).map(c => {
			let pathToChunk = c.id;

			if (target === "node") {
				pathToChunk = path.relative(myPath, String(c.id));
			}

			return pathToChunk;
		});

		return Template.asString([
			`var next = ${RuntimeGlobals.startup};`,
			`${RuntimeGlobals.startup} = ${runtimeTemplate.basicFunction(
				"",
				!this.asyncChunkLoading
					? chunkPaths
							.map(
								id => `${RuntimeGlobals.ensureChunk}(${JSON.stringify(id)});`
							)
							.concat("return next();")
					: chunkPaths.length === 1
					? `return ${RuntimeGlobals.ensureChunk}(${JSON.stringify(
							chunkPaths[0]
					  )}).then(next);`
					: chunkPaths.length > 2
					? [
							// using map is shorter for 3 or more chunks
							`return Promise.all(${JSON.stringify(chunkPaths)}.map(${
								RuntimeGlobals.ensureChunk
							}, __webpack_require__)).then(next);`
					  ]
					: [
							// calling ensureChunk directly is shorter for 0 - 2 chunks
							"return Promise.all([",
							Template.indent(
								chunkPaths
									.map(
										id => `${RuntimeGlobals.ensureChunk}(${JSON.stringify(id)})`
									)
									.join(",\n")
							),
							"]).then(next);"
					  ]
			)};`
		]);
	}
}

module.exports = StartupChunkDependenciesPlugin;
