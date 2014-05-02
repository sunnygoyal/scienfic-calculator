if(!scicalc) var scicalc={};

Components.utils.import("resource:///modules/CustomizableUI.jsm");

scicalc.str = Components.classes["@mozilla.org/intl/stringbundle;1"]
			.getService(Components.interfaces.nsIStringBundleService)
			.createBundle("chrome://statusscicalc/locale/scicalc.properties")
			.GetStringFromName;

scicalc.invalidExpError = {desc: scicalc.str("expError")};

const WIDGET_ID = "scicalc-container";

scicalc.main = (function(){
  var evalClass = 'real';
  var askPop,infoPop,errorPop;

  var expBox = null;
  var calcIcon;

  var historyBox = null;
  var historyLength = 10;
  var historyDoc = null;
  var calcPanel;
  
  /***************** Private Method ***************/
  var ebd = function(id){
	return document.getElementById(id);
  };

  var init = function() {
	if (expBox != null) {
	  return;
	}
	askPop = ebd("scicalc-askmode");
	infoPop = ebd("scicalc-info");
	errorPop = ebd("scicalc-error");
	expBox = ebd("scicalc-input");
	calcIcon = ebd("scicalc-icon");
	calcPanel = ebd(WIDGET_ID);

	historyBox = ebd("scicalc-historyBox");
	historyBox.onmousemove =  historyMouseMove;
	historyBox.onmouseup =  historyMouseUp;
	historyBox.onkeydown =  historyKeyDown;
	
	var mode = scicalc.main.prefManager.getIntPref("defaultMode");
	var modeId;
	switch(mode){
		case 1: modeId = 'complex'; break;
		case 2: modeId = 'bin'; break;
		case 10: modeId = 'dec'; break;
		case 16: modeId = 'hex'; break;
		default: modeId = 'ask';		
	}

	scicalc.main.changeMode(modeId, mode);
	
	historyLength = scicalc.main.prefManager.getIntPref("history");
	scicalc.main.changeAngle(scicalc.main.prefManager.getBoolPref("defaultRadian"));
	
	scicalc.realMath.useModulo = scicalc.main.prefManager.getBoolPref("useModulo");
	scicalc.realMath.ignoreComma = scicalc.main.prefManager.getIntPref("ignorecomma");
  };

  var error = function(){
	calcIcon.setAttribute("error", false);
	window.setTimeout(function() {
	  calcIcon.setAttribute("error", true);
	},50);
  };

  var showError = function(err){
	  ebd("scicalc-errordesc").value = err;
	  errorPop.openPopup(calcIcon, "before_start");
  };

  /************** History Methods ****************/
  var addHistoryEl = function(exp,val){
	  var a = document.createElement("listitem");
	  var b = document.createElement("listcell");
	  b.setAttribute("label",exp);
	  var c = document.createElement("listcell");
	  c.setAttribute("label",val);
	  a.appendChild(b);
	  a.appendChild(c);
	  historyBox.appendChild(a);
  };
	
  var initHistory = function() {
	historyDoc = scicalc.fileIO.getXML("history.xml");
	var hnodes = historyDoc.firstChild.childNodes;
	var n = historyLength;
	if(hnodes.length == 0) n=0;
	if(hnodes.length < n) n = hnodes.length;
	if(n > 0) {
	  var shift = hnodes.length-n;
	  for(var i=0;i<n;i++)
		addHistoryEl(hnodes[i+shift].getAttribute("ques"), hnodes[i+shift].getAttribute("ans"));
	};
	historyBox.setAttribute('rows', n);
  };
	
  var historyLastMoved = Date.now();
  var historyMouseMove = function(event){
	if (Date.now() - historyLastMoved > 30) {
	  var item = event.target;
	  while (item && item.localName != "listitem")
		  item = item.parentNode;
	  if (!item) return;

	  var rc = this.getIndexOfItem(item);
	  if (rc != this.selectedIndex)
		  this.selectedIndex = rc;

	  historyLastMoved = Date.now();
	}
  };
  var historyMouseUp = function(event) {
	// don't call onPopupClick for the scrollbar buttons, thumb, slider, etc.
	var item = event.originalTarget;

	while (item && item.localName != "listitem")
		item = item.parentNode;

	if (!item) return;
	historyAccept(item);
  };
  var historyKeyDown = function(event){
	if(event.which == 13){ //  hit Enter
	  historyAccept(historyBox.selectedItem);
	  return false;
	}
	return true;
  };
  var historyAccept = function(item){
	if (!item) return;
	expBox.value = item.firstChild.getAttribute('label');
	infoPop.hidePopup();
	scicalc.main.setFocus();
  };

  var showHistoryPopup = function(){
	var getStr;
	var clas;
	if(evalClass == 'real'){
	  clas = scicalc.realMath;
	  if(clas.mode==10){
		getStr = function(i){ return i };
	  } else{
		getStr = function(i){ return i.toString(clas.mode).toUpperCase(); };
	  }
	} else {
	  clas = scicalc.complexMath;
	  getStr = function(i){ return i.toString(); };
	}

	var vlist = "ans="+getStr(clas.ans);
	for ( var i=0;i<clas.variables.length;i++ ){
	  vlist += " ,  ";
	  if(clas.variables[i] != 'ans')
		vlist += clas.variables[i] + "=" + getStr(clas.values[i]);
	}
	var vlistHolder = ebd("scicalc-vlist");
	if(vlist == "")
	  vlistHolder.hidden = true;
	else {
	  vlistHolder.removeAttribute("hidden");
	  vlistHolder.value = vlist;
	}

	infoPop.openPopup(calcPanel,"before_start");
  };

  /************** Public Methods *****************/
  return {
	prefManager : null,
	onLoad : function() {		
	  //set preference manaegr
	  scicalc.main.prefManager = Components.classes["@mozilla.org/preferences-service;1"]
		  .getService(Components.interfaces.nsIPrefBranch)
		  .getBranch("extensions.ststusscicalc.");

	  scicalc.main.prefManager.QueryInterface(Components.interfaces.nsIPrefBranch2);
	  scicalc.main.prefManager.addObserver("",scicalc.main, false);
	  
	  init();
	  scicalc.realMath.setUserData();
	  initHistory();
	},

	observe: function(subject, topic, prefName) {
	  if (topic != "nsPref:changed") return;
	  var pf = scicalc.main.prefManager;
	  switch(prefName){
		case "useModulo":
		  scicalc.realMath.useModulo = pf.getBoolPref("useModulo");
		  break;
		case "history":
		  historyLength = pf.getIntPref("history");
		  break;
		case "ignorecomma":
		  scicalc.realMath.ignoreComma = pf.getIntPref("ignorecomma");
		  break;
	  }
	},

	onUnLoad : function() {
		if(scicalc.main.prefManager!=null)
			scicalc.main.prefManager.removeObserver("" , scicalc.main);
	},
	
	doType : function(e) {          //  when something is typed
		init();
		errorPop.hidePopup();
		if (!e.which)
			return true;
		if(e.which == 13) { //  hit Enter
		  var exp = expBox.value;
		  scicalc.main.historyFlag = false;
		  var result;
		  try {
		  	result = (evalClass == "real") ? scicalc.realMath.eval(exp) : scicalc.complexMath.eval(exp);
		  	expBox.value = result;
		  	scicalc.main.setFocus();
		  } catch (e) {
		  	error();
		  	if(e.desc && typeof(e.desc)=="string") showError(e.desc);
		  	else if (e.name.toLowerCase() == "syntaxerror")
			  showError(scicalc.invalidExpError.desc);
		  }
		  return false;
		} else if (e.which == 34) { //  hit page down
			this.showAskPopup();
		} else if (e.which==40 || e.which==38) {
			showHistoryPopup();
			return false;
		}
		return true;
	},

	imgClicked : function(){
	  init();
	  ebd('scicalc_mode_popup').showPopup (calcIcon,-1,-1,"popup","topleft","bottomleft");
	},

	setFocus : function(id) {
		init();
		var t = id==undefined ? expBox : ebd(id);
		t.focus();
		try{
			t.editor.selectAll();
		} catch(e){ }
	},
	
	onWidgetAdded: function(widgetId, area, aPosition) {
	  if (widgetId == WIDGET_ID) {
		init();
	  }
	},

	openCalc : function() {
	  if (CustomizableUI) {
		var pos = CustomizableUI.getPlacementOfWidget(WIDGET_ID);
		if (pos == null) {
		  // widget not added
		  return;
		} else if (pos.area == "nav-bar") {
		  this.setFocus();
		} else {
		  // Panel UI
		  PanelUI.show();
		  window.setTimeout(function() {
			scicalc.main.setFocus();
		  }, 200)
		}
	  } else {
		this.setFocus();
	  }
	},

	changeMode : function(nid,mode) {
	  if(nid=="ask") ebd("scicalc_mode_ask").label="Base ("+mode+")...";
	  
	  if ((mode<1) || (mode>24)) mode = 10;
	  ebd("scicalc_mode_" + nid).setAttribute("checked", "true");
		
	  var updateExp = function(mode, exp) {
  		if (mode == 1)
		  return (evalClass=="complex") ? exp : "";
			
		if (evalClass == "complex") 
		  return "";

		if (scicalc.realMath.mode == mode) return exp;
			
		var reg = new RegExp("[\\-\\+]?[" + scicalc.Strings.getRegxSeries(scicalc.realMath.mode) + "\\.]+");
		var m = reg.exec(exp);
			
		if ((m == null) || (m[0] != exp))
		  return "error";
			
		var result,pre;
		if ((exp.charAt(0) == "-") || (exp.charAt(0) == "+")){
		  pre = exp.charAt(0);
		  result = scicalc.realMath.converttodec(exp.substr(1));
		} else {
		  pre = "";
		  result = scicalc.realMath.converttodec(exp);
		}
	    return (pre + result.toString(mode).toUpperCase());
	  }

	  if (expBox) {
		expBox.value = expBox.value.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
		if (expBox.value != "") {
		  var ret = updateExp(mode,expBox.value);
		  if (ret == "error")
			error();
		  else
			expBox.value = ret;
		}
	  }

	  if (mode == 1)
		evalClass = "complex";
	  else{
		evalClass = "real";
		scicalc.realMath.mode = mode;
	  }
	},
		
	changeAngle : function(isRadian) {
	  if (isRadian){
		scicalc.realMath.trigoBase = "Math";
		ebd("scicalc_angle_rad").setAttribute("checked", "true");
	  } else {
		scicalc.realMath.trigoBase = "scicalc.realMath";
		ebd("scicalc_angle_deg").setAttribute("checked", "true");
	  }
	},

	openOptions : function() {
		window.openDialog("chrome://statusscicalc/content/options.xul","omanager",
						  "chrome, modal=yes, toolbar");
		scicalc.realMath.setUserData();
	},

	showAskPopup :function() {
	  var modeAsk = ebd("scicalc_mode_ask");
	  var textbox = ebd("scicalc-modeaskpopup-value");
	  textbox.value = modeAsk.label.substring(modeAsk.label.indexOf("(")+1,modeAsk.label.indexOf(")"));
	  askPop.openPopup(calcIcon,"before_start");
	},

	hideAskPopup :function() {
	  askPop.hidePopup();
	},
	
	acceptAskPopup :function() {
	  var val = ebd("scicalc-modeaskpopup-value").value.toLowerCase();
	  var ret = -1;
	  if (val == "b")	ret = 2;
	  else if (val == "d") ret = 10;
	  else if (val == "h") ret = 16;
	  else{
		var x = Math.floor(parseInt(val));
		if(x.toString() == val)
		if((x>=2) && (x<=24)) ret = x;
	  }
	  if(ret == -1) return;
	  this.changeMode('ask',ret);
	  this.setFocus(); 
	  this.hideAskPopup();
	},
	
	addHistory : function(ques, ans) {
	  addHistoryEl(ques,ans);
	  var popChildren = historyBox.childNodes;
	  while (popChildren.length>(historyLength+1))
		historyBox.removeChild(popChildren[1]);

	  historyBox.setAttribute('rows', popChildren.length-1);
  
	  var entry = historyDoc.createElement("calc");
	  entry.setAttribute("ques", ques);
	  entry.setAttribute("ans", ans);
	  
	  var docf =historyDoc.firstChild;
	  docf.appendChild(entry);

	  while(docf.childNodes.length>2*historyLength)
		docf.removeChild(docf.childNodes[0]);
	  scicalc.fileIO.saveXML(historyDoc,"history.xml");
	}
}
})();

window.addEventListener("load", scicalc.main.onLoad, false);
window.addEventListener("unload", scicalc.main.onUnLoad, false);
CustomizableUI.addListener(scicalc.main);