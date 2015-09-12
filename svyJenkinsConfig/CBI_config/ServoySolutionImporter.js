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