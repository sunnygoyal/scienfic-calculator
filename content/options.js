//***************************** Common Functions  *******************************//

function const_checkvalid(editmode){
	var const_list = ebd("const_list");
	for(var i=0;i<const_list.getRowCount();i++){
		if ((editmode == "add") || (i != const_list.selectedIndex)){
			var s1 = ebd("const_name").value;
			var s2 = const_list.getItemAtIndex(i).label;
			if (s1 == s2){
				showblink(7,"const_name");
				ebd("const_name").focus();
				return false;
			}
		}
	}
	
	if(ebd("const_name").value.match(/[^a-z]/g) != null) {
		showblink(7,"const_name");
		ebd("const_name").focus();
		return false;
	}
	if(ebd("const_value").value.match(/[^0-9\.e\-\+]/g) != null) {
		showblink(7,"const_value");
		ebd("const_value").focus();
		return false;
	}
	try {
		if((typeof scicalc.f.compute(ebd("const_value").value)).toLowerCase() != "number") {
			showblink(7,"const_value");
			ebd("const_value").focus();
			return false;
		}
	} catch (e){
		showblink(7,"const_value");
		ebd("const_value").focus();
		return false;
	}
	ebd("const_desc").value = ebd("const_desc").value.replace(/^\s+|\s+$/g, '');
	return true;
}


var func_name_old = "new";
var oper_name_old = "";

function func_checkvalid(editmode){
	var func_list = ebd("func_list");
	var s1 = ebd("func_name").value;
	
	for(var i=0;i<func_list.getRowCount();i++){
		if ((editmode == "add") || (i != func_list.selectedIndex)){
			if (s1 == func_list.getItemAtIndex(i).label){
				showblink(7,"func_name");
				ebd("func_name").focus();
				return false;
			}
		}
	}
	var functions = ["asin", "acos", "atan", "sin", "cos", "tan", "sqrt", "log", "ln", "exp"];
	
	for(var i=0;i<functions.length;i++){
		if (s1 == functions[i]){
			showblink(7,"func_name");
			ebd("func_name").focus();
			return false;
		}
	}

	var arglength = parseInt(ebd("func_args").value);
	try {
		var func = scicalc.f.create(funcEditor.getCode(), arglength);
		
		var args = [];
		for (var i = 0; i < arglength; i++) {
			args[i] = 0;
		}
		var code_test = func.apply(null, args);
		if ( typeof(code_test)=='number' && !isNaN(code_test)){
			return true;
		}
	} catch (e) {
		if(e.desc && typeof(e.desc)=="string") return true;
	}

	showblink(7,"func_code");
	funcEditor.focus();
	return false;
}

function func_name_changed(){
	var t = ebd("func_name").value;
	if(t.match(/[^a-z]/g)!=null || t=="")
		ebd("func_name").value = func_name_old;
	else
		func_name_old = t;
		
	func_update_sig();
}

function func_update_sig(){
	var t = parseInt(ebd("func_args").value);
	var args = "";
	for(var i=0; i<t; i++){
		if (i!=0) args += ', ';
		args += (10+i).toString(16).toLowerCase();
	}
	var sig = "";
	if(ebd("func_name").value != "")
		sig = "function "+ebd("func_name").value+" (" + args + ") {";
	funcEditor.setLabel(sig);
}

function oper_name_changed(){
	var t = ebd("oper_name").value;
	if(t.match(/[^\`\~\@\$\^\&\_\\\|\:\;\?\<\>\-\+\*\/]/g)!=null || t=="")
		ebd("oper_name").value = oper_name_old;
	else
		oper_name_old = t;
	oper_update_sig();
}

function oper_update_sig(){
	var sig = "";
	if(ebd("oper_name").value != "")
		sig = "function /* "+ebd("oper_name").value+" */ (x, y) {";
	operEditor.setLabel(sig);
}

function oper_checkvalid(editmode){
	var oper_list = ebd("oper_list");
	var s1 = ebd("oper_name").value;
	
	for(var i=0;i<oper_list.getRowCount();i++){
		if ((editmode == "add") || (i != oper_list.selectedIndex)){
			if (s1 == oper_list.getItemAtIndex(i).label){
				showblink(7,"oper_name");
				ebd("oper_name").focus();
				return false;
			}
		}
	}
	
	if(s1.match(/[^\`\~\@\$\^\&\_\\\|\:\;\?\<\>\-\+\*\/]/g)!=null || s1==""){
		showblink(7,"oper_name");
		ebd("oper_name").focus();
		return false;
	}

	try {
		var oper = scicalc.f.create(operEditor.getCode(), 2, 23);
		var code_test = oper(0,0);
		if ( typeof(code_test)=='number' && !isNaN(code_test)){
			return true;
		}
	} catch (e) {
		if(e.desc && typeof(e.desc)=="string") return true;
	}

	showblink(7,"oper_code");
	operEditor.focus();
	return false;
}


var funcEditor, operEditor;
var funcHandler, constHandler, operHandler;

function operMoveUp(){
	var t = ebd("oper_list");
	var n = t.selectedIndex;
	if(n>1){
		n--;
		t.insertBefore(t.selectedItem,t.getItemAtIndex(n));
		t.selectedIndex = n;
	}
	operHandler.changed = true;
}

function operMoveDown(){
	var t = ebd("oper_list");
	var n = t.selectedIndex;
	if(n>=1 && n<t.getRowCount()-1){
		n+=2;
		t.insertBefore(t.selectedItem,t.getItemAtIndex(n));
		t.selectedIndex = n-1;
	}
	operHandler.changed = true;
}


//***************************** End of Common Functions ****************************//
function intiValues() {
	var prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

	var dec = prefManager.getIntPref("extensions.ststusscicalc.decimal");
	ebd("roundAllowed").checked = dec > 0;
	ebd("digit_af_dot").value = (dec>0)?dec:10;
	ebd("digit_af_dot").disabled = !(dec>0);
	
	funcEditor = new CodeEditor("func_code");
	operEditor = new CodeEditor("oper_code");
	
	funcHandler = new listControl("func", "function", ["args","desc"], "new", funcEditor);
	funcHandler.checkValid = func_checkvalid;
	funcHandler.after_list_sel = func_update_sig;
	funcHandler.load();
	
	operHandler = new listControl("oper", "operator", ["desc", "asst"], "", operEditor);
	operHandler.checkValid = oper_checkvalid;
	operHandler.after_list_sel = oper_update_sig;
	operHandler.load();

	constHandler = new listControl("const", "constant", ["desc","value"], "new", null);
	constHandler.checkValid = const_checkvalid;
	constHandler.load();
}

function dotDigit(){
	var val;
	var x = ebd("roundAllowed").checked;
	ebd("digit_af_dot").disabled = !x;
	val = x?ebd("digit_af_dot").value:-1;
	ebd("pref-digit").value = val;
}

function options_accept(){
	if(constHandler.accept())
		if(funcHandler.accept())
			if(operHandler.accept())
				return true;
	return false;
}