if (!scicalc)
	var scicalc = {};
if (!scicalc.Strings)
	scicalc.Strings = {};

scicalc.Strings = {

	addBaseToFunctions : function(exp,functions,base) {
		for (var j = 0; j < functions.length; j++) {
			var re = new RegExp( "\\#"+functions[j]+"\\(","g");
			exp = exp.replace(re, base + "." + functions[j] + "(");
		}
		return exp;
	},

	// Adds base with brackets
	addBaseToFunctions2 : function(exp,functions,base) {
		for (var j = 0; j < functions.length; j++) {
			var str2find = "#" + functions[j] + "(";
			var i = exp.indexOf(str2find);
			while (i > -1) {
				var y_index = scicalc.Strings.find_index_right(exp.substr(i+1+functions[j].length));
			
				exp = exp.substr(0,i) + "(" + base + "." + functions[j] + exp.substr(i+1+functions[j].length, y_index) + ")" + exp.substr(i+1+functions[j].length + y_index);
				i = exp.indexOf(str2find);
			}
		}
		return exp;
	},
	
	find_index_right : function (exp) {
		if (exp.indexOf("(") == 0) {
			var count = 1;
			var index = 1;
			while ((count > 0) && (index < exp.length)) {
				if (exp.substr(index,1) == ")")
					count--;
				else if (exp.substr(index,1) == "(")
					count++;
				index++;
			}
			if (count > 0)
				throw scicalc.invalidExpError;
			else
				return index;
		}
		throw scicalc.invalidExpError;
	},

	find_index_left : function(exp) {
		if (exp.lastIndexOf(")") == exp.length-1) {
			var count = 1;
			var index = 1;
			while ((count > 0) && (index < exp.length)) {
				if (exp.substr(exp.length -1 - index,1) == "(")
					count--;
				else if (exp.substr(exp.length -1 - index,1) == ")")
					count++;
				index++;
			}
			if (count > 0)
				throw scicalc.invalidExpError;
			else
				return index;
		}
		throw scicalc.invalidExpError;
	},

	reformOperators : function(exp,functions,identifiers,rightAsst) {
		for (var j = 0; j < identifiers.length; j++) {
			var str2find = ")" + identifiers[j] + "(";
			var i = rightAsst[j] ? exp.lastIndexOf(str2find) : exp.indexOf(str2find);
			while (i > -1) {
				var x_index = scicalc.Strings.find_index_left(exp.substr(0,i+1));
				var y_index = scicalc.Strings.find_index_right(exp.substr(i+1+identifiers[j].length));
			
				exp = exp.substr(0,i + 1 - x_index) + "(" + functions[j] + "(" + exp.substr(i +1- x_index, x_index) + "," + exp.substr(i+1+identifiers[j].length,y_index) + "))" + exp.substr(i+1+identifiers[j].length + y_index);
				i = rightAsst[j] ? exp.lastIndexOf(str2find) : exp.indexOf(str2find);
			}
		}
		return exp;
	},

	getRegxSeries : function(limit) {
		return "0-" + ((limit < 11) ? (limit-1) : ("9A-" + (limit-1).toString(32).toUpperCase()));
	}
};