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

var fs = require('fs');
var readline = require('readline');
var stream = require('stream');
var path = require('path');
var util = require('util');
var Transform = stream.Transform || require('readable-stream').Transform;

var DIR_TEST_SOLUTION = path.resolve(__dirname, '..\\')
var DIR_REPORT_COVERAGE = 'report_coverage'

var args = process.argv.slice(2);
if (args.length == 1) {
	DIR_REPORT_COVERAGE = path.resolve(args[0])
} 

console.log('Code Coverage Test Solution directory ' + DIR_TEST_SOLUTION)
console.log('Code Coverage Report directory: ' + DIR_REPORT_COVERAGE)

// create a js file having the onCloseMethod.
// attach UUID of onClose to solution_settings.obj
createScopeFile();

/**
 * generate a random UUID. Note There is a possibility of fail.
 */
function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x7|0x8)).toString(16);
    });
    return uuid.toUpperCase();
};

/** 
 * returns true if the file in the specified path is a javascript file.
 */
function isFileTypeJavascript(path) {
	if (path.substring(path.length-3,path.length) == ".js") {
		return true
	} else {
		return false
	}
}

function createScopeFile() {
	var outFilePath = DIR_TEST_SOLUTION + '/__onSolutionClose_test.js';
	var onCloseMethodUUID = generateUUID();
	
	var solutionSettingsFilePath = DIR_TEST_SOLUTION + '/solution_settings.obj'
	
	// create a new scope file the file
	fs.open(outFilePath, "w", "0666", function (err, fd) {
        if (err) {
             console.log(err);
             return;
        }
        console.log('open ' + outFilePath)
		
		var fileContent = wrapOnCloseMethod(onCloseMethodUUID);
		if (!fileContent) {
			return;
		}
        var buffer = new Buffer(fileContent)
		
		// write the file
		fs.write(fd, buffer, 0, buffer.length,null, function (wErr) {
			if(wErr) {
				console.log('ERROR WRITING THE FILE ' + wErr);
			}
			console.log('write ' + outFilePath)
			
			// close the file
			fs.close(fd, function () {
				console.log("completed " + outFilePath)})
		});
	});
	
	// attach the method at the onSolutionClose
	
	// TODO if method exist replace it.
	fs.readFile(solutionSettingsFilePath, {flags:"r", encoding: 'utf8', mode: 0666}, function (err, data) {	
	
		var fileContent = setOnCloseMethod(data, onCloseMethodUUID)
		if (!fileContent) {
			return;
		}
		var buffer = new Buffer(fileContent)
	
		fs.open(solutionSettingsFilePath, "w+", "0666", function (err, fd) {
			if (err) {
				 console.log(err);
				 return;
			}
			console.log('open ' + solutionSettingsFilePath)
			
			// write the file
			fs.write(fd, buffer, 0, buffer.length,null, function (wErr) {
				if(wErr) {
					console.log('ERROR WRITING THE FILE ' + wErr);
				}
				console.log('write ' + solutionSettingsFilePath)
				
				// close the file
				fs.close(fd, function () {
					console.log("completed " + solutionSettingsFilePath)
				})
			});
		});
		
	});
}

function wrapOnCloseMethod(uuid) {
	// var dir = resolveWindowsPath(DIR_REPORT_COVERAGE)
	
	var body = "var log = scopes.svyLogManager.getLogger('bap.jenkins.istanbul');\n\
				var coverageExists = false;\n\
				try {\n\
				\t	if (__coverage__) {\n\
				\t\t		coverageExists = true;\n\
				\t	}\n\
				} catch (e) {\n\
					\tlog.info('__coverage__ is not defined');\n\
				}\n\
				if (coverageExists) {\n\
				\t	var filePath = 'report_coverage\\\\coverage.json';\n\
				\t	var jsFile = plugins.file.createFile(filePath)\n\
				\t	if (!plugins.file.writeTXTFile(jsFile,JSON.stringify(__coverage__),'UTF-8','json')) {\n\
				\t\t		log.error('Cannot write file ' + filePath);\n\
				\t	} else {\n\
				\t\t		log.info('coverage file ' + filePath + ' written with success');\n\
				\t	}\n\
				} \n\
				return true;"

	var wrappedMethod = "/**\n\
* Callback method for when solution is closed, force boolean argument tells if this is a force (not stoppable) close or not.\n\
*\n\
* @param {Boolean} force if false then solution close can be stopped by returning false\n\
*\n\
* @returns {Boolean}\n\
*\n\
* @properties={typeid:24,uuid:\""+ uuid +"\"}\n\
*/\n\
function onSolutionClose(force) {\n\
	" + body + "\n\
} "
						
	return wrappedMethod;
}

function resolveWindowsPath(dir) {
	if(dir.search('\\')==-1) {
		console.log('path resolved ' + dir)
		return dir;
	} else {
		dir = dir.replace('\\','\\' +'\\')
	}
	return resolveWindowsPath(dir)
}

/** 
 * parse the content of the file. Return the parsed content.
 */
function setOnCloseMethod(data, uuid) { 
	var ON_CLOSE_ID = 'onCloseMethodID:'
	
	if (!data) {
		console.log("ERROR: setOnCloseMethod cannot read data")
		return null;
	}
	if (data.search(ON_CLOSE_ID) == -1) {
		data = data + ',\n' + ON_CLOSE_ID + '"' + uuid +'"'
		return data;
	} else {
		console.log('WARNING: include generated json report into an existing onCloseSolution method is not supported yet. The coverage report will not be generated !!')
	}
	return null;
}