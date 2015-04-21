#!/usr/bin/env node
var program = require('commander')
var Github = require('github')
var Git = require('gift')
var Promise = require("bluebird")
var updateMarkdown = require('./lib/utils').updateMarkdown
var fs = require('fs')
var readlineSync = require('readline-sync');
var mkpath = require('mkpath');
var path = require('path')
var package = require('./package.json')

var configPath = process.env['HOME']
var authPath
var templatePath

program
	.version(package.version)
	.usage('[options] <name>')
	.option('-p, --private', 'Create a private gist')
	.option('-d, --desc', 'Set a description')
	.parse(process.argv)

var template = [
	"#{{name}}",
	"{{description}}",
	"",
	"---",
	"{{html_url}}  ",
	"Created on `{{created_at}}`"
].join('\n');

if(!fs.existsSync(process.env['HOME'] + '/.config/engist')) {
	var answer = readlineSync.question('Would you like to setup engist now [Y/n]?');
	console.log("")
	if(answer != 'n') {
		var path = process.env['HOME'] + '/.config/engist';
		console.log(" - Creating directory '%'", path);
		mkpath.sync(path);

		console.log(" - Creating auth.json");
		fs.writeFileSync(path + '/auth.json', JSON.stringify({
			type: 'oauth',
			token: ''
		}, null, '  '))

		console.log(" - Creating template.md");
		fs.writeFileSync(path + '/template.md', template)

		console.log("")
		console.log("Before you can use engist you must setup your auth.");

		console.log("")
		console.log("Engist supports the following auth schemas, just update")
		console.log("%s to which ever you choose", path + '/auth.json');
		console.log("You can setup oauth2 from github: https://github.com/settings/applications");
		
		var basic = {
			type: "basic",
			username: "octocat",
			password: "kittens"
		}

		var oauth = {
			type: "oauth",
			token: "token",
		}

		var oauth_secret = {
			type: "oauth",
			key: "clientID",
			secret: "clientSecret"
		}

		console.log("")
		console.log("Basic")
		console.log(JSON.stringify(basic, null, '  '))
		console.log("")
		console.log("OAuth2")
		console.log(JSON.stringify(oauth, null, '  '))
		console.log("")
		console.log("OAuth2 Key/Secret")
		console.log(JSON.stringify(oauth_secret, null, '  '))
		console.log("")
		console.log("")
		console.log("You can also configure the default template for the README.md, which ")
		console.log("is located at '%s'", path + '/template.md')

	}

	return;
}

if(program.args.length == 0) {
	console.error('No name given!')
	process.exit(1);
}

program.name = program.args[0];

if (fs.existsSync(program.name)) {
	var contents = fs.readdirSync(program.name)
	if(contents.length > 0) {
		console.error("fatal: destination path '%s' already exists and is not an empty directory.", program.name);
		return 1;
	}
}

var github = new Github({
	version: "3.0.0",
})

github.authenticate(
	require(process.env['HOME'] + '/.config/engist/auth.json')
)

var readFile   = Promise.promisify(fs.readFile)
var gistCreate = Promise.promisify(github.gists.create)
var gistEdit   = Promise.promisify(github.gists.edit)
var gitClone   = Promise.promisify(Git.clone)

var gistConfig = {
	description: program.desc || "",
	public: !program.private,
	files: {
		"README.md": {
			"content": "..."
		}
	}
}

var template = readFile(process.env['HOME'] + '/.config/engist/template.md')

Promise.all([
	gistCreate(gistConfig),
	template
]).spread(function(gist, markdown) {
	markdown = markdown.toString('utf-8');

	if(gist.description.length == 0) {
		// strip the description if it's empty
		markdown = markdown.replace('{{description}}\n', '');
	}

	markdown = markdown.replace('{{name}}', program.name);
	markdown = updateMarkdown(markdown, gist)
	

	return gistEdit({
		id: gist.id,
		files: {
			"README.md": {
				"content": markdown
			}
		}
	})
}).then(function(gist) {
	console.log("Your gist is located at: %s", gist.html_url)
	return gitClone("git@gist.github.com:/" + gist.id + ".git", process.cwd() + "/" + program.name)
}).then(function(repo) {
})
.catch(function(err) {
	console.log(err)
})
