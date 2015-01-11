if (!scicalc)
	var scicalc = {};

scicalc.fileIO = (function () {
	var getStorageDir = function () {
		var file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
		file.append("statuscicalc");
		return file;
	};

	//get extensions file path
	var getFilePath = function(filename) {
		var file = getStorageDir();
		file.append(filename);
		return file;
	};

	// remove all text nodes that consist only of whitespace from a DOM tree
	var clean = function(xml) {
		for (var i = 0; i < xml.childNodes.length; i++) {
			var child = xml.childNodes[i];
			if (child.nodeType === 3 && !/\S/.test(child.nodeValue)) {
				xml.removeChild(child);
				i--;
			}
			else if (child.nodeType === 1) {
				clean(child);
			}
		}
	};

	var indent = function(xml) {
		for (var i = 0; i < xml.children.length; i++) {
			xml.insertBefore(document.createTextNode("\n\t"), xml.children[i]);
		}
		xml.appendChild(document.createTextNode("\n"));
	};

	return {
	saveXML : function(xml, filename) {
		var maindir = getStorageDir();
		if (!maindir.exists() || !maindir.isDirectory())
			maindir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);
		
		var serializer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"]
		                           .createInstance(Components.interfaces.nsIDOMSerializer);
		var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
		                         .createInstance(Components.interfaces.nsIFileOutputStream);

		foStream.init(getFilePath(filename), 0x02 | 0x08 | 0x20, 0664, 0);
		indent(xml.firstChild);
		serializer.serializeToStream(xml, foStream, "");
		foStream.close();
	},
	
	getXML : function(fileName) {
		var url;
		var file = getFilePath(fileName);
		if (file.exists()) {
			var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
			var URL = ios.newFileURI(file);
			url = URL.spec;
		} else {
			url = "chrome://statusscicalc/content/data/" + fileName;
		}

		var req = new XMLHttpRequest();
		req.open("GET", url, false);
		req.send(null);
		var xml = req.responseXML;
		clean(xml);
		return xml;
	}
	};
})();


scicalc.f = {
  create : function(code, argCount, shift) {
    if (shift == undefined) shift = 0;

    var params = [];
    for (var j = 0; j < argCount; j++) {
      params.push((10+j+shift).toString(36).toLowerCase());
    }
    params.push(code);
    return Function.apply(null, params);
  },

  compute : function(code) {
    return this.create("return " + code, 0)();
  }
};