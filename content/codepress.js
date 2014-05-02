var codeEditors = new Array();
var codeEditorCount = 0;

var CodePress = function(frame){
	this.index = codeEditorCount;
	document.getElementById(frame).setAttribute("src","codepress.html?"+codeEditorCount);
	codeEditorCount++;
}
CodePress.prototype.setCode = function (code){
	if(codeEditors[this.index]) {
		codeEditors[this.index].setCode(code);
		codeEditors[this.index].syntaxHighlight('generic');
	}
}
CodePress.prototype.getCode = function (){
	if(codeEditors[this.index]) 
		return codeEditors[this.index].getCode();
	else 
		return "";
}
CodePress.prototype.setDisable = function (d){
	if(codeEditors[this.index]) codeEditors[this.index].readOnly(!d);
}
CodePress.prototype.setLabel = function (lbl){
	if(codeEditors[this.index]) codeEditors[this.index].setLabel(lbl);
}
CodePress.prototype.focus = function (){
	if(codeEditors[this.index]) codeEditors[this.index].focus();
}