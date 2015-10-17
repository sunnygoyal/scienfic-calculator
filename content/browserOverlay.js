// The global namespace
if (!scicalc)
	var scicalc = {};

try {
	// Used for detecting panel UI related features.
	Components.utils.import("resource:///modules/CustomizableUI.jsm");
} catch (e) {
	// PanelUI not present
	var CustomizableUI = null;
}

// Used for displaying localization strings
scicalc.str = Components.classes["@mozilla.org/intl/stringbundle;1"]
                        .getService(Components.interfaces.nsIStringBundleService)
                        .createBundle("chrome://statusscicalc/locale/scicalc.properties")
                        .GetStringFromName;

scicalc.invalidExpError = {desc: scicalc.str("expError")};


/**
 * The main namespace is used for all UI related controls
 */
scicalc.main = (function() {
	const WIDGET_ID = "scicalc-container";
	const EVAL_CLASS_REAL = "realMath";
	const EVAL_CLASS_COMPLEX = "complexMath";

	const MODES = {
		1: "complex",
		2: "bin",
		10: "dec",
		16: "hex"
	};

	var evalClass = EVAL_CLASS_REAL;

	// Various popups
	var askPop,infoPop,errorPop;

	// Various parameters related to history
	var historyBox = null;
	var historyLength = 10;
	var historyDoc = null;

	/**
	 * shorthand for getting element by id
	 */
	const ebd = function(id) {
		return document.getElementById(id);
	};

	/**
	 * Shorthand for listening and removing popup shown listeners
	 */
	const POPUP_LISTENER = {
		add: function(el, f) {
			el.addEventListener("popupshown", f, false);
		},
		remove: function(el, f) {
			el.removeEventListener("popupshown", f, false);
		}
	};

	/**
	 * Sets focus to an input box and selects all text
	 */
	var setFocus = function(el) {
			el.focus();
			try{
			el.editor.selectAll();
		} catch(e) { }
	};

	/**
	 * Preference manager
	 */
	var prefManager;
	var prefObserver = {
		observe: function(subject, topic, prefName) {
			if (topic != "nsPref:changed") return;

			if (this.handler[prefName]) {
				this.handler[prefName](prefName);
			}
		},

		/**
		 * Various preference handlers.
		 * k should be same as the handler name
		 */
		handler: {
			useModulo: function(k) {
				scicalc.realMath.useModulo = prefManager.getBoolPref(k);
			},
			history: function(k) {
				historyLength = prefManager.getIntPref(k);
			},
			ignorecomma: function(k) {
				scicalc.realMath.ignoreComma = prefManager.getIntPref(k);
			},
			decimal: function(k) {
				scicalc.realMath.decimalPrecision = prefManager.getIntPref(k);
			},
			addonBarWidth: function(k) {
				if (defaultCalculatorUI) {
					defaultCalculatorUI.inputbox.style.width = prefManager.getIntPref(k) + "px";
				}
			},
			addonBarCollapsible: function(k) {
				if (defaultCalculatorUI) {
					if (prefManager.getBoolPref(k)) {
						defaultCalculatorUI.panel.classList.add("collapsible");
					} else {
						defaultCalculatorUI.panel.classList.remove("collapsible");
					}
				}
			},
			accessKey: function(k) {
				scicalc.main.updateAccessKey();
			},
		}
	};

	// The calculator UI corresponding to the toolbar item.
	var defaultCalculatorUI;
	var widgetAddObserver = {
		onWidgetAdded: function(widgetId, area, aPosition) {
			if (widgetId == WIDGET_ID) {
				initiateDefaultUI(true);
			}
		},
		onPanelUIOpened: function() {
			initiateDefaultUI(true);
		}
	};

	/*
	 * Initiates the default calculator UI. Once added, it removes all observers
	 * waiting for UI initialization.
	 */
	var initiateDefaultUI = function(listenersAlreadyAdded) {
		if (defaultCalculatorUI) {
			// Already initialized.
			return;
		}
		var updateListeners = !listenersAlreadyAdded;
		var panel = ebd(WIDGET_ID);
		if (panel) {
			// UI found. initiate the rest.
			defaultCalculatorUI = new CalculatorUI(panel, ebd("scicalc-button"), ebd("scicalc-input"),
			                                              ebd("scicalc-icon"), ebd("scicalc-base"), ebd("scicalc-close"));

			// We need to update listeners if they are already added.
			updateListeners = listenersAlreadyAdded;
		}

		if (updateListeners) {
			if (CustomizableUI) {
				CustomizableUI[panel ? 'removeListener' : 'addListener'](widgetAddObserver);
			} else {
				ebd("navigator-toolbox")[panel ? 'removeEventListener' : 'addEventListener'](
					"aftercustomization", widgetAddObserver.onPanelUIOpened, false);
			}
			var panelUI = ebd("PanelUI-popup");
			if (panelUI) {
				POPUP_LISTENER[panel ? 'remove' : 'add'](panelUI, widgetAddObserver.onPanelUIOpened);
			}
		}
	};

	/**
	 * Addon initialization
	 */
	window.addEventListener("load", function() {
		// install the Scientific Calculator to the toolbar on firstRun
		//    "extensions.ststusscicalc@sunny.install-event-fired" is used
		//    for backwards compatibility with FUEL methods previously used
		var installPref = Components.classes["@mozilla.org/preferences-service;1"]
		                            .getService(Components.interfaces.nsIPrefService)
		                            .getBranch("extensions.ststusscicalc@sunny.");
		if (!installPref.prefHasUserValue("install-event-fired")) {
			install();
			installPref.setBoolPref("install-event-fired", true);
		}

		//set preference manager
		prefManager = Components.classes["@mozilla.org/preferences-service;1"]
		                        .getService(Components.interfaces.nsIPrefService)
		                        .getBranch("extensions.ststusscicalc.");
		prefManager.QueryInterface(Components.interfaces.nsIPrefBranch2);
		prefManager.addObserver("", prefObserver, false);

		// Initiate various preferences
		for (var k in prefObserver.handler) {
			prefObserver.handler[k](k);
		}

		askPop = ebd("scicalc-askmode");
		infoPop = ebd("scicalc-info");
		errorPop = ebd("scicalc-error");

		// Calculation mode
		var mode = prefManager.getIntPref("defaultMode");
		changeModeInternal(MODES[mode] ? MODES[mode] : "ask", mode);

		// Angle: radians or degrees
		scicalc.main.changeAngle(prefManager.getBoolPref("defaultRadian"));

		// Custom user functions
		scicalc.realMath.loadUserData();

		// Initiate history
		historyBox = ebd("scicalc-historyBox");

		historyDoc = scicalc.fileIO.getXML("history.xml");
		var hnodes = historyDoc.firstChild.children;
		var n = historyLength;
		if (hnodes.length == 0) n = 0;
		if (hnodes.length < n) n = hnodes.length;
		if (n > 0) {
			var shift = hnodes.length-n;
			for (var i = 0; i < n; i++)
				addHistoryEl(hnodes[i+shift].getAttribute("ques"), hnodes[i+shift].getAttribute("ans"));
		}
		historyBox.setAttribute('rows', n);

		// initiate default UI
		initiateDefaultUI(false);
	}, false);

	/**
	 * Addon unload
	 */
	window.addEventListener("unload", function() {
		if (prefManager) {
			prefManager.removeObserver("", prefObserver);
		}
		if (CustomizableUI) {
			CustomizableUI.removeListener(widgetAddObserver);
		} else {
			ebd("navigator-toolbox").removeEventListener("aftercustomization", widgetAddObserver.onPanelUIOpened, false);
		}
	}, false);

	// ******************* BEGIN_CODE_FOR_HISTORY_MANAGEMENT
	/**
	 * Selects the history item on white the moise is current entering.
	 */
	var historyElMouseOver = function() {
		historyBox.selectedIndex = historyBox.getIndexOfItem(this);
	};

	/**
	 * Adds a history item at the top of the list, i.e., the second position.
	 */
	var addHistoryEl = function(exp,val) {
		var a = document.createElement("listitem");
		var b = document.createElement("listcell");
		b.setAttribute("label",exp);
		var c = document.createElement("listcell");
		c.setAttribute("label",val);
		a.appendChild(b);
		a.appendChild(c);
		a.addEventListener("mouseenter", historyElMouseOver, false);
		historyBox.insertBefore(a, historyBox.firstChild.nextSibling);
	};

	// ******************* END_CODE_FOR_HISTORY_MANAGEMENT

	/**
	 * Changes the current evaluation mode.
	 *
	 * @param nid, the id of the corresponding menu item, one of: bin, dec, hex, ask or complex
	 * @param mode, the actual base value
	 * @param uihandler the correnponding CalculatorUI to operate on or null.
	 */
	var changeModeInternal = function(nid, mode, uihandler) {
		if (nid == "ask")
			ebd("scicalc_mode_ask").setAttribute("acceltext", mode);

		if ((mode < 1) || (mode > 24))
			mode = 10;
		ebd("scicalc_mode_" + nid).setAttribute("checked", "true");
	
		if (prefManager) {
			prefManager.setIntPref("defaultMode", mode);
		}

		if (uihandler) {
			var updateExp = function(mode, exp) {
				if (mode == 1)
					return (evalClass == EVAL_CLASS_COMPLEX) ? exp : "";
				if (evalClass == EVAL_CLASS_COMPLEX)
					return "";

				if (scicalc.realMath.mode == mode)
					return exp;
	
				var reg = new RegExp("[\\-\\+]?[" + scicalc.Strings.getRegxSeries(scicalc.realMath.mode) + "\\.]+");
				var m = reg.exec(exp);
	
				if ((m == null) || (m[0] != exp))
					return "error";
	
				var result, pre;
				if ((exp.charAt(0) == "-") || (exp.charAt(0) == "+")) {
					pre = exp.charAt(0);
					result = scicalc.realMath.converttodec(exp.substr(1));
				} else {
					pre = "";
					result = scicalc.realMath.converttodec(exp);
				}
				return (pre + result.toString(mode).toUpperCase());
			};

			uihandler.inputbox.value = uihandler.inputbox.value.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
			var ret = uihandler.inputbox.value == "" ? "" : updateExp(mode, uihandler.inputbox.value);
			if (ret == "error")
				uihandler.error();
			else
				uihandler.inputbox.value = ret;

			uihandler.updateBase();
		}

		if (mode == 1)
			evalClass = EVAL_CLASS_COMPLEX;
		else {
			evalClass = EVAL_CLASS_REAL;
			scicalc.realMath.mode = mode;
		}
	};

	/**
	 * An abstraction of the calculator UI. This abstraction allows us to potentially have more that one
	 * calculator active in a browser, for example one calculator in the toolbar and another in
	 * the status bar.
	 */
	function CalculatorUI(panel, button, inputbox, icon, base, closeIcon) {
		this.panel = panel;
		this.button = button;
		this.inputbox = inputbox;
	
		this.icon = icon;
		this.base = base;
		this.closeIcon = closeIcon;

		var that = this;

		prefManager.getBoolPref("addonBarCollapsible") ?
			panel.classList.add("collapsible","collapsed") :
			panel.classList.remove("collapsible","collapsed");
		inputbox.style.width = prefManager.getIntPref("addonBarWidth") + "px";
	
		this.updateBase();

		inputbox.addEventListener("keydown", function(e) {
			errorPop.hidePopup();
			if (!e.which) return;

			if (e.which == 13) { // hit enter (-> evaluate)
				that.evaluate(this);
				e.preventDefault();
			} else if (e.which == 33) { // hit page up  (-> show mode popup)
				that.showModePopup();
			} else if (e.which == 34) { // hit page down  (-> choose base)
				that.showAskPopup();
			} else if (e.which == 40 || e.which == 38) { // hit arrow up/down (-> show history box)
				var key = e.which;
				var popupHandler = function() {
					POPUP_LISTENER.remove(infoPop, popupHandler);
					historyBox.focus();
					historyBox.selectedIndex = (key == 40) ? 0 : (historyBox.itemCount - 1);
				};
				POPUP_LISTENER.add(infoPop, popupHandler);
				that.showHistoryPopup();
				e.preventDefault();
			} else if (e.which == 27) { // hit escape (-> close calculator)
				that.closeCalc();
			}
		}, false);
	
		inputbox.addEventListener("click", function(e) {
			if (e.button == 1) { // middle click (-> show history box)
				var popupHandler = function() {
					POPUP_LISTENER.remove(infoPop, popupHandler);
					historyBox.focus();
				};
				POPUP_LISTENER.add(infoPop, popupHandler);
				that.showHistoryPopup();
			}
		}, false);

		button.addEventListener("click", function(e) {
			if (e.button == 0) { // left click
				scicalc.main.openCalc();
			}
		}, false);

		icon.addEventListener("click", function(e) {
			if (e.button == 0) { // left click
				that.showModePopup();
			}
		}, false);

		closeIcon.addEventListener("click", function(e) {
			if (e.button == 0) { // left click
				that.closeCalc();
			}
		}, false);
	}

	// Evaluates the entered expression
	CalculatorUI.prototype.evaluate = function(that) {
		var exp = that.value;
		var result;

		if (exp == "clear") {
			scicalc[EVAL_CLASS_REAL].variables = [];
			scicalc[EVAL_CLASS_REAL].ans = 0;
			scicalc[EVAL_CLASS_COMPLEX].variables = [];
			scicalc[EVAL_CLASS_COMPLEX].ans = new scicalc.Complex(0);
			scicalc.main.clearHistory();
			result = "";
		} else try {
			result = scicalc[evalClass].compute(exp);
		} catch (e) {
			this.error();
			if (e.desc && typeof(e.desc) == "string")
				this.showError(e.desc);
			else if (e.name.toLowerCase() == "syntaxerror")
				this.showError(scicalc.invalidExpError.desc);
			else
				console.log(e); // unexpected error
		}
		
		if (typeof result != 'undefined')
			that.value = result;
		setFocus(that);
	};

	// Animates the icon to indicate an error.
	CalculatorUI.prototype.error = function() {
		var icon = this.icon;
		icon.setAttribute("error", false);
		window.setTimeout(function() {
			icon.setAttribute("error", true);
		}, 50);
	};
	
	// Shows the error popup containing the error message "err"
	CalculatorUI.prototype.showError = function(err) {
		ebd("scicalc-errordesc").value = err;
		errorPop.openPopup(this.icon, "before_start", 10);
	};

	// Shows the history popup attached to this panel
	CalculatorUI.prototype.showHistoryPopup = function() {
		var getStr;
		var clas = scicalc[evalClass];
		if (evalClass == EVAL_CLASS_REAL) {
			if (clas.mode == 10) {
				getStr = function(i) { return i; };
			} else {
				// prevent really long results > 25 characters which would not fit into the history box anyway and would blow it up
				getStr = function(i) {
					var str = i.toString(clas.mode).toUpperCase();
					if (str.length > 25)
						return str.substr(0,25) + "...";
					else
						return str;
				};
			}
		} else {
			getStr = function(i) { return i.toString(); };
		}

		var vlist = "ans=" + getStr(clas.ans);
		for (var i = 0; i < clas.variables.length; i++) {
			vlist += "; ";
			if (clas.variables[i] != 'ans')
				vlist += clas.variables[i] + "=" + getStr(clas.values[i]);
		}
		var vlistHolder = ebd("scicalc-vlist");
		if (vlist == "")
			vlistHolder.hidden = true;
		else {
			vlistHolder.removeAttribute("hidden");
			vlistHolder.textContent = vlist;
		}

		// Update the key listener to accept the history entry to the
		// current input box.
		var inputbox = this.inputbox;
		historyBox.onkeydown = function(event) {
			if (event.which == 13) { //  hit Enter
				if (historyBox.selectedItem) {
					inputbox.value = historyBox.selectedItem.firstChild.getAttribute('label');
					infoPop.hidePopup();
					setFocus(inputbox);
				}
			} else if ((event.which == 38) && (historyBox.selectedIndex == 0)) {
				historyBox.selectedIndex = historyBox.itemCount - 1;
			} else if ((event.which == 40) && (historyBox.selectedIndex == (historyBox.itemCount - 1))) {
				historyBox.selectedIndex = 0;
			} else {
				return true;
			}
			return false;
		};
		historyBox.onclick = function(event) {
			if (historyBox.selectedItem) {
				inputbox.value = historyBox.selectedItem.firstChild.getAttribute('label');
				infoPop.hidePopup();
				setFocus(inputbox);
			}
		};

		infoPop.openPopup(this.panel,"before_start");
	};

	CalculatorUI.prototype.showModePopup = function() {
		defaultCalculatorUI = this;
		ebd('scicalc_mode_popup').showPopup(this.icon,-1,-1,"popup","topleft","bottomleft");
	};

	CalculatorUI.prototype.showAskPopup = function() {
		var modeAsk = ebd("scicalc_mode_ask");
		var textbox = ebd("scicalc-modeaskpopup-value");
		textbox.value = modeAsk.getAttribute("acceltext");
		askPop.openPopup(this.icon, "before_start", 10);
	};

	CalculatorUI.prototype.updateBase = function() {
		var base = this.base;
		mode = prefManager.getIntPref("defaultMode");
		switch (mode) {
			case  1: base.value = "ⅈ"; break;
			case 10: base.value = ""; break;
			default: base.value = mode;
		}
	};

	CalculatorUI.prototype.closeCalc = function() {
		if (prefManager.getBoolPref("addonBarCollapsible")) {
			this.panel.classList.add("collapsed");
		}
		this.inputbox.blur();
		window.content.focus();
	};

	/**
	 * Code that is run on firstRun of the add-on ("add-on installation")
	 */
	var install = function() {
		// add toolbar item
		if (!document.getElementById("scicalc-container")) {
			// if the PanelUI is present add calculator panel there, otherwise use addon-bar
			if (CustomizableUI) {
				CustomizableUI.addWidgetToArea("scicalc-container", "PanelUI-contents", 0);
			} else {
				var toolbar = document.getElementById("addon-bar");
				if (toolbar) {
					toolbar.insertItem("scicalc-container", null);
					toolbar.setAttribute("currentset", toolbar.currentSet);
					document.persist(toolbar.id, "currentset");
					toolbar.collapsed = false; // make sure toolbar is visible
					document.persist(toolbar.id, "collapsed");
				}
			}
			initiateDefaultUI(true); // necessary on older Firefox versions
			                         // (possibly because of the asynchronous behavior of the firstRun detection...)
		}
	};

	/************** Public Methods *****************/
	return {
		setFocusEl : function(id) {
			setFocus(ebd(id));
		},

		onWidgetAdded : function(widgetId, area, aPosition) {
			if (widgetId == WIDGET_ID) {
				init();
			}
		},

		openCalc : function() {
			// PanelUI
			if (CustomizableUI) {
				var pos = CustomizableUI.getPlacementOfWidget(WIDGET_ID);
				if (pos.area == "PanelUI-contents") {
					var panelUI = ebd("PanelUI-popup");
					if (panelUI && PanelUI) {
						var showHandler = function() {
							if (defaultCalculatorUI) {
								setFocus(defaultCalculatorUI.inputbox);
							}
							POPUP_LISTENER.remove(panelUI, showHandler);
						};
						POPUP_LISTENER.add(panelUI, showHandler);
						PanelUI.show();
						return;
					}
				}
			}
			// any other toolbar
			if (defaultCalculatorUI) {
				defaultCalculatorUI.panel.classList.remove("collapsed");
				setFocus(defaultCalculatorUI.inputbox);
				return;
			}
		},

		changeAngle : function(isRadian) {
			if (isRadian) {
				scicalc.realMath.trigoBase = "Math";
				ebd("scicalc_angle_rad").setAttribute("checked", "true");
			} else {
				scicalc.realMath.trigoBase = "scicalc.realMath";
				ebd("scicalc_angle_deg").setAttribute("checked", "true");
			}

			if (prefManager) {
				prefManager.setBoolPref("defaultRadian", isRadian);
			}
		},

		openOptions : function() {
			optionsURL = "chrome://statusscicalc/content/options.xul";
			// emulate "Options" button in "about:addons" as close as possible
			// TODO: Can we use "cmd_showItemPreferences" directly?
			// (see http://lxr.mozilla.org/mozilla-central/source/toolkit/mozapps/extensions/content/extensions.js#1089)
			var windows = Services.wm.getEnumerator(null);
			while (windows.hasMoreElements()) {
				var win = windows.getNext();
				if (win.closed) {
					continue;
				}
				if (win.document.documentURI == optionsURL) {
					win.focus();
					return;
				}
			}
			var features = "chrome,titlebar,toolbar,centerscreen";
			try {
				var instantApply = Services.prefs.getBoolPref("browser.preferences.instantApply");
				features += instantApply ? ",dialog=no" : ",modal";
			} catch (e) {
				features += ",modal";
			}
			window.openDialog(optionsURL, "", features);
		},

		hideAskPopup : function() {
			askPop.hidePopup();
		},

		acceptAskPopup : function() {
			var val = ebd("scicalc-modeaskpopup-value").value.toLowerCase();
			var ret = -1;
			if (val == "b") ret = 2;
			else if (val == "d") ret = 10;
			else if (val == "h") ret = 16;
			else {
				var x = Math.floor(parseInt(val));
				if (x.toString() == val)
					if ((x >= 2) && (x <= 24))
						ret = x;
			}
			if (ret == -1) return;
			changeModeInternal('ask',ret, defaultCalculatorUI);
			if (defaultCalculatorUI) {
				setFocus(defaultCalculatorUI.inputbox);
			}
			this.hideAskPopup();
		},

		addHistory : function(ques, ans) {
			addHistoryEl(ques,ans);
			var popChildren = historyBox.children;
			for (var nodesToRemove = historyLength+1; nodesToRemove < popChildren.length; nodesToRemove++) {
				historyBox.removeChild(popChildren[nodesToRemove]);
			}

			historyBox.setAttribute('rows', popChildren.length-1);

			var entry = historyDoc.createElement("calc");
			entry.setAttribute("ques", ques);
			entry.setAttribute("ans", ans);

			var docf = historyDoc.firstChild;
			docf.appendChild(entry);

			while(docf.children.length > 2*historyLength)
				docf.removeChild(docf.children[0]);
			scicalc.fileIO.saveXML(historyDoc.cloneNode(true), "history.xml");
		},

		clearHistory : function() {
			while (historyBox.children.length > 1) {
				historyBox.removeChild(historyBox.lastChild);
			}
			historyBox.setAttribute('rows', 0);

			var docf = historyDoc.firstChild;
			while(docf.firstChild)
				docf.removeChild(docf.firstChild);
			scicalc.fileIO.saveXML(historyDoc.cloneNode(true),"history.xml");
		},

		/**
		 * Changes the mode to the specified base if it is one of 1 (complex), 2, 10, 16.
		 * Otherwise shows the ask popup.
		 */
		changeMode : function(base) {
			if (MODES[base]) {
				changeModeInternal(MODES[base], base, defaultCalculatorUI);
			} else if (defaultCalculatorUI) {
				defaultCalculatorUI.showAskPopup();
			}
		},

		updateAccessKey : function() {
			var accessKey = prefManager.getComplexValue("accessKey", Components.interfaces.nsIPrefLocalizedString).data;

			// remove old keyset (simply updating the old key doesn't work for some reason)
			var oldKeyset = ebd("scicalc-keyset");
			if (oldKeyset)
				oldKeyset.parentNode.removeChild(oldKeyset);

			// create new keyset and key
			if (accessKey) {
				var keyset = document.createElement("keyset");
				keyset.id = "scicalc-keyset";
				var key = document.createElement("key");
				key.setAttribute("id", "scicalc-key");
				key.setAttribute("key", accessKey);
				key.setAttribute("modifiers", "access");
				key.setAttribute("oncommand", "scicalc.main.openCalc();");
				keyset.appendChild(key);
				var mainKeyset = ebd("mainKeyset");
				mainKeyset.parentNode.appendChild(keyset);
			}
		}
	};
})(); 