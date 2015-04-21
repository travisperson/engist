
var flattenObject = module.exports.flattenObject = function(ob) {
	var toReturn = {};
	
	for (var i in ob) {
		if (!ob.hasOwnProperty(i)) continue;
		
		if ((typeof ob[i]) == 'object') {
			var flatObject = flattenObject(ob[i])
			for (var x in flatObject) {
				if (!flatObject.hasOwnProperty(x)) continue
				
				toReturn[i + '.' + x] = flatObject[x]
			}
		} else {
			toReturn[i] = ob[i]
		}
	}
	return toReturn
}

var updateMarkdown = module.exports.updateMarkdown = function(template, obj) {
	var obj = flattenObject(obj)
	var m = template.match(/\{\{[a-zA-Z0-9].+\}\}/g);

	for(var i = 0; i < m.length; i++) {
		var find    = m[i]
		var replace = find.substr(2).substr(0, find.length - 4)
		template = template.replace(find, obj[replace])
	}

	return template
}
