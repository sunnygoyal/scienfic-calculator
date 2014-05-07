var codeEditors = new Array();
var codeEditorCount = 0;

var CodeEditor = function(frame){
	this.index = codeEditorCount;
	this.frame = document.getElementById(frame)
	this.frame.setAttribute("src","editor/codemirror.html?"+codeEditorCount);
	codeEditorCount++;
}
CodeEditor.prototype.setCode = function(code) {
	if(codeEditors[this.index]) {
		codeEditors[this.index].setCode(code);
	}
}
CodeEditor.prototype.getCode = function() {
	if(codeEditors[this.index]) 
		return codeEditors[this.index].getCode();
	else 
		return "";
}
CodeEditor.prototype.setDisable = function(d) {
	if (d) {
		this.frame.setAttribute("disabled", "true");
	} else {
		this.frame.removeAttribute("disabled");
	}
	if(codeEditors[this.index]) codeEditors[this.index].setDisable(d);
}
CodeEditor.prototype.setLabel = function(lbl) {
	if(codeEditors[this.index]) codeEditors[this.index].setLabel(lbl);
}
CodeEditor.prototype.focus = function() {
	this.frame.focus();
	if(codeEditors[this.index]) codeEditors[this.index].focus();
}