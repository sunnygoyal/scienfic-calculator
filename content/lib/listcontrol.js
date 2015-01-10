const mystrings = Components.classes["@mozilla.org/intl/stringbundle;1"]
			.getService(Components.interfaces.nsIStringBundleService)
			.createBundle("chrome://statusscicalc/locale/options.properties")
			.GetStringFromName;


function ebd(id) {
	return document.getElementById(id);
}

function askConfirm(title, msg, ync) {
	var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
	var flags = promptService.BUTTON_TITLE_YES * promptService.BUTTON_POS_0;
	
	if (ync == undefined) {
		flags += promptService.BUTTON_TITLE_NO * promptService.BUTTON_POS_1;
	} else {
		flags += promptService.BUTTON_TITLE_NO * promptService.BUTTON_POS_2;
		flags += promptService.BUTTON_TITLE_CANCEL * promptService.BUTTON_POS_1;
	}
	
	return promptService.confirmEx(window, title, msg, flags, null, null, null, null, {});
}

function showblink(t, id) {
	if (t%2 == 0)
		ebd(id).removeAttribute('redback');
	else
		ebd(id).setAttribute('redback', true);
	var t2 = t - 1;
	if (t > 0)
		window.setTimeout( function() { showblink(t2, id); }, 100);
}

function setDisable(ids, val) {
	for (var i = 0; i < ids.length; i++) {
		ebd(ids[i]).disabled = val;
	}
}

function listControl(prefix, nodeName, attributes, newname, codepressH) {

	var editMode = "edit";
	this.changed = false;
	
	var controlIds = [prefix+"_but_cancel",prefix+"_but_done", prefix+"_name"];
	for (var i = 0; i < attributes.length; i++)
		controlIds[3+i] = prefix+"_"+attributes[i];
	
	var listBox = ebd(prefix+"_list");
	var minListLength = listBox.getRowCount();
	
	this.checkValid = function() {return true;};		//to be changed
	this.after_list_sel = function() { };
	
	this.list_sel = function() {
		setDisable(controlIds, true);
		if (codepressH) codepressH.setDisable(true);
		
		if (listBox.selectedIndex >= 0) {
			ebd(prefix+"_but_edit").disabled = ebd(prefix+"_but_del").disabled = (listBox.selectedIndex < minListLength);
			ebd(prefix+"_name").value = listBox.selectedItem.label;
			for (var i = 0; i < attributes.length; i++)
				ebd(prefix + "_" + attributes[i]).value = listBox.selectedItem.getAttribute(attributes[i]);
			
			if (codepressH) codepressH.setCode(listBox.selectedItem.getAttribute("code"));
		} else {
			ebd(prefix+"_but_edit").disabled = ebd(prefix+"_but_del").disabled = true;
			ebd(prefix+"_name").value = "";
			for (var i = 0; i < attributes.length; i++)		
				ebd(prefix + "_" + attributes[i]).value = "";
			if (codepressH) codepressH.setCode("");
		}
		this.after_list_sel();
	};

	this.load = function() {
		while (listBox.getRowCount() > minListLength)
			listBox.removeItemAt(minListLength);		//remove old items

		var entries = scicalc.fileIO.getXML(nodeName+"s.xml").firstChild.childNodes;

		for (var i = 0; i < entries.length; i++) {
			var name = entries[i].getAttribute("name");
			if (name != null) {
				var element = listBox.appendItem(name,0);
				for (var j = 0; j < attributes.length; j++) {
					element.setAttribute( attributes[j], entries[i].getAttribute(attributes[j]));
				}
				if (codepressH != null) {
					if (entries[i].textContent != null && entries[i].textContent != "")
						element.setAttribute("code",entries[i].textContent);
					else
						element.setAttribute("code", entries[i].getAttribute("code"));
				}
			}
		}

		this.list_sel();

		this.changed = false;
	};
	
	this.clicked_add = function() {
		setDisable(controlIds, false);
		if (codepressH) {
			codepressH.setDisable(false);
			codepressH.setCode('return 0;');
		}
		ebd(prefix+"_name").value = newname;
		for (var i = 0; i < attributes.length; i++)		
			ebd(prefix + "_" + attributes[i]).value = "";
		editMode = "add";
		this.after_list_sel();
	};
	
	this.clicked_delete = function() {
		if (askConfirm(mystrings("deleteTitle"), mystrings(prefix + "DeleteDescription")) == 0) {
			listBox.removeItemAt(listBox.selectedIndex);
			this.changed = true;
			this.list_sel();
			this.accept();
		}
	};
	
	this.clicked_edit = function() {
		setDisable(controlIds, false);
		if (codepressH) codepressH.setDisable(false);
		editMode = "edit";
	};
	
	this.clicked_done = function() {
		if (!this.checkValid(editMode)) return;

		var element;
		if (editMode == "edit")
			element = listBox.selectedItem;
		else
			element = listBox.appendItem(0,0);

		element.label = ebd(prefix+"_name").value;
		for (var i = 0; i < attributes.length; i++)		
			element.setAttribute(attributes[i], ebd(prefix + "_" + attributes[i]).value);
		if (codepressH) element.setAttribute("code", codepressH.getCode());
		listBox.selectedItem = element;
		this.changed = true;
		this.list_sel();
		
		this.accept();
	};

	this.clicked_reload = function() {
		if (this.changed && askConfirm(mystrings("reloadTitle"), mystrings(prefix+"ReloadDescription")) != 0)
			return;
		this.load();
	};
	
	this.clicked_save = function() {
		var doc = document.implementation.createDocument("", "", null);
		var elements = doc.createElement(nodeName + "s");
		for (var i = minListLength; i < listBox.getRowCount(); i++) {
			var entry = doc.createElement(nodeName);
			entry.setAttribute("name", listBox.getItemAtIndex(i).label);

			for (var j = 0; j < attributes.length; j++) {
				entry.setAttribute( attributes[j], listBox.getItemAtIndex(i).getAttribute(attributes[j]));
			}
			if (codepressH != null)
				entry.textContent = listBox.getItemAtIndex(i).getAttribute("code");

			elements.appendChild(entry);
		}
		doc.appendChild(elements);
		scicalc.fileIO.saveXML(doc,nodeName + "s.xml");
		this.changed = false;
	};
	
	this.accept = function() {
		this.clicked_save();
		
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
		                   .getService(Components.interfaces.nsIWindowMediator);
		var mainWindow = wm.getMostRecentWindow("navigator:browser");
		mainWindow.scicalc.realMath.loadUserData();
	};

}