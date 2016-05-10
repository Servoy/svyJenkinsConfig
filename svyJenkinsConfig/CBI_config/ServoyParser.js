/*
 * The MIT License
 * 
 * This file is part of the Servoy Business Application Platform, Copyright (C) 2012-2016 Servoy BV 
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */

/*
 * ServoyParser.js
 * 
 * Parse all the JS Files instrumented by Istanbul in input directory tree and save parsed file in output directory tree.
 * Istanbul inject a variable on top of every js file and a method which initiate the variable.
 * Generate a UUID property for all injected variables and wrap the method injected by istanbul in a self executing variable.
 * Those variables are used by istanbul to count the line of code hitted during executions.
 * Move the variable and the injected method in a new scope file of the test solution.
 * 
 * At the onOpen event the test solution should init the newly created scope file to initiate all the variables injected by istanbul
 * The global variable __coverage__ contains the stats of all the line of code hitted during executions.
 * At the onClose event the test solution should save the content of the variable __report__ in a .json file.
 * 
 * Fail if any parsed file is not instrumented (configurable option --e true|false).
 * Skip files from folder '*_test', 'JenkinsConfig' and 'medias'
 * List file to be skipped using arg --x "folder1, folder2, file1.js".
 * Log verbose output --v true
 * 
 * */

// require node libraries
var fs = require('fs');
var readline = require('readline');
var stream = require('stream');
var path = require('path');
var util = require('util');
var Transform = stream.Transform || require('readable-stream').Transform;

var HELP = 'ServoyParser arguments\n\
--h help\n\
--d <output_dir> <input_dir>\n\
mandatory argument! Parse file from directory tree <input_dir> and save parsed files in <output_dir> using the same tree structure\n\n\
--e <true|false>\n\
when set to true return error if any of the processed file is not instrumented. Default is false\n\n\
--t <test_solution_name>\n\
The name of the test solution\n\n\
--i "<include_folder>[,<include_folder>]"\n\
include folders. List all folder to be included in a string. Use comma to separate folder names.\n\n\
--x "<exclude_folder>[,<exclude_folder>]"\n\
Exclude folders or files. List all files and folder to be excluded in a string. Use comma to separate folder or file names.\n\n\
--v <true|false>\n\
verbose logging. set verbose to true to view the log messages during execution\n'

var WORKSPACE
var TEMP_WORKSPACE								// input directory to parse the file.
var WORKSPACE_PATH 								// ouput directory for the parsed file.
var SMART_SOLUTIONS								// name of the test solution.
var EXCLUDES									// list of files to be excluted
var INCLUDES									// all included folder
var FAIL_IF_INSTRUMENTATION_FAIL = false;		// return error if processed file is not instrumented
var VERBOSE = false;

// process and validate the input arguments
var args = process.argv.slice(2);
processInputArgs(args)

log('WORKSPACE_PATH: ' + WORKSPACE_PATH)
log('dir ' + __dirname);
var workspaceFilesJS = []; // the list of js files in workspace
var smart_solution_path;

// 1 get all js files in directory.
getFilesRecursiveSync(TEMP_WORKSPACE, workspaceFilesJS, isFileTypeJavascript);

// 2 edit all js files in directory.
var ticketNumber = workspaceFilesJS.length // Method are async. get ticket to read next file.
var fileToParseSize = workspaceFilesJS.length; // Number of file to be still written.

if (!smart_solution_path) {
	throw new Error('cannot find test solution')
}
var writeStream = fs.createWriteStream(smart_solution_path + '\\istanbul_scope.js', { flags: 'a', encoding: 'utf-8', mode: 0666 })

var endOfFile = '\n/**\n * @properties={typeid:24,uuid:"' + generateUUID() + '"} \n */\nfunction initIstanbul() {application.output("init success")}\n'
var endBuffer = new Buffer(endOfFile)

// write init function in istanbul file
writeStream.write(endBuffer, 'utf-8', function(werr) {
		if (werr) {
			log('ERROR WRITING THE FILE ' + werr);
		}
	});

readWorkspaceJSFileList();

/**
 * log verbose messages
 * */
function log(msg) {
	if (VERBOSE) {
		console.log(msg)
	}
}

/** 
* Process the input arguments
*/
function processInputArgs(args) {
	var mandatoryArgs = 2
	for (var i = 0; i < args.length; i++) {
		if (isArgument(args[i])) {
			switch (args[i]) {
			case '--x':	// exclude
				if (!args[i+1] || isArgument(args[i+1]) || args[i+1] == "${instrument.exclude.modules}") {
					log("WARN: must specify a list of folder names after option --x. Exclude will be ignored")
					break;
				}
				/** @type {String} */
				var excludes = args[i+1].split(',')
				var exclutedFile
				for (var x = 0; x < excludes.length; x++) {
					exclutedFile = excludes[x].trim();
					if (!EXCLUDES) {
						log('init exclude')
						EXCLUDES = {}
					}
					log('exclude ' + exclutedFile)
					EXCLUDES[exclutedFile] = -1
				}
				// utils.stringTrim(textString)
				break;	
			case '--e':	// fail is instrumentation fails
				var value = args[i +1]
				if (value =='true') {
					FAIL_IF_INSTRUMENTATION_FAIL = true
					log('FAIL IF INSTRUMENTATION FAILS ' + FAIL_IF_INSTRUMENTATION_FAIL)
				} else if(value == 'false') {
					FAIL_IF_INSTRUMENTATION_FAIL = false
				} else {
					throw new Error(value +' is not a valid value for argument ' + args[i] + '. value must be true or false ! run node ServoyParser.js --help for help');	
				}
				break;
			case '--i':		// include arguments
				if (!args[i+1] || isArgument(args[i+1]) || args[i+1] == "${instrument.include.modules}") {
					log("WARN: must specify a list of folder names after option --i. Include will be ignored")
					break;
				}
				/** @type {String} */
				var includes = args[i+1].split(',')
				var inclutedFile
				for (var j = 0; j < includes.length; j++) {
					inclutedFile = includes[j].trim();
					if (!INCLUDES) {
					log('init includes')
						INCLUDES = {}
					}
					log('include ' + inclutedFile)
					INCLUDES[inclutedFile] = -1
				}
				break;
			case '--t':		// test solution name
				SMART_SOLUTIONS = args[i+1]
				// TODO concatenate smart solution names from string list
				mandatoryArgs--;
				break;
			case '--d':		// input directory
				WORKSPACE = args[i+1]
				TEMP_WORKSPACE = path.resolve(args[i+2]);
				WORKSPACE_PATH = path.resolve(WORKSPACE);
				mandatoryArgs--;
				break;
			case '--v':	// fail is instrumentation fails
				var value = args[i +1]
				if (value =='true') {
					VERBOSE = true
					log('Verbose logging')
				} else if(value == 'false') {
					VERBOSE = false
				}
				break;
			case '--h' :	//show help menu
				log(HELP)
				process.exit(1)
				break;
			default:
				throw new Error(args[i] +' is not a valid argument !');
				break;
			}
		}
	}
	if (mandatoryArgs!=0) {
		throw new Error('Must specify mandatory arguments --d <output_dir> <input_dir> and --t <test_solution_name>');	
	}
}

/**
 * is string an argument 
 */
function isArgument(arg) {
	if (!arg) {
		return false;
	}
	if(arg.slice(0,2)=='--') {
		return true
	} else {
		return false;
	}
}


/**
 * generate a random UUID. Note There is a possibility of fail.
 */
function generateUUID() {
	var d = new Date().getTime();
	var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = (d + Math.random() * 16) % 16 | 0;
			d = Math.floor(d / 16);
			return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
		});
	return uuid;
}
;

/**
 * read all files in directory.
 */
function getFilesRecursiveSync(dir, fileList, optionalFilterFunction) {
	//log('dir ' + dir + '  resolve ' + path.resolve(dir))
	if (!dir) {
		log("Directory 'dir' is undefined or NULL")
		return;
	}
	if (!fileList) {
		log("Variable 'fileList' is undefined or NULL.");
		return;
	}
	var files = fs.readdirSync(dir);
	for (var i in files) {
		if (!files.hasOwnProperty(i)) {
			continue;
		}
		var filePath = dir + '\\' + files[i];		

		// find the path to the test solution
		if (files[i] == SMART_SOLUTIONS) {
			smart_solution_path = filePath
			smart_solution_path = filePath.replace(TEMP_WORKSPACE, WORKSPACE_PATH)
			log('SMART SOLUTION ' + smart_solution_path)
		}
		if (isFileExcluted(files[i])) { 	// skip the file or folder if is listed in the excluted files
			log('Skipping excluted file: ' + files[i])
			continue;
		}
		if (fs.statSync(filePath).isDirectory()) { 	// search files in directory
			// TODO remove skip test directories ?
			if (filePath.substring(filePath.length - 5, filePath.length) == '_test') { // skip _test directories
				continue;
			}
			// TODO remove jenkinsConfig ?
			if (filePath.substr(filePath.length - 13, filePath.length) == 'JenkinsConfig') { // skip jenkins config
				log(filePath.substr(filePath.length - 13, filePath.length))
				continue;
			}
			if (files[i]=='medias') {	// skip files in medias folder.
				continue;
			}
			getFilesRecursiveSync(filePath, fileList, optionalFilterFunction);
		} else if (fs.statSync(filePath).isFile()) {
			if (optionalFilterFunction && optionalFilterFunction(filePath) !== true) // filter .js files only
				continue;
			if (!isFileIncluted(filePath)) {	// if one of parent directory of file is not in INCLUDED list skip the file
				log('file ' + filePath + ' is not in the incluted list')
				continue;
			}
			fileList.push(filePath); 	// push files into result object
			// log(filePath)
		}
	}
}

/**
 * returns true if the file in the specified path is a javascript file.
 */
function isFileTypeJavascript(path) {
	if (path.substring(path.length - 3, path.length) == ".js") {
		return true
	} else {
		return false
	}
}
/** 
 * returns true if the file or folder is incluted in the list of excluted files given by the argument --x
 */
function isFileExcluted(fileName) {
	if (!EXCLUDES) {
		return false;
	}
	return EXCLUDES.hasOwnProperty(fileName)
}

/** 
 * returns true if the folder is incluted in the list of incluted files given by the argument --i
 */
function isFileIncluted(filePath) {
	if (!INCLUDES) {
		return true
	}
	var paths = filePath.split('\\')
	for (var i = WORKSPACE_PATH.split('\\').length; i < paths.length; i++) {
		if (INCLUDES.hasOwnProperty(paths[i])) {
			return true;
		}
	}
	return false
}

/*
 * process all js files.
 *
 function readWorkspaceJSFileList() {

 for (var i=0; i<workspaceFilesJS.length; i++) {
 var inFilePath = workspaceFilesJS[i];
 var outFilePath = WORKSPACE_PATH + inFilePath.substring(TEMP_WORKSPACE.length);
 log('processing file: ' + outFilePath);

 // TODO bad performance. read all file in once.
 // copy the content into a different file.
 fs.readFile(inFilePath, {flags:"r", encoding: 'utf8', mode: 0666}, function (err, data) {
 if (err) {
 return log(err)
 }
 fs.writeFile(outFilePath, parseData(data), {flags:"w", encoding: 'utf8', mode: 0666}, function (wErr) {
 if(wErr) {
 log('ERROR IN WRITE FILE ' + wErr);
 }
 });
 });
 }
 }
 */

function readWorkspaceJSFileList() {

	ticketNumber -= 1;
	log('ticket ' + ticketNumber)
	if (ticketNumber < 0) {
		// no more file to be processed
		return;
	}
	var inFilePath = workspaceFilesJS.shift();
	if (!inFilePath) {
		throw new Error('Cannot parse file undefined')
	}

	var outFilePath = WORKSPACE_PATH + inFilePath.substring(TEMP_WORKSPACE.length) + '';
	log('processing file: ' + outFilePath);

	// TODO bad performance. read all file in once.
	// copy the content into a different file.
	fs.readFile(inFilePath, { flags: "r", encoding: 'utf8', mode: 0666 }, function(err, data) {
			if (err) {
				throw new Error(err)
				//return log(err)
			}

			// log('read ' + inFilePath)
			var extractedContent, parsedContent;
			var buffer, fileBuffer;

			// 1 parse the file content
			try {
				extractedContent = extractInstrumentedData(data)
				parsedContent = removeInstrumentedData(data)
			} catch (e) {
				if (FAIL_IF_INSTRUMENTATION_FAIL) {
					var errorMsg = 'The JS file ' + inFilePath + ' is not instrumented.'
					throw new Error(errorMsg)
				} else {
					log('Skipping not instrumented JS file ' + inFilePath + '.')
					parsedContent = data;
					extractedContent = "";
				}
			}

			buffer = new Buffer(extractedContent)
			fileBuffer = new Buffer(parsedContent);

			// 2 write the instrumented variables in a scope file.
			writeStream.write(buffer, 'utf-8', function(werr) {
					if (werr) {
						log('ERROR WRITING THE FILE ' + werr);
					}
					// log('write ')
					// the last file being parsed should close the writeStrem
					fileToParseSize -= 1
					if (fileToParseSize == 0) {
						// TODO close file
						log('Close the writeStream')
						//var endOfFile = '\n/**\n * @properties={typeid:35,uuid:"' + generateUUID() + '"} \n */\nfunction initIstanbul() {application.output("init success")}'
						writeStream.end('')
					}
				})

			// 3 write the file in the output directory.
			fs.open(outFilePath, "w", "0666", function(oerr, fd) {
					if (oerr) {
						throw new Error(oerr)
						//log(err);
						//return;
					}
					// log('open ' + outFilePath)
					fs.write(fd, fileBuffer, 0, fileBuffer.length, null, function(werr) {
							if (werr) {
								throw new Error(werr)
								// log('ERROR WRITING THE FILE ' + wErr);
							}
							// log('write ' + outFilePath)
							fs.close(fd, function() {
									// log("completed " + outFilePath)
								})
						});
				});

			//writeStream.end()
			//                              fs.writeFile(fd, parseData(data), {flags:"w", encoding: 'utf8',mode: 0666}, function (wErr) {
			//                                      if(wErr) {
			//                                              log('ERROR IN WRITE FILE ' + wErr);
			//                                      }
			//                              });

			//read next file
			readWorkspaceJSFileList()

		});
}

/**
 * extract the instrumented variables from the file
 */
function extractInstrumentedData(data) {

	if (data.substring(0, 11) == '\nvar __cov_' && data.search('__coverage__') != -1) {
		var index = data.indexOf(".js'];")

		var extractedData = data.slice(0, index + 6)

		var LEFT_CONTENT = "if (!__";
		var RIGHT_CONTENT = ".js'];"
		//extractedData = extractedData.replace(RIGHT_CONTENT, "})();\n" + RIGHT_CONTENT);
		extractedData = '/**\n * @properties={typeid:35,uuid:"' + generateUUID() + '"} \n */' + extractedData;
		var methodID = generateUUID();
		extractedData = extractedData.replace(LEFT_CONTENT, '\n/**\n * @properties={typeid:35,uuid:"' + methodID + '"} \n */\nvar istanbul_init_' + methodID.substring(0, 8) + ' = (function (){ ' + LEFT_CONTENT)
		extractedData = extractedData + "})();\n\n";
		return extractedData
	} else {
		// TODO argument to throw exception when file not instrumented.
		// throw new Error('File not instrumented')
	}
	return ""

}

///**
// * parse the content of the file. Remove the instrumented variables and return the parsed content.
// */
//function removeInstrumentedData(data) {
//
//	if (data.substring(0, 11) == '\nvar __cov_' && data.search('__coverage__') != -1) {
//		var RIGHT_CONTENT = "/*"
//		// remove the instrumented code on top of each file
//		var parsedData = data.substring(data.indexOf(RIGHT_CONTENT), data.length)
//		//parsedData = string.replace(/__cov_/g, 'scopes.istanbul_scope.__cov_')
//		return parsedData
//	} else {
//		// TODO argument to throw exception when file not instrumented.
//		// throw new Error('File not instrumented')
//	}
//	return data;
//}

/**
 * parse the content of the file. Return the parsed content.
 */
function removeInstrumentedData(data) {
	if (data.substring(0, 11) == '\nvar __cov_' && data.search('__coverage__') != -1) {
		var LEFT_CONTENT = "if (!__cov_";
		var RIGHT_CONTENT = ".js'];" //"/*"
		
//		var startIndex = data.indexOf(LEFT_CONTENT)
//		var index = 0; 
//		for (var i=0; i < 4; i++) {
//			index = data.indexOf('.js', index + 1)
//		}
//		var endIndex = data.indexOf(RIGHT_CONTENT)
		
//		var parsedData = data //.substring(0, index + 6)
//		parsedData = parsedData + '\n' + data.substring(endIndex, data.length);
//		parsedData = parsedData.replace(RIGHT_CONTENT, "})();\n" + RIGHT_CONTENT);
//		parsedData = parsedData.replace(LEFT_CONTENT, '\n/**\n * @properties={typeid:35,uuid:"' + generateUUID() + '"} \n */\nvar istanbul_init = (function (){ application.output("running istanbul code"); ' + LEFT_CONTENT)
//		parsedData = '/**\n * @properties={typeid:35,uuid:"' + generateUUID() + '"} \n */' + parsedData;

		//var RIGHT_CONTENT = "/*"
		var parsedData = data;
		parsedData = parsedData.replace(RIGHT_CONTENT,  RIGHT_CONTENT + "})();\n");
		parsedData = '/**\n * @properties={typeid:35,uuid:"' + generateUUID() + '"} \n */' + parsedData;
		// FIXME cannot add same var istanbul_init on multiple .globals file.
		parsedData = parsedData.replace(LEFT_CONTENT, '\n/**\n * @properties={typeid:35,uuid:"' + generateUUID() + '"} \n */\nvar istanbul_init = (function (){ ' + LEFT_CONTENT)
		return parsedData
	} else {
		throw new Error('File not instrumented')
	}
	return data;
}
