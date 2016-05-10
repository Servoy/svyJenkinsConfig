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

//TODO does an error fail the job?
//TODO where are console.log statements ending up?

var fs = require('fs');
var request = require('request')
var path = require('path')

var args = process.argv.slice(2)
if(args.length !== 4) {
	throw new Error('ServoySolutionImport requires the Admin page URL, filename (of the file to import), username and password (to log into the Servoy Admin page) as arguments')
}

const ADMIN_PAGE_URL = args[0] + '/servoy-admin/solutions/import'
const IMPORT_FILE = path.resolve(args[1])
const USER_NAME = args[2]
const PASSWORD = args[3]

const formData = {
  if: fs.createReadStream(IMPORT_FILE),	  					// Pass File to Import
  ac: 1, 													// Activate Release
  os: 1,													// Overwrite Styles
  og: 1,													// Overwrite Group Security
  ak: 1,													// Allow keywords
  dm: 1,													// Allow data model changes
  dmc: 1,													// Display data model changes
  id: 1,													// Import i18n
  submit: 'Import!'											// Submit form
}

request.post({
		url: ADMIN_PAGE_URL, 
		formData: formData
	}, function callback(err, httpResponse, body) {
		if (err) {
			return console.error('Solution Upload failed: ', err);
		} else {
			var exp = /(?:<font color=".*">\[(.*)\]\<\/font><td>)(?!<)(.*)/g
			var ar;
			while ((ar = exp.exec(body)) !== null) {
				console.log(ar[1] + ' - ' + ar[2]);
			}
			
			if (!/<td>Solution .*.servoy succesfully imported in \d*.\d seconds/.test(body)) {
				throw 'Import failed. See log for details'
			}
			
		}
}).auth(USER_NAME, PASSWORD, false)