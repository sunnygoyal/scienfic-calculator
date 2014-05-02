/*
 * CodePress - Real Time Syntax Highlighting Editor written in JavaScript - http://codepress.org/
 * 
 * Copyright (C) 2007 Fernando M.A.d.S. <fermads@gmail.com>
 *
 * Developers:
 *		Fernando M.A.d.S. <fermads@gmail.com>
 *		Michael Hurni <michael.hurni@gmail.com>
 * Contributors: 	
 *		Martin D. Kirk
 *
 * This program is free software; you can redistribute it and/or modify it under the terms of the 
 * GNU Lesser General Public License as published by the Free Software Foundation.
 * 
 * Read the full licence: http://www.opensource.org/licenses/lgpl-license.php
 */
/*
 * Code Edited to suite Statusbar Scientific Clculator Firefox addon
 * by Sunny Goyal
 */

var chars;
var cc
var editor;
var completeChars;
var completeEndingChars;
 
var CodePress = {
	scrolling : false,

	// set initial vars and start sh
	initialize : function() {
		if(typeof(editor)=='undefined' && !arguments[0]) return;

		chars = '|32|46|62|8|'; // charcodes that trigger syntax highlighting
		cc = '\u2009'; // carret char
		editor = document.getElementsByTagName('pre')[0];

		editor.contentEditable  = true;
		
		document.addEventListener('keypress', this.keyHandler, true);
		window.addEventListener('scroll', function() { if(!CodePress.scrolling) CodePress.syntaxHighlight('scroll') }, false);
		completeChars = this.getCompleteChars();
		completeEndingChars =  this.getCompleteEndingChars();
		
		editor.contentEditable  = false;
	},

	// treat key bindings
	keyHandler : function(evt) {
    	var keyCode = evt.keyCode;	
		var charCode = evt.charCode;
		var fromChar = String.fromCharCode(charCode);

		if((evt.ctrlKey || evt.metaKey) && evt.shiftKey && charCode!=90)  { // shortcuts = ctrl||appleKey+shift+key!=z(undo) 
			CodePress.shortcuts(charCode?charCode:keyCode);
		}
		else if( (completeEndingChars.indexOf('|'+fromChar+'|')!= -1 || completeChars.indexOf('|'+fromChar+'|')!=-1)) { 
			if(!CodePress.completeEnding(fromChar))
			     CodePress.complete(fromChar);
		}
	    else if(chars.indexOf('|'+charCode+'|')!=-1||keyCode==13) { // syntax highlighting
			top.setTimeout(function(){CodePress.syntaxHighlight('generic');},100);
		}
		else if(keyCode==9 || evt.tabKey) {  // snippets activation (tab)
			CodePress.snippets(evt);
		}
		else if(keyCode==46||keyCode==8) { // save to history when delete or backspace pressed
		 	CodePress.actions.history[CodePress.actions.next()] = editor.innerHTML;
		}
		else if((charCode==122||charCode==121||charCode==90) && evt.ctrlKey) { // undo and redo
			(charCode==121||evt.shiftKey) ? CodePress.actions.redo() :  CodePress.actions.undo(); 
			evt.preventDefault();
		}
		else if(charCode==118 && evt.ctrlKey)  { // handle paste
		 	top.setTimeout(function(){CodePress.syntaxHighlight('generic');},100);
		}
		else if(charCode==99 && evt.ctrlKey)  { // handle cut
		 	//alert(window.getSelection().getRangeAt(0).toString().replace(/\t/g,'FFF'));
		}

	},

	// put cursor back to its original position after every parsing
	findString : function() {
		if(self.find(cc))
			window.getSelection().getRangeAt(0).deleteContents();
	},
	
	// split big files, highlighting parts of it
	split : function(code,flag) {
		if(flag=='scroll') {
			this.scrolling = true;
			return code;
		}
		else {
			this.scrolling = false;
			var ini, mid, end;
			mid = code.indexOf(cc);
			if(mid-2000<0) {ini=0;end=4000;}
			else if(mid+2000>code.length) {ini=code.length-4000;end=code.length;}
			else {ini=mid-2000;end=mid+2000;}
			code = code.substring(ini,end);
			return code;
		}
	},
	
	getEditor : function() {
		return document.getElementsByTagName('pre')[0];
	},
	
	// syntax highlighting parser
	syntaxHighlight : function(flag) {
		if(flag != 'init') { window.getSelection().getRangeAt(0).insertNode(document.createTextNode(cc));}
		editor = CodePress.getEditor();
		var x, z;
		var o = editor.innerHTML;
		o = o.replace(/<br>/g,'\n');
		o = o.replace(/<.*?>/g,'');
		x = z = this.split(o,flag);
		x = x.replace(/\n/g,'<br>');

		if(arguments[1]&&arguments[2]) x = x.replace(arguments[1],arguments[2]);
	
		for(var i=0;i<Language.syntax.length;i++) 
			x = x.replace(Language.syntax[i].input,Language.syntax[i].output);

		editor.innerHTML = this.actions.history[this.actions.next()] = (flag=='scroll') ? x : o.split(z).join(x);
		if(flag!='init') this.findString();
	},
	
	getLastWord : function() {
		var rangeAndCaret = CodePress.getRangeAndCaret();
		words = rangeAndCaret[0].substring(rangeAndCaret[1]-40,rangeAndCaret[1]);
		words = words.replace(/[\s\n\r\);\W]/g,'\n').split('\n');
		return words[words.length-1].replace(/[\W]/gi,'').toLowerCase();
	},
	
	snippets : function(evt) {
		var snippets = Language.snippets;	
		var trigger = this.getLastWord();
		for (var i=0; i<snippets.length; i++) {
			if(snippets[i].input == trigger) {
				var content = snippets[i].output.replace(/</g,'&lt;');
				content = content.replace(/>/g,'&gt;');
				if(content.indexOf('$0')<0) content += cc;
				else content = content.replace(/\$0/,cc);
				content = content.replace(/\n/g,'<br>');
				var pattern = new RegExp(trigger+cc,'gi');
				evt.preventDefault(); // prevent the tab key from being added
				this.syntaxHighlight('snippets',pattern,content);
			}
		}
	},
	
	readOnly : function() {
		editor.contentEditable = (arguments[0]) ? true : false;
	},
	
	focus : function(){
		editor.focus();
	},
	
	complete : function(trigger) {
		window.getSelection().getRangeAt(0).deleteContents();
		var complete = Language.complete;
		for (var i=0; i<complete.length; i++) {
			if(complete[i].input == trigger) {
				var pattern = new RegExp('\\'+trigger+cc);
				var content = complete[i].output.replace(/\$0/g,cc);
				parent.setTimeout(function () { CodePress.syntaxHighlight('complete',pattern,content)},0); // wait for char to appear on screen
			}
		}
	},

	getCompleteChars : function() {
		var cChars = '';
		for(var i=0;i<Language.complete.length;i++)
			cChars += '|'+Language.complete[i].input;
		return cChars+'|';
	},
	
	getCompleteEndingChars : function() {
		var cChars = '';
		for(var i=0;i<Language.complete.length;i++)
			cChars += '|'+Language.complete[i].output.charAt(Language.complete[i].output.length-1);
		return cChars+'|';
	},
	
	completeEnding : function(trigger) {
		var range = window.getSelection().getRangeAt(0);
		try {
			range.setEnd(range.endContainer, range.endOffset+1)
		}
		catch(e) {
			return false;
		}
		var next_character = range.toString()
		range.setEnd(range.endContainer, range.endOffset-1)
		if(next_character != trigger) return false;
		else {
			range.setEnd(range.endContainer, range.endOffset+1)
			range.deleteContents();
			return true;
		}
	},
	
	shortcuts : function() {
		var cCode = arguments[0];
		if(cCode==13) cCode = '[enter]';
		else if(cCode==32) cCode = '[space]';
		else cCode = '['+String.fromCharCode(charCode).toLowerCase()+']';
		for(var i=0;i<Language.shortcuts.length;i++)
			if(Language.shortcuts[i].input == cCode)
				this.insertCode(Language.shortcuts[i].output,false);
	},
	
	getRangeAndCaret : function() {	
		var range = window.getSelection().getRangeAt(0);
		var range2 = range.cloneRange();
		var node = range.endContainer;			
		var caret = range.endOffset;
		range2.selectNode(node);	
		return [range2.toString(),caret];
	},
	
	insertCode : function(code,replaceCursorBefore) {
		var range = window.getSelection().getRangeAt(0);
		var node = window.document.createTextNode(code);
		var selct = window.getSelection();
		var range2 = range.cloneRange();
		// Insert text at cursor position
		selct.removeAllRanges();
		range.deleteContents();
		range.insertNode(node);
		// Move the cursor to the end of text
		range2.selectNode(node);		
		range2.collapse(replaceCursorBefore);
		selct.removeAllRanges();
		selct.addRange(range2);
	},
	
	// get code from editor
	getCode : function() {
		if(!document.getElementsByTagName('pre')[0] || editor.innerHTML == '')
			editor = CodePress.getEditor();
		var code = editor.innerHTML;
		code = code.replace(/<br>/g,'\n');
		code = code.replace(/\u2009/g,'');
		code = code.replace(/<.*?>/g,'');
		code = code.replace(/&lt;/g,'<');
		code = code.replace(/&gt;/g,'>');
		code = code.replace(/&amp;/gi,'&');
		return code;
	},

	// put code inside editor
	setCode : function() {
		var code = arguments[0];
		code = code.replace(/\u2009/gi,'');
		code = code.replace(/&/gi,'&amp;');
		code = code.replace(/</g,'&lt;');
		code = code.replace(/>/g,'&gt;');
		editor.innerHTML = code;
	},
	
	//Set function Title
	setLabel : function(lbl){
		document.getElementById("codeT").innerHTML = lbl+ (lbl==""?"":"{");;
		document.getElementById("codeE").innerHTML = (lbl==""?"":"}");
	},

	// undo and redo methods
	actions : {
		pos : -1, // actual history position
		history : [], // history vector
		
		undo : function() {
			editor = CodePress.getEditor();
			if(editor.innerHTML.indexOf(cc)==-1){
				if(editor.innerHTML != " ")
					window.getSelection().getRangeAt(0).insertNode(document.createTextNode(cc));
				this.history[this.pos] = editor.innerHTML;
			}
			this.pos --;
			if(typeof(this.history[this.pos])=='undefined') this.pos ++;
			editor.innerHTML = this.history[this.pos];
			if(editor.innerHTML.indexOf(cc)>-1) editor.innerHTML+=cc;
			CodePress.findString();
		},
		
		redo : function() {
			// editor = CodePress.getEditor();
			this.pos++;
			if(typeof(this.history[this.pos])=='undefined') this.pos--;
			editor.innerHTML = this.history[this.pos];
			CodePress.findString();
		},
		
		next : function() { // get next vector position and clean old ones
			if(this.pos>20) this.history[this.pos-21] = undefined;
			return ++this.pos;
		}
	}
}

var Language={};
// JavaScript
Language.syntax = [ 
	{ input : /\"(.*?)(\"|<br>|<\/P>)/g, output : '<s>"$1$2</s>' }, // strings double quote
	{ input : /\'(.*?)(\'|<br>|<\/P>)/g, output : '<s>\'$1$2</s>' }, // strings single quote
	{ input : /\b(break|continue|do|for|new|this|void|case|default|else|function|return|typeof|while|if|label|switch|var|with|catch|boolean|int|try|false|throws|null|true|goto)\b/g, output : '<b>$1</b>' }, // reserved words
	{ input : /\b(alert|isNaN|parent|Array|parseFloat|parseInt|blur|clearTimeout|prompt|prototype|close|confirm|length|Date|location|Math|document|element|name|self|elements|setTimeout|navigator|status|String|escape|Number|submit|eval|Object|event|onblur|focus|onerror|onfocus|onclick|top|onload|toString|onunload|unescape|open|valueOf|window|onmouseover)\b/g, output : '<u>$1</u>' }, // special words
	{ input : /([^:]|^)\/\/(.*?)(<br|<\/P)/g, output : '$1<i>//$2</i>$3' }, // comments //
	{ input : /\/\*(.*?)\*\//g, output : '<i>/*$1*/</i>' } // comments /* */
]

Language.snippets = [
	{ input : 'dw', output : 'document.write(\'$0\');' },
	{ input : 'getid', output : 'document.getElementById(\'$0\')' },
	{ input : 'fun', output : 'function $0(){\n\t\n}' },
	{ input : 'func', output : 'function $0(){\n\t\n}' }
]

Language.complete = [
	{ input : '\'',output : '\'$0\'' },
	{ input : '"', output : '"$0"' },
	{ input : '(', output : '\($0\)' },
	{ input : '[', output : '\[$0\]' },
	{ input : '{', output : '{\n\t$0\n}' }		
]

Language.shortcuts = []




window.addEventListener('load', function() { CodePress.initialize('new'); }, true);
window.addEventListener('focus', CodePress.focus, true);

{
	var str = window.location.toString();
	if (str.indexOf("?") > -1){
		var id = parseInt(str.substr(str.indexOf("?") + 1));
	}
	
	window.parent.codeEditors[id] = CodePress;
}

