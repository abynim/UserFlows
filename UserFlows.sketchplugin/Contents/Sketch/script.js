var kPluginDomain = "com.abynim.sketchplugins.userflows";
var kKeepOrganizedKey = "com.abynim.userflows.keepOrganized";
var kIncludePrototypingKey = "com.abynim.userflows.includePrototypingInExport";
var kExportScaleKey = "com.abynim.userflows.exportScale";
var kExportFormatKey = "com.abynim.userflows.exportFormat";
var kShowModifiedDateKey = "com.abynim.userflows.showModifiedDate";
var kRemoveAllLinksOptionKey = "com.abynim.userflows.removeAllLinksOption";
var kFlowIndicatorColorKey = "com.abynim.userflows.flowIndicatorColor";
var kConditionFontSizeKey = "com.abynim.userflows.conditionFontSize"
var kFlowIndicatorAlphaKey = "com.abynim.userflows.flowIndicatorAlpha";
var kFlowBackgroundKey = "com.abynim.userflows.backgroundColor";
var kMinTapAreaKey = "com.abynim.userflows.minTapArea";
var kFullNameKey = "com.abynim.userflows.fullName";
var kAutoUpdateConnectionsKey = "com.abynim.userflows.autoUpdateConnections";
var kUUIDKey = "com.abynim.userflows.uuid";
var kShowConnectionsKey = "com.abynim.userflows.showConnections";
var kShowsLinkRectsKey = "com.abynim.userflows.showsLinkRects";
var kScalesDownFlowBitmaps = "com.abynim.userflows.scalesDownFlowBitmaps";
var kStrokeWidthKey = "com.abynim.userflows.strokeWidth";
var kConditionalArtboardKey = "com.abynim.userflows.conditionalArtboard";
var kLanguageCodeKey = "com.abynim.userflows.languageCode";
var kConnectionTypeKey = "com.abynim.userflows.connectionStrokeType";
var kMagnetsTypeKey = "com.abynim.userflows.artboardMagnetsType";
var kRelinkWarningKey = "com.abynim.userflows.showsRelinkWarning";
var kStartMarkerTypeKey = "com.abynim.userflows.startMarkerType";
var kEndMarkerTypeKey = "com.abynim.userflows.endMarkerType";
var kFirstLayerIDKey = "com.abynim.userflows.firstLayerID";

var linkLayerPredicate;
var iconImage;
var version;
var strings;
var sketchVersion;

var supportedLanguages = ["en", "cn", "zhtw", "cz", "da", "nl", "es", "fr", "de", "it", "fa", "ru", "tr", "pt"];
var languageNames = {
	en : "English",
	da : "Danish",
	nl : "Dutch",
	cn : "Chinese Simplified",
	zhtw : "Chinese Traditional",
	fa : "Persian",
	tr : "Türkçe",
	cz : "Česky",
	ru : "Русский",
	de : "German",
	es : "Español",
	it : "Italian",
	fr : "French",
	pt : "Portuguese"
};

const sketchVersion48 = 480;
const sketchVersion49 = 490;
const sketchVersion50 = 500;
const sketchVersion51 = 510;

var defineLink = function(context) {

	parseContext(context);

	var doc = context.document;
	var selection = context.selection;
	var validSelection = true;
	var destArtboard, linkLayer;

	if (selection.count() != 2) {
		validSelection = false;
	} else {
		if (selection.firstObject().className() == "MSArtboardGroup" || selection.firstObject().className() == "MSSymbolMaster") {
			destArtboard = selection.firstObject();
			linkLayer = selection.lastObject();
		}
		else if(selection.lastObject().className() == "MSArtboardGroup" || selection.lastObject().className() == "MSSymbolMaster") {
			destArtboard = selection.lastObject();
			linkLayer = selection.firstObject();
		}

		if (!destArtboard || linkLayer.className() == "MSArtboardGroup" || linkLayer.className() == "MSSymbolMaster" || linkLayer.parentArtboard() == destArtboard) {
			validSelection = false;
		}
	}

	if (!validSelection) {
		showAlert(strings["defineLink-invalidSelectionTitle"], strings["defineLink-invalidSelectionMessage"]);
		return;
	}

	var didModifySettings = true;
	var lastUsedBorderStyleID = context.command.valueForKey_onDocument_forPluginIdentifier("lastUsedBorderStyleID", doc.documentData(), kPluginDomain);
	var lastUsedForeignStyleID = context.command.valueForKey_onDocument_forPluginIdentifier("lastUsedForeignStyleID", doc.documentData(), kPluginDomain);

	if (context.command.identifier() == "defineLinkWithOptions") {
		if (sketchVersion < sketchVersion51) {
			showAlert("Not Supported", "This feature is only available in Sketch 51 and above.");
			return;
		}

		didModifySettings = false;

		var settingsWindow = getAlertWindow();
		settingsWindow.addButtonWithTitle(strings["alerts-save"]);
		settingsWindow.addButtonWithTitle(strings["alerts-cancel"]);

		settingsWindow.setMessageText("Select connection style");

		var stylesDropdown = stylesDropdownForContext_selectedStyleID_sharedObjectID(context, lastUsedBorderStyleID, lastUsedForeignStyleID);
		settingsWindow.addAccessoryView(stylesDropdown);

		if (settingsWindow.runModal() == "1000") {

			shareableObjectRef = stylesDropdown.selectedItem().representedObject();
			var sharedStyleID = (shareableObjectRef === "default") ? nil : context.document.localObjectForObjectReference(shareableObjectRef).objectID();

			context.command.setValue_forKey_onDocument_forPluginIdentifier(sharedStyleID, "lastUsedBorderStyleID", doc.documentData(), kPluginDomain);
			lastUsedBorderStyleID = sharedStyleID;

			lastUsedForeignStyleID = shareableObjectRef.sourceLibrary() ? shareableObjectRef.sharedObjectID() : nil;
			context.command.setValue_forKey_onDocument_forPluginIdentifier(lastUsedForeignStyleID, "lastUsedForeignStyleID", doc.documentData(), kPluginDomain);

			didModifySettings = true;
		}
	}

	if (!didModifySettings) return;

	var artboardID = context.command.valueForKey_onLayer_forPluginIdentifier("artboardID", destArtboard, kPluginDomain);
	if (!artboardID || artboardID != destArtboard.objectID()) {
		artboardID = destArtboard.objectID();
		context.command.setValue_forKey_onLayer_forPluginIdentifier(artboardID, "artboardID", destArtboard, kPluginDomain);
	}
	context.command.setValue_forKey_onLayer_forPluginIdentifier(artboardID, "destinationArtboardID", linkLayer, kPluginDomain);

	if (lastUsedBorderStyleID) {
		context.command.setValue_forKey_onLayer_forPluginIdentifier(lastUsedBorderStyleID, "sharedBorderStyleID", linkLayer, kPluginDomain);
	}
	if(lastUsedForeignStyleID) {
		context.command.setValue_forKey_onLayer_forPluginIdentifier(lastUsedForeignStyleID, "foreignBorderStyleID", linkLayer, kPluginDomain);
	}

	var showingConnections = NSUserDefaults.standardUserDefaults().objectForKey(kShowConnectionsKey) || 1;

	if (showingConnections == 1) {
		redrawConnections(context);
	} else {
		doc.showMessage(strings["defineLink-linkDefined"] + " " + linkLayer.name() + " → " + destArtboard.name());
	}
}


var stylesDropdownForContext_selectedStyleID_sharedObjectID = function(context, selectedStyleID, sharedObjectID) {
	var selectedID = selectedStyleID ? ("" + selectedStyleID) : nil;
	var stylesDropdown = NSPopUpButton.alloc().initWithFrame(NSMakeRect(0,0,300,25));
	stylesDropdown.menu().setAutoenablesItems(0);
	var predicate = NSPredicate.predicateWithFormat("style.hasEnabledFill == NO");

	var sharedStyle, menuItem, shareableObjectRef, selectedItem;

	menuItem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent("Default", nil, "");
	menuItem.setRepresentedObject(NSString.stringWithString("default"));
	stylesDropdown.menu().addItem(menuItem);
	stylesDropdown.menu().addItem(NSMenuItem.separatorItem());

	var docStyles = context.document.documentData().layerStyles().sharedStyles().filteredArrayUsingPredicate(predicate);

	var docStylesTitle = docStyles.count() > 0 ? "Document Styles" : "No Document Styles";
	menuItem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent(docStylesTitle, nil, "");
	menuItem.setEnabled(false);
	stylesDropdown.menu().addItem(menuItem);

	var loop = docStyles.objectEnumerator();
	while(sharedStyle = loop.nextObject()) {
		menuItem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent(sharedStyle.name(), nil, "");
		//menuItem.setImage(generatePreviewImageForSharedBorderStyle(sharedStyle));
		shareableObjectRef = MSShareableObjectReference.referenceForShareableObject(sharedStyle);
		menuItem.setRepresentedObject(shareableObjectRef);
		menuItem.setIndentationLevel(1);
		if (selectedID && (""+sharedStyle.objectID()) == selectedID) {
			selectedItem = menuItem;
		}
		stylesDropdown.menu().addItem(menuItem);
	}

	stylesDropdown.menu().addItem(NSMenuItem.separatorItem());

	var libs = AppController.sharedInstance().librariesController().availableLibraries();
	var lib, libStyles;
	var libsLoop = libs.objectEnumerator();
	var stylesLoop;
	while(lib = libsLoop.nextObject()) {
		libStyles = lib.document().layerStyles().sharedStyles().filteredArrayUsingPredicate(predicate);
		if (libStyles.count() > 0) {
			menuItem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent(lib.name(), nil, "");
			menuItem.setEnabled(false);
			stylesDropdown.menu().addItem(menuItem);

			stylesLoop = libStyles.objectEnumerator();
			while(sharedStyle = stylesLoop.nextObject()) {

				menuItem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent(sharedStyle.name(), nil, "");
				//menuItem.setImage(generatePreviewImageForSharedBorderStyle(sharedStyle));
				shareableObjectRef = MSShareableObjectReference.referenceForShareableObject_inLibrary(sharedStyle, lib);
				menuItem.setRepresentedObject(shareableObjectRef);
				menuItem.setIndentationLevel(1);
				if (!selectedItem && sharedObjectID && sharedStyle.objectID() == sharedObjectID) {
					selectedItem = menuItem;
				}
				stylesDropdown.menu().addItem(menuItem);

			}

			stylesDropdown.menu().addItem(NSMenuItem.separatorItem());
		}
	}
	if(selectedItem) stylesDropdown.selectItem(selectedItem);
	return stylesDropdown;
}

var editConnectionStyle = function(context) {

	parseContext(context);

	if (sketchVersion < sketchVersion51) {
		showAlert("Not Supported", "This feature is only available in Sketch 51 and above.");
		return;
	}

	linkLayerPredicate = NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).destinationArtboardID != nil", kPluginDomain);
	var linkLayers = context.selection.filteredArrayUsingPredicate(linkLayerPredicate);
	var numLayers = linkLayers.count();

	if (numLayers == 0) {
		showAlert(strings["defineLink-invalidSelectionTitle"], strings["editLinkOptions-invalidSelectionMessage"]);
		return;
	}

	var settingsWindow = getAlertWindow();
	settingsWindow.addButtonWithTitle(strings["alerts-save"]);
	settingsWindow.addButtonWithTitle(strings["alerts-cancel"]);

	settingsWindow.setMessageText("Edit connection style");

	var currentBorderStyleID = nil;
	var currentForeignBorderStyleID = nil;
	if(numLayers == 1 ) {
		var linkLayer = linkLayers.firstObject();
		currentBorderStyleID = context.command.valueForKey_onLayer_forPluginIdentifier("sharedBorderStyleID", linkLayer, kPluginDomain);
		currentForeignBorderStyleID = context.command.valueForKey_onLayer_forPluginIdentifier("foreignBorderStyleID", linkLayer, kPluginDomain);
	}
	var stylesDropdown = stylesDropdownForContext_selectedStyleID_sharedObjectID(context, currentBorderStyleID, currentForeignBorderStyleID);
	settingsWindow.addAccessoryView(stylesDropdown);

	if (settingsWindow.runModal() == "1000") {

		var shareableObjectRef = stylesDropdown.selectedItem().representedObject();
		var isDefault = (shareableObjectRef == "default");
		
		if (shareableObjectRef) {
			
			var sharedStyleID = isDefault ? nil : context.document.localObjectForObjectReference(shareableObjectRef).objectID();
			
			var linkLayer;
			var loop = linkLayers.objectEnumerator();

			while(linkLayer = loop.nextObject()) {
				context.command.setValue_forKey_onLayer_forPluginIdentifier(sharedStyleID, "sharedBorderStyleID", linkLayer, kPluginDomain);
				if(!isDefault) { 
					context.command.setValue_forKey_onLayer_forPluginIdentifier(shareableObjectRef.sharedObjectID(), "foreignBorderStyleID", linkLayer, kPluginDomain);
				}
			}

			redrawConnections(context);
		}

	}

}

var removeLink = function(context) {

	parseContext(context);

	var doc = context.document,
		selection = context.selection;
	if (selection.count() == 0) {
		doc.showMessage(strings["removeLink-invalidSelectionMessage"]);
		return;
	}

	var loop = context.selection.objectEnumerator(),
		linkLayer, destinationArtboardID;
	while (linkLayer = loop.nextObject()) {
		destinationArtboardID = context.command.valueForKey_onLayer_forPluginIdentifier("destinationArtboardID", linkLayer, kPluginDomain);
		if (!destinationArtboardID) { continue; }
		context.command.setValue_forKey_onLayer_forPluginIdentifier(nil, "destinationArtboardID", linkLayer, kPluginDomain);
	}

	var showingConnections = NSUserDefaults.standardUserDefaults().objectForKey(kShowConnectionsKey) || 1;
	if (showingConnections == 1) {
		redrawConnections(context);
	} else {
		var message = context.selection.count() == 1 ? strings["removeLink-linkRemoved"] : strings["removeLink-linksRemoved"]
		doc.showMessage(message);
	}
}

var removeAllLinks = function(context) {

	parseContext(context);

	var doc = context.document;
	var settingsWindow = getAlertWindow();
	settingsWindow.addButtonWithTitle(strings["alerts-save"]);
	settingsWindow.addButtonWithTitle(strings["alerts-cancel"]);

	settingsWindow.setMessageText(strings["removeLinks-title"]);

	var fakeFunc = function() {
		log("Fake func");
	}

	var artboardButton = NSButton.alloc().initWithFrame(NSMakeRect(0,0,300,22));
	artboardButton.setTitle(strings["removeLinks-scopeSelectedArtboards"]);
	artboardButton.setButtonType(NSRadioButton);
	artboardButton.setAction(fakeFunc);

	var pageButton = NSButton.alloc().initWithFrame(NSMakeRect(0,0,300,22));
	pageButton.setTitle(strings["removeLinks-scopeCurrentPage"]);
	pageButton.setButtonType(NSRadioButton);
	pageButton.setAction(fakeFunc);

	settingsWindow.addAccessoryView(artboardButton);
	settingsWindow.addAccessoryView(pageButton);

	var lastSelectedOption = NSUserDefaults.standardUserDefaults().objectForKey(kRemoveAllLinksOptionKey) || 1;
	if (lastSelectedOption == 1) {
		artboardButton.setState(NSOnState);
	} else if(lastSelectedOption == 2) {
		pageButton.setState(NSOnState);
	}

	var response = settingsWindow.runModal();

	if (response == "1000") {

		var selectedOptionID = artboardButton.state() == NSOnState ? 1 : 2;
		NSUserDefaults.standardUserDefaults().setObject_forKey(selectedOptionID, kRemoveAllLinksOptionKey);
		var layersInScope = selectedOptionID == 1 ? context.selection.valueForKeyPath("@distinctUnionOfArrays.parentArtboard.children") : doc.currentPage().children();

		var linkLayersPredicate = NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).destinationArtboardID != nil", kPluginDomain),
			linkLayers = layersInScope.filteredArrayUsingPredicate(linkLayersPredicate),
			loop = linkLayers.objectEnumerator(),
			linkLayer;

		while (linkLayer = loop.nextObject()) {
			context.command.setValue_forKey_onLayer_forPluginIdentifier(nil, "destinationArtboardID", linkLayer, kPluginDomain);
		}

		var showingConnections = NSUserDefaults.standardUserDefaults().objectForKey(kShowConnectionsKey) || 1;
		if (showingConnections == 1) {
			redrawConnections(context);
		} else {
			var message = strings["removeLink-linksRemoved"];
			doc.showMessage(message);
		}
	}
}

var relinkArtboardsAfterCopy = function(context) {

	var showsRelinkWarning = NSUserDefaults.standardUserDefaults().objectForKey(kRelinkWarningKey) || 1;
	if (showsRelinkWarning == 1) {

		parseContext(context);

		var settingsWindow = getAlertWindow();
		settingsWindow.addButtonWithTitle(strings["relinkArtboards-confirm"]);
		settingsWindow.addButtonWithTitle(strings["alerts-cancel"]);

		settingsWindow.setMessageText(strings["relinkArtboards-title"]);
		settingsWindow.setInformativeText(strings["relinkArtboards-description"]);

		var showsWarningCheckbox = NSButton.alloc().initWithFrame(NSMakeRect(0,0,300,22));
		showsWarningCheckbox.setButtonType(NSSwitchButton);
		showsWarningCheckbox.setBezelStyle(0);
		showsWarningCheckbox.setTitle(strings["relinkArtboards-dontShowAgain"]);
		showsWarningCheckbox.setState(NSOffState);
		settingsWindow.addAccessoryView(showsWarningCheckbox);

		var response = settingsWindow.runModal();

		if (response == "1000") {
			var warn = showsWarningCheckbox.state() == 0 ? 1 : 0;
			NSUserDefaults.standardUserDefaults().setObject_forKey(warn, kRelinkWarningKey);
			confirmRelinkArtboards(context);
		}

	} else {
		confirmRelinkArtboards(context);
	}
}

var confirmRelinkArtboards = function(context) {

	var destinationArtboards = context.document.currentPage().artboards().filteredArrayUsingPredicate(NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).artboardID != nil", kPluginDomain)),
		loop = destinationArtboards.objectEnumerator(),
		validArtboardIDs = context.document.currentPage().valueForKeyPath("artboards.@unionOfObjects.objectID"),
		relinkCount = 0,
		artboard, cachedID, artboardID, linkLayer, linkLayers, linkLayersCount;

	while (artboard = loop.nextObject()) {
		artboardID = artboard.objectID();
		cachedID = context.command.valueForKey_onLayer_forPluginIdentifier("artboardID", artboard, kPluginDomain);

		if (artboardID != cachedID && !validArtboardIDs.containsObject(cachedID)) {

			linkLayers = context.document.currentPage().children().filteredArrayUsingPredicate(NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).destinationArtboardID == %@", kPluginDomain, cachedID));
			linkLayersCount = linkLayers.count();

			for (var i = 0; i < linkLayersCount; i++) {
				linkLayer = linkLayers[i];
				context.command.setValue_forKey_onLayer_forPluginIdentifier(artboardID, "destinationArtboardID", linkLayer, kPluginDomain);
			}

			context.command.setValue_forKey_onLayer_forPluginIdentifier(artboardID, "artboardID", artboard, kPluginDomain);
			relinkCount++;

		}
	}

	var doc = context.document;
	var showingConnections = NSUserDefaults.standardUserDefaults().objectForKey(kShowConnectionsKey) || 1;

	if (showingConnections == 1) {
		redrawConnections(context);
	} else {
		var infoText = strings["relinkArtboards-relinkComplete"].stringByReplacingOccurrencesOfString_withString("%count%", relinkCount+"");
		doc.showMessage(infoText);
	}
}

var editArtboardDescription = function(context) {

	parseContext(context);

	var currentArtboard = context.document.currentPage().currentArtboard();
	if (!currentArtboard) {
		showAlert(strings["artboardDescription-invalidSelectionMessage"]);
		return;
	}

	var settingsWindow = getAlertWindow();
	settingsWindow.addButtonWithTitle(strings["alerts-save"]);
	settingsWindow.addButtonWithTitle(strings["alerts-cancel"]);

	settingsWindow.setMessageText("Artboard: " + currentArtboard.name());

	settingsWindow.addTextLabelWithValue(strings["artboardDescription-description"]);
	var descriptionField = NSTextField.alloc().initWithFrame(NSMakeRect(0,0,300,100));
	settingsWindow.addAccessoryView(descriptionField);

	if (settingsWindow.runModal() == "1000") {
		context.command.setValue_forKey_onLayer_forPluginIdentifier(descriptionField.stringValue(), "artboardDescription", currentArtboard, kPluginDomain);
		context.document.showMessage(strings["artboardDescription-saved"]);
	}
}

var editConditionsForArtboard = function(currentArtboard, context, forceNewCondition) {
	var settingsWindow = getAlertWindow();
	settingsWindow.addButtonWithTitle(strings["alerts-save"]);
	settingsWindow.addButtonWithTitle(strings["alerts-cancel"]);
	settingsWindow.addButtonWithTitle(strings["addCondition-saveAndAdd"]);

	settingsWindow.setMessageText(strings["addCondition-title"]);

	var artboardIsConditional = forceNewCondition == true ? 0 : (context.command.valueForKey_onLayer_forPluginIdentifier(kConditionalArtboardKey, currentArtboard, kPluginDomain) || 0),
		hasElse = artboardIsConditional ? (context.command.valueForKey_onLayer_forPluginIdentifier("hasElse", currentArtboard, kPluginDomain) || 1) : 1,
		conditionFields = [],
		conditionChecks = [],
		conditionLinks = [],
		elseLink = 0,
		conditionField, conditionCheck, conditionLink, conditionView, checkbox, elseCheckbox;
	if (artboardIsConditional == 1) {

		var predicate = NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).isCondition != nil", kPluginDomain),
			conditionLayers = currentArtboard.children().filteredArrayUsingPredicate(predicate);

		if (conditionLayers.count() != 0) {

			var loop = conditionLayers.objectEnumerator(), conditionLayer;
			while (conditionLayer = loop.nextObject()) {
				conditionView = NSView.alloc().initWithFrame(NSMakeRect(0,0,300,30));
				checkbox = NSButton.alloc().initWithFrame(NSMakeRect(0,0,23,23));
				checkbox.state = NSOnState;
				checkbox.setButtonType(NSSwitchButton);
				checkbox.setBezelStyle(0);
				conditionView.addSubview(checkbox);
				conditionField = NSTextField.alloc().initWithFrame(NSMakeRect(21,0,250,22));
				conditionField.cell().setWraps(false);
				conditionField.cell().setScrollable(true);
				conditionField.setPlaceholderString("Ex: If user is logged in");
				conditionField.setStringValue(conditionLayer.stringValue());
				conditionView.addSubview(conditionField);
				settingsWindow.addAccessoryView(conditionView);
				conditionFields.push(conditionField);
				conditionChecks.push(checkbox);
				conditionLink = context.command.valueForKey_onLayer_forPluginIdentifier("destinationArtboardID", conditionLayer.parentGroup(), kPluginDomain) || 0;
				conditionLinks.push(conditionLink);
			}
		}

		predicate = NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).isElse != nil", kPluginDomain);
		var elseLabel = currentArtboard.children().filteredArrayUsingPredicate(predicate).firstObject();
		if (elseLabel) {
			elseLink = context.command.valueForKey_onLayer_forPluginIdentifier("destinationArtboardID", elseLabel.parentGroup(), kPluginDomain) || 0;
		}
	}

	conditionView = NSView.alloc().initWithFrame(NSMakeRect(0,0,300,30));
	checkbox = NSButton.alloc().initWithFrame(NSMakeRect(0,0,23,23));
	checkbox.state = NSOnState;
	checkbox.setButtonType(NSSwitchButton);
	checkbox.setBezelStyle(0);
	conditionView.addSubview(checkbox);
	conditionField = NSTextField.alloc().initWithFrame(NSMakeRect(21,0,250,22));
	conditionField.setPlaceholderString(strings["addCondition-ifConditionPlaceholder"]);
	conditionView.addSubview(conditionField);
	settingsWindow.addAccessoryView(conditionView);
	conditionFields.push(conditionField);
	conditionChecks.push(checkbox);
	conditionLinks.push(0);

	elseCheckbox = NSButton.alloc().initWithFrame(NSMakeRect(0,0,300,23));
	elseCheckbox.title = strings["addCondition-else"];
	elseCheckbox.state = hasElse;
	elseCheckbox.setButtonType(NSSwitchButton);
	elseCheckbox.setBezelStyle(0);
	settingsWindow.addAccessoryView(elseCheckbox);
	conditionChecks.push(elseCheckbox);
	conditionLinks.push(elseLink);

	var numConditionFields = conditionFields.length;
	for (var i = 0; i < numConditionFields; i++) {
		if (i == numConditionFields-1) break;
		conditionFields[i].setNextKeyView(conditionFields[i+1]);
	};
	settingsWindow.alert().window().setInitialFirstResponder(conditionField);

	var response = settingsWindow.runModal();

	if (response != "1001") {

		var conditionBoard;

		if (artboardIsConditional) {
			conditionBoard = currentArtboard;
			conditionBoard.removeAllLayers();
		} else {
			conditionBoard = MSArtboardGroup.new();
			conditionBoard.setName("-" + strings["addCondition-conditionArtboardName"] + "-");
			conditionBoard.setHasBackgroundColor(1);
			conditionBoard.frame().setWidth(280);
			context.command.setValue_forKey_onLayer_forPluginIdentifier(1, kConditionalArtboardKey, conditionBoard, kPluginDomain);
			context.document.currentPage().addLayers([conditionBoard]);
		}
		conditionBoard.setConstrainProportions(false);
		context.command.setValue_forKey_onLayer_forPluginIdentifier(elseCheckbox.state(), "hasElse", conditionBoard, kPluginDomain);

		var numConditions = conditionChecks.length,
			conditionSpacing = 16,
			listY = conditionSpacing,
			flowIndicatorColor = NSUserDefaults.standardUserDefaults().objectForKey(kFlowIndicatorColorKey) || "#F5A623",
			conditionFontSize = NSUserDefaults.standardUserDefaults().objectForKey(kConditionFontSizeKey) || 16,
			conditionBorderColor = MSImmutableColor.colorWithSVGString(flowIndicatorColor).newMutableCounterpart(),
			conditionBoardWidth = conditionBoard.frame().width(),
			count = 0,
			conditionLabel, conditionValue, conditionBox, conditionBorder, conditionBoxHeight, layersArray, conditionGroup, isElse, conditionLabelColor;

		for (var i = 0; i < numConditions; i++) {

			checkbox = conditionChecks[i];

			if (checkbox.state() == NSOffState) continue;

			isElse = checkbox == elseCheckbox;
			if (isElse) {
				conditionValue = strings["addCondition-else"];
			} else {
				conditionField = conditionFields[i];
				conditionValue = conditionField.stringValue();
				if (!conditionValue || conditionValue == "") continue;
			}

			count++;

			conditionLabel = MSTextLayer.new();
			conditionLabel.frame().setX(conditionSpacing + 8);
			conditionLabel.frame().setY(listY + 8);
			conditionLabel.frame().setWidth(conditionBoardWidth - ((conditionSpacing+8)*2));
			conditionLabel.setTextBehaviour(1);
			conditionLabel.setStringValue(conditionValue);
			conditionLabel.addAttribute_value(NSFontAttributeName, NSFont.fontWithName_size("HelveticaNeue", conditionFontSize));
			conditionLabel.setLineHeight(conditionFontSize*1.4);
			conditionLabelColor = MSImmutableColor.colorWithSVGString("#121212");
			if (sketchVersion < sketchVersion48) conditionLabelColor = conditionLabelColor.newMutableCounterpart();
			conditionLabel.setTextColor(conditionLabelColor);
			conditionLabel.adjustFrameToFit();
			context.command.setValue_forKey_onLayer_forPluginIdentifier(1, (isElse ? "isElse" : "isCondition"), conditionLabel, kPluginDomain);

			conditionBoxHeight = Math.ceil(conditionLabel.frame().height()) + 16;
			conditionBox = MSShapeGroup.shapeWithPath(MSRectangleShape.alloc().initWithFrame(NSMakeRect(conditionSpacing, listY, conditionBoardWidth-(conditionSpacing*2), conditionBoxHeight)));
			conditionBox.firstLayer().setCornerRadiusFloat(5);
			conditionBox.style().addStylePartOfType(0).setColor(MSImmutableColor.colorWithSVGString("#f9f9f9").newMutableCounterpart());
			conditionBorder = conditionBox.style().addStylePartOfType(1);
			conditionBorder.setColor(conditionBorderColor);
			conditionBorder.setPosition(2);
			conditionBorder.setThickness(2);

			conditionBoard.addLayers([conditionBox, conditionLabel]);
			layersArray = MSLayerArray.arrayWithLayers([conditionBox, conditionLabel]);
			conditionGroup = MSLayerGroup.groupFromLayers(layersArray);
			conditionGroup.setName(strings["addCondition-conditionGroupName"] + " " + count);

			conditionLabel.frame().setX(8);
			conditionLabel.frame().setY(8);

			listY += conditionBoxHeight + conditionSpacing;

			context.command.setValue_forKey_onLayer_forPluginIdentifier(1, "isConditionGroup", conditionGroup, kPluginDomain);

			conditionLink = conditionLinks[i];
			if (conditionLink != 0) {
				context.command.setValue_forKey_onLayer_forPluginIdentifier(conditionLink, "destinationArtboardID", conditionGroup, kPluginDomain);
			}

		}

		conditionBoard.frame().setHeight(listY);
		if (artboardIsConditional != 1) {
			var currentView = sketchVersion < sketchVersion48 ? context.document.currentView() : context.document.contentDrawView();
			var vcr = currentView.visibleContentRect(),
				absPosition = NSMakePoint(CGRectGetMidX(vcr)-CGRectGetMidX(conditionBoard.absoluteRect().rect()), CGRectGetMidY(vcr)-CGRectGetMidY(conditionBoard.absoluteRect().rect()));
			conditionBoard.setAbsolutePosition(absPosition);
		}

		if (response == "1002") {
			editConditionsForArtboard(conditionBoard, context, false);
		} else {
			var showingConnections = NSUserDefaults.standardUserDefaults().objectForKey(kShowConnectionsKey) || 1;
			if (showingConnections == 1) {
				redrawConnections(context);
			}
			conditionBoard.select_byExtendingSelection(true, false);
		}

	}
}

var addCondition = function(context) {

	parseContext(context);

	var parentArtboards = context.selection.valueForKeyPath("@distinctUnionOfObjects.parentArtboard"),
		currentArtboard = parentArtboards.firstObject();

	editConditionsForArtboard(currentArtboard, context, (parentArtboards.count() != 1));

}

var gotoDestinationArtboard = function(context) {

	parseContext(context);

	var linkLayer = context.selection.firstObject(),
		validSelection = true,
		destinationArtboardID;
	if (!linkLayer) {
		validSelection = false;
	} else {
		destinationArtboardID = context.command.valueForKey_onLayer_forPluginIdentifier("destinationArtboardID", linkLayer, kPluginDomain);
		if (!destinationArtboardID) {
			validSelection = false;
		}
	}

	if (!validSelection) {
		showAlert(strings["gotoArtboard-invalidSelectionTitle"], strings["gotoArtboard-invalidSelectionMessage"]);
		return;
	}

	var doc = context.document,
		destinationArtboard = doc.currentPage().artboards().filteredArrayUsingPredicate(NSPredicate.predicateWithFormat("objectID == %@", destinationArtboardID)).firstObject();
	if (destinationArtboard) {
		var currentView = sketchVersion < sketchVersion48 ? doc.currentView() : doc.contentDrawView();
		var cRect = currentView.visibleContentRect(),
			contentRect = {
				x : cRect.origin.x,
				y : cRect.origin.y,
				width : cRect.size.width,
				height : cRect.size.height,
				linkLayerID : linkLayer.objectID()
			},
			rects = context.command.valueForKey_onDocument_forPluginIdentifier("contentRectsHistory", doc.documentData(), kPluginDomain);

		if (!rects) {
			rects = NSArray.array();
		}
		rects = rects.arrayByAddingObject(contentRect);

		context.command.setValue_forKey_onDocument_forPluginIdentifier(rects, "contentRectsHistory", doc.documentData(), kPluginDomain);

		currentView.centerRect(destinationArtboard.absoluteRect().rect());
		destinationArtboard.select_byExtendingSelection(true, false);
	}
}

var goBackToLink = function(context) {

	parseContext(context);

	var doc = context.document,
		rects = context.command.valueForKey_onDocument_forPluginIdentifier("contentRectsHistory", doc.documentData(), kPluginDomain).mutableCopy();

	if (rects) {
		var contentRect = rects.lastObject();

		if (!contentRect) {  return;  }

		if (contentRect.linkLayerID ) {
			var layer = doc.currentPage().children().filteredArrayUsingPredicate(NSPredicate.predicateWithFormat("objectID == %@", contentRect.linkLayerID)).firstObject();
			if(layer) {
				layer.select_byExtendingSelection(true, false);
			}
		}

		var cRect = NSMakeRect(contentRect.x, contentRect.y, contentRect.width, contentRect.height);
		var currentView = sketchVersion < sketchVersion48 ? doc.currentView() : doc.contentDrawView();
		currentView.centerRect(cRect);

		rects.removeLastObject();
		context.command.setValue_forKey_onDocument_forPluginIdentifier(rects, "contentRectsHistory", doc.documentData(), kPluginDomain);
	}
}

var recursivelyDetachSymbolInstance = function(instance) {
	
	// don't detach the instance if it has a flow connection
	if (instance.flow()) return;

	var instanceRect = instance.absoluteRect();
	var group = instance.detachByReplacingWithGroup();
	if (!group) return;

	// resize the group to match the original instance dimensions
	group.absoluteRect().setWidth(instanceRect.width());
	group.absoluteRect().setHeight(instanceRect.height());
	group.resizeToFitChildrenWithOption(1);
	
	var loop = group.children().objectEnumerator(), layer;
	while (layer = loop.nextObject()) {
		if (layer.className() == 'MSSymbolInstance') {
			recursivelyDetachSymbolInstance(layer);
		}
	}
}

var artboardWithDetachedSymbolsFromArtboard = function(artboard) {
	var detachedArtboard = artboard.duplicate();
	var symbolInstances = detachedArtboard.children().filteredArrayUsingPredicate(NSPredicate.predicateWithFormat("className == 'MSSymbolInstance'"));
	var loop = symbolInstances.objectEnumerator(), instance;
	while (instance = loop.nextObject()) {
		recursivelyDetachSymbolInstance(instance);
	}
	return detachedArtboard;
}

var getArtboardsWithFlowConnectionsInPage = function(page, doc) {
	var loop = page.artboards().objectEnumerator(),
		validArtboards = [], 
		artboard;
	while (artboard = loop.nextObject()) {
		if (artboard.ancestry().layer().containsFlowWithSymbolsFromDocument(doc.immutableDocumentData())) {
			validArtboards.push(artboard);
		}
	}
	return NSArray.arrayWithArray(validArtboards);
}

var generateFlow = function(context) {

	parseContext(context);

	var doc = context.document;
	var settingsWindow = getAlertWindow();
	settingsWindow.addButtonWithTitle(strings["generateFlow-saveButtonTitle"]);
	settingsWindow.addButtonWithTitle(strings["alerts-cancel"]);

	settingsWindow.setMessageText(strings["generateFlow-message"]);

	settingsWindow.addTextLabelWithValue(strings["generateFlow-startFrom"]);

	var currentPage = doc.currentPage();
	var pageContainsFlowConnections = currentPage.ancestry().layer().containsFlowWithSymbolsFromDocument(doc.immutableDocumentData());

	linkLayerPredicate = NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).destinationArtboardID != nil", kPluginDomain);
	var linkLayers = currentPage.children().filteredArrayUsingPredicate(linkLayerPredicate);


	if (linkLayers.count() == 0 && !pageContainsFlowConnections) {
		showAlert(strings["generateFlow-noLinksTitle"], strings["generateFlow-noLinksMessage"]);
		return;
	}

	var artboardsWithLinks = linkLayers.count() ? linkLayers.valueForKeyPath("@distinctUnionOfObjects.parentArtboard") : NSArray.array();

	if (pageContainsFlowConnections) {
		artboardsWithLinks = NSSet.setWithArray(artboardsWithLinks.arrayByAddingObjectsFromArray(getArtboardsWithFlowConnectionsInPage(currentPage, doc))).allObjects();
	}

	var artboardsDropdown = NSPopUpButton.alloc().initWithFrame(NSMakeRect(0,0,300,25));
	var loop = artboardsWithLinks.objectEnumerator(), artboardWithLinks, menuItem, artboardTitle;
	while (artboardWithLinks = loop.nextObject()) {
		artboardTitle = artboardWithLinks.isFlowHome() ? "⚑ " + artboardWithLinks.name() : artboardWithLinks.name();
		menuItem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent(artboardTitle, nil, "");
		artboardsDropdown.menu().addItem(menuItem);
	}

	var homeScreenID = context.command.valueForKey_onLayer_forPluginIdentifier("homeScreenID", currentPage, kPluginDomain);
	if (homeScreenID) {
		var artboardIDs = artboardsWithLinks.valueForKeyPath("@unionOfObjects.objectID");
		var homeScreenIndex = Math.max(0, artboardIDs.indexOfObject(homeScreenID));
		artboardsDropdown.selectItemAtIndex(homeScreenIndex);
	}
	settingsWindow.addAccessoryView(artboardsDropdown);

	var lastUsedFlowTitle = context.command.valueForKey_onLayer_forPluginIdentifier("lastUsedFlowTitle", currentPage, kPluginDomain);
	settingsWindow.addTextLabelWithValue(strings["generateFlow-flowName"]);
	var nameField = NSTextField.alloc().initWithFrame(NSMakeRect(0,0,300,23));
	nameField.setStringValue( lastUsedFlowTitle || "" );
	settingsWindow.addAccessoryView(nameField);

	var lastUsedFlowDescription = context.command.valueForKey_onLayer_forPluginIdentifier("lastUsedFlowDescription", currentPage, kPluginDomain);
	settingsWindow.addTextLabelWithValue(strings["generateFlow-description"]);
	var descriptionField = NSTextField.alloc().initWithFrame(NSMakeRect(0,0,300,100));
	descriptionField.setStringValue( lastUsedFlowDescription || "" );
	settingsWindow.addAccessoryView(descriptionField);

	var separator = NSBox.alloc().initWithFrame(NSMakeRect(0,0,300,10));
	separator.setBoxType(2);
	settingsWindow.addAccessoryView(separator);

	settingsWindow.addTextLabelWithValue(strings["generateFlow-addToPage"]);
	var pageNames = doc.valueForKeyPath("pages.@unionOfObjects.name")
	if (!pageNames.containsObject("_Flows")) {
		pageNames = NSArray.arrayWithObject("_Flows").arrayByAddingObjectsFromArray(pageNames);
	}
	var newPageItemTitle = "[" + strings["generateFlow-newPage"] + "]";
	pageNames = pageNames.arrayByAddingObject(newPageItemTitle);
	var pagesDropdown = NSPopUpButton.alloc().initWithFrame(NSMakeRect(0,0,300,25));
	pagesDropdown.addItemsWithTitles(pageNames);
	var lastUsedPageName = context.command.valueForKey_onDocument_forPluginIdentifier("lastUsedFlowPage", doc.documentData(), kPluginDomain);
	if (lastUsedPageName && pageNames.containsObject(lastUsedPageName)) {
		pagesDropdown.selectItemWithTitle(lastUsedPageName);
	}
	settingsWindow.addAccessoryView(pagesDropdown);

	var keepOrganized = NSUserDefaults.standardUserDefaults().objectForKey(kKeepOrganizedKey) || 1;
	var keepOrganizedCheckbox = NSButton.alloc().initWithFrame(NSMakeRect(0,0,300,22));
	keepOrganizedCheckbox.setButtonType(NSSwitchButton);
	keepOrganizedCheckbox.setBezelStyle(0);
	keepOrganizedCheckbox.setTitle(strings["generateFlow-keepOrganized"]);
	keepOrganizedCheckbox.setState(keepOrganized);
	settingsWindow.addAccessoryView(keepOrganizedCheckbox);


	var separator = NSBox.alloc().initWithFrame(NSMakeRect(0,0,300,10));
	separator.setBoxType(2);
	settingsWindow.addAccessoryView(separator);

	var includePrototypingConnections = NSUserDefaults.standardUserDefaults().objectForKey(kIncludePrototypingKey) || 1;
	var includePrototypingCheckbox = NSButton.alloc().initWithFrame(NSMakeRect(0,0,300,22));
	includePrototypingCheckbox.setButtonType(NSSwitchButton);
	includePrototypingCheckbox.setBezelStyle(0);
	includePrototypingCheckbox.setTitle(strings["generateFlow-includePrototypingConnections"]);
	includePrototypingCheckbox.setState(includePrototypingConnections);
	settingsWindow.addAccessoryView(includePrototypingCheckbox);

	settingsWindow.alert().window().setInitialFirstResponder(nameField);
	nameField.setNextKeyView(descriptionField);
	descriptionField.setNextKeyView(nameField);

	var response = settingsWindow.runModal();
	if (response == "1000") {

		var settings = {
			flowName : nameField.stringValue(),
			flowDescription : descriptionField.stringValue(),
			shouldOrganizeFlowPage : keepOrganizedCheckbox.state(),
			flowPageName : pagesDropdown.titleOfSelectedItem(),
			includePrototypingConnections : includePrototypingCheckbox.state(),
			newPageItemTitle : newPageItemTitle
		};

		var initialArtboard = artboardsWithLinks.objectAtIndex(artboardsDropdown.indexOfSelectedItem());
		generateFlowWithSettings(context, settings, initialArtboard, currentPage);
		
	}
}

var generateFlowWithSettings = function(context, settings, initialArtboard, sourcePage) {

	var doc = context.document;
	var connectionsOverlayPredicate = NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).isConnectionsContainer == true", kPluginDomain),
		connectionsOverlay = sourcePage.children().filteredArrayUsingPredicate(connectionsOverlayPredicate).firstObject(),
		connectionsGroupVisible;
	if (connectionsOverlay) {
		connectionsOverlayVisible = connectionsOverlay.isVisible();
		connectionsOverlay.setIsVisible(0);
	}

	var exportScale = 1,
		shouldScaleDownBitmaps = true,
		bitmapExportScale = 2,
		exportFormat = NSUserDefaults.standardUserDefaults().objectForKey(kExportFormatKey) || "pdf",
		modifiedBy = NSUserDefaults.standardUserDefaults().objectForKey(kFullNameKey),
		showModifiedDate = NSUserDefaults.standardUserDefaults().objectForKey(kShowModifiedDateKey) || false,
		flowBackground = NSUserDefaults.standardUserDefaults().objectForKey(kFlowBackgroundKey) || "Light",
		flowName = settings.flowName,
		flowDescription = settings.flowDescription,
		artboardBitmapLayers = [],
		connections = [],
		exportedArtboardIDs = {},
		outerPadding = 40*exportScale,
		spacing = 50*exportScale,
		dropPointOffset = (sketchVersion < sketchVersion51) ? 10 : 4,
		screenNumber = 1,
		artboardsToExport = [initialArtboard],
		screenShadowColor = MSImmutableColor.colorWithSVGString("#00000").newMutableCounterpart(),
		tempFolderURL = NSFileManager.defaultManager().URLsForDirectory_inDomains(NSCachesDirectory, NSUserDomainMask).lastObject().URLByAppendingPathComponent(kPluginDomain),
		artboard, detachedArtboard, artboardID, linkLayers, linkLayersCount, destinationArtboard, destinationArtboardID, linkLayer, screenLayer, exportRequest, exportURL, screenShadow, connection, artboardNameLabel, primaryTextColor, secondaryTextColor, flowBackgroundColor, artboardIsConditional, isCondition, destinationArtboardIsConditional, linkRect, destinationRect, sharedBorderStyleID;

	
	context.command.setValue_forKey_onLayer_forPluginIdentifier(initialArtboard.objectID(), "homeScreenID", sourcePage, kPluginDomain);
	context.command.setValue_forKey_onLayer_forPluginIdentifier(flowName, "lastUsedFlowTitle", sourcePage, kPluginDomain);
	context.command.setValue_forKey_onLayer_forPluginIdentifier(flowDescription, "lastUsedFlowDescription", sourcePage, kPluginDomain);
	screenShadowColor.setAlpha(.2);
	exportFormat = exportFormat.toLowerCase();

	if (shouldScaleDownBitmaps == 1) {
		exportScale = 1;
	}

	if (flowBackground == "Dark") {
		flowBackgroundColor = MSImmutableColor.colorWithSVGString("#1E1D1C").newMutableCounterpart();
		primaryTextColor = MSImmutableColor.colorWithSVGString("#FFFFFF");
		secondaryTextColor = MSImmutableColor.colorWithSVGString("#9B9B9B");
	} else {
		flowBackgroundColor = MSImmutableColor.colorWithSVGString("#FFFFFF").newMutableCounterpart();
		primaryTextColor = MSImmutableColor.colorWithSVGString("#121212");
		secondaryTextColor = MSImmutableColor.colorWithSVGString("#999999");
	}

	if(sketchVersion < sketchVersion48) {
		primaryTextColor = primaryTextColor.newMutableCounterpart();
		secondaryTextColor = secondaryTextColor.newMutableCounterpart();
	}

	while(artboardsToExport.length) {
		artboard = artboardsToExport.shift();
		artboardID = artboard.objectID();
		if (exportedArtboardIDs[artboardID] == 1) {
			continue;
		}
		exportedArtboardIDs[artboardID] = 1;
		
		artboardIsConditional = context.command.valueForKey_onLayer_forPluginIdentifier(kConditionalArtboardKey, artboard, kPluginDomain) || 0;

		exportRequest = MSExportRequest.alloc().init();
		exportRequest.setRect(artboard.absoluteRect().rect());
		exportRequest.setScale(bitmapExportScale);
		exportRequest.setShouldTrim(0);
		exportRequest.setSaveForWeb(1);
		exportRequest.setBackgroundColor(( artboard.hasBackgroundColor() ? artboard.backgroundColor() : MSImmutableColor.colorWithSVGString("#FFFFFF").newMutableCounterpart() ));
		exportRequest.setIncludeArtboardBackground(1);
		exportRequest.setName(artboard.objectID());
		exportRequest.setFormat(exportFormat);
		exportURL = tempFolderURL.URLByAppendingPathComponent(artboard.objectID()).URLByAppendingPathExtension(exportFormat);
		doc.saveArtboardOrSlice_toFile(exportRequest, exportURL.path());

		if (sketchVersion < sketchVersion51) {
			screenLayer = MSBitmapLayer.bitmapLayerWithImageFromPath(exportURL);
		}
		else {
			var screenImage = NSImage.alloc().initWithContentsOfURL(exportURL);
			var screenImageData = MSImageData.alloc().initWithImage(screenImage);
			screenLayer = MSBitmapLayer.alloc().initWithFrame_image(NSZeroRect, screenImageData);
		}

		sourcePage.addLayers([screenLayer]);
		screenLayer.absoluteRect().setX(artboard.absoluteRect().x());
		screenLayer.absoluteRect().setY(artboard.absoluteRect().y());
		screenLayer.absoluteRect().setWidth(artboard.absoluteRect().width());
		screenLayer.absoluteRect().setHeight(artboard.absoluteRect().height());

		screenShadow = screenLayer.style().addStylePartOfType(1);
		screenShadow.setColor(screenShadowColor);
		screenShadow.setPosition(2);
		screenShadow.setThickness(1/exportScale);

		artboardBitmapLayers.push(screenLayer);
		NSFileManager.defaultManager().removeItemAtURL_error(exportURL, nil);

		if (artboardIsConditional == 0) {
			artboardNameLabel = MSTextLayer.new();
			sourcePage.addLayers([artboardNameLabel]);
			artboardNameLabel.setName(artboard.name());
			artboardNameLabel.absoluteRect().setX(artboard.absoluteRect().x());
			artboardNameLabel.absoluteRect().setY(artboard.absoluteRect().y());
			artboardNameLabel.frame().setWidth(artboard.frame().width());
			artboardNameLabel.setTextBehaviour(0);
			artboardNameLabel.setStringValue(screenNumber + ": " + artboard.name());
			artboardNameLabel.addAttribute_value(NSFontAttributeName, NSFont.fontWithName_size("HelveticaNeue", 12*exportScale));
			artboardNameLabel.setTextColor(primaryTextColor);
			artboardNameLabel.adjustFrameToFit();
			artboardNameLabel.absoluteRect().setY(artboard.absoluteRect().y() - (artboardNameLabel.absoluteRect().height()/exportScale) - (6*exportScale));

			artboardBitmapLayers.push(artboardNameLabel);

			screenNumber++;
		}

		linkLayers = artboard.children().filteredArrayUsingPredicate(linkLayerPredicate).sortedArrayUsingDescriptors([
			NSSortDescriptor.sortDescriptorWithKey_ascending("absoluteRect.rulerY", true)
		]);
		linkLayersCount = linkLayers.count();

		for (var i=0; i < linkLayersCount; i++) {
		  linkLayer = linkLayers.objectAtIndex(i);
		  destinationArtboardID = context.command.valueForKey_onLayer_forPluginIdentifier("destinationArtboardID", linkLayer, kPluginDomain);
		  sharedBorderStyleID = context.command.valueForKey_onLayer_forPluginIdentifier("sharedBorderStyleID", linkLayer, kPluginDomain);

		  destinationArtboard = sourcePage.artboards().filteredArrayUsingPredicate(NSPredicate.predicateWithFormat("objectID == %@", destinationArtboardID)).firstObject();

		  if (destinationArtboard) {
		  	destinationArtboardIsConditional = context.command.valueForKey_onLayer_forPluginIdentifier(kConditionalArtboardKey, destinationArtboard, kPluginDomain) || 0;

		  	isCondition = context.command.valueForKey_onLayer_forPluginIdentifier("isConditionGroup", linkLayer, kPluginDomain) || 0;

		  	linkRect = linkLayer.parentArtboard() == nil ? linkLayer.absoluteRect().rect() : CGRectIntersection(linkLayer.absoluteRect().rect(), linkLayer.parentArtboard().absoluteRect().rect());

		  	destinationRect = destinationArtboard.absoluteRect().rect();

		  	connection = {
		  		linkRect : linkRect,
		  		linkID : linkLayer.objectID(),
		  		linkIsCondition : isCondition,
		  		destinationIsConditional : destinationArtboardIsConditional,
		  		destinationRect : destinationRect,
		  		sharedBorderStyleID : sharedBorderStyleID,
		  		dropPoint : {
		  			x : destinationArtboard.absoluteRect().x() - (10*exportScale),
		  			y : destinationArtboard.absoluteRect().y() - (10*exportScale)
		  		}
		  	}
		  	connections.push(connection);
			artboardsToExport.push(destinationArtboard);

		  }
		}

		// Flow Connections
		if (settings.includePrototypingConnections && sketchVersion >= sketchVersion49) {
			var immutableArtboard = artboard.ancestry().layer();
			if (immutableArtboard.containsFlowWithSymbolsFromDocument(doc.immutableDocumentData())) {
				
				detachedArtboard = artboardWithDetachedSymbolsFromArtboard(artboard);

				var flowConnections = detachedArtboard.valueForKeyPath("children.@distinctUnionOfObjects.flow");
				var loop = flowConnections.objectEnumerator(), flowConnection, dropPointX, dropPointY;

				while (flowConnection = loop.nextObject()) {
					
					linkLayer = flowConnection.sendingLayer();
					linkRect = CGRectIntersection(linkLayer.absoluteRect().rect(), linkLayer.parentArtboard().absoluteRect().rect());
					
					sharedBorderStyleID = context.command.valueForKey_onLayer_forPluginIdentifier("sharedBorderStyleID", linkLayer, kPluginDomain);

					connection = {
				  		linkRect : linkRect,
				  		isBackAction : flowConnection.isBackAction(),
				  		sharedBorderStyleID : sharedBorderStyleID,
				  		linkIsCrossPage : false
				  	};

					if (flowConnection.isBackAction()) {
						dropPointX = artboard.absoluteRect().x() - (30*exportScale);
						dropPointY = artboard.absoluteRect().y() - (30*exportScale);
						connection.destinationRect = CGRectMake(dropPointX - 20, dropPointY, 10, 10);
				  		connections.push(connection);

					} else if (flowConnection.destinationArtboard()) {
						destinationArtboard = flowConnection.destinationArtboard();
						connection.linkIsCrossPage = destinationArtboard.parentPage() != sourcePage;

						if(connection.linkIsCrossPage) {
							dropPointX = artboard.absoluteRect().x() + artboard.absoluteRect().width() + (50*exportScale);
							dropPointY = artboard.absoluteRect().y() - (30*exportScale);

							connection.destinationRect = CGRectMake(dropPointX, dropPointY, 10, 10);
							connection.artboardName = destinationArtboard.name();
							connection.artboardParentName = destinationArtboard.parentPage().name();

						} else {
							dropPointX = destinationArtboard.absoluteRect().x() - (dropPointOffset*exportScale);
							dropPointY = destinationArtboard.absoluteRect().y() + (destinationArtboard.absoluteRect().height()/2);

							destinationRect = destinationArtboard.absoluteRect().rect();
							connection.destinationRect = destinationRect;

							artboardsToExport.push(destinationArtboard);

							connection.dropPoint = {
								x: dropPointX,
								y: destinationArtboard.absoluteRect().y()
							}
						}

				  		connections.push(connection);

					}

				}

				detachedArtboard.removeFromParent();
				detachedArtboard = nil;

			}
		}
	}

	if (connectionsOverlay) {
		connectionsOverlay.setIsVisible(connectionsOverlayVisible);
	}

	var sharedLayerStyles = sharedLayerStylesForContext(context);
	var connectionLayers = MSLayerArray.arrayWithLayers(drawConnections(connections, sourcePage, exportScale, flowBackgroundColor, sharedLayerStyles));
	var connectionsGroup = MSLayerGroup.groupFromLayers(connectionLayers);
	connectionsGroup.setName(strings["generateFlow-connectionsGroupName"]);
	artboardBitmapLayers.push(connectionsGroup);
	connectionsGroup.setIsLocked(1);

	var groupBounds = CGRectZero;
	for (var i = 0; i < artboardBitmapLayers.length; i++) {
		groupBounds = CGRectUnion(groupBounds, artboardBitmapLayers[i].absoluteRect().rect());
	}
	var layers = MSLayerArray.arrayWithLayers(artboardBitmapLayers);
	var newGroup = MSLayerGroup.groupFromLayers(layers);
	newGroup.setName(strings["generateFlow-flowGroupName"]);
	newGroup.resizeToFitChildrenWithOption(1);

	var flowBoard = MSArtboardGroup.new();
	flowBoard.setName(flowName);
	flowBoard.setHasBackgroundColor(1);
	flowBoard.setBackgroundColor(flowBackgroundColor);

	var flowNameLabel = MSTextLayer.new();
	flowNameLabel.setName(flowName);
	flowNameLabel.frame().setX(outerPadding);
	flowNameLabel.frame().setY(outerPadding);
	flowNameLabel.frame().setWidth(Math.min(groupBounds.size.width, 1200));
	flowNameLabel.setTextBehaviour(1);
	flowNameLabel.setStringValue(flowName);
	flowNameLabel.addAttribute_value(NSFontAttributeName, NSFont.fontWithName_size("HelveticaNeue", 36*exportScale));
	flowNameLabel.setTextColor(primaryTextColor);
	flowNameLabel.setLineHeight(36*1.3*exportScale);
	flowNameLabel.adjustFrameToFit();
	flowBoard.addLayers([flowNameLabel]);

	var yPos = outerPadding + flowNameLabel.frame().height() + 18;
	var flowDescriptionLabel;
	if (flowDescription && flowDescription != "") {
		flowDescriptionLabel = MSTextLayer.new();
		flowDescriptionLabel.setName(strings["generateFlow-description"]);
		flowDescriptionLabel.frame().setX(outerPadding);
		flowDescriptionLabel.frame().setY(yPos);
		flowDescriptionLabel.frame().setWidth(Math.min(groupBounds.size.width, 600));
		flowDescriptionLabel.setTextBehaviour(1);
		flowDescriptionLabel.setStringValue(flowDescription);
		flowDescriptionLabel.addAttribute_value(NSFontAttributeName, NSFont.fontWithName_size("HelveticaNeue", 16*exportScale));
		flowDescriptionLabel.setTextColor(secondaryTextColor);
		flowDescriptionLabel.setLineHeight(16*1.4*exportScale);
		flowDescriptionLabel.adjustFrameToFit();
		flowBoard.addLayers([flowDescriptionLabel]);
		yPos = flowDescriptionLabel.frame().y() + flowDescriptionLabel.frame().height();
	}

	var modifiedDateLabel;
	if (showModifiedDate == 1) {

		var formatter = NSDateFormatter.alloc().init();
		formatter.setTimeStyle(NSDateFormatterNoStyle);
		formatter.setDateStyle(NSDateFormatterMediumStyle);

		modifiedDateLabel = MSTextLayer.new();
		var modifiedOnText;
		if (modifiedBy && modifiedBy != "") {
			modifiedOnText = strings["generateFlow-modifiedBy"].stringByReplacingOccurrencesOfString_withString("%date%", formatter.stringFromDate(NSDate.date())).stringByReplacingOccurrencesOfString_withString("%user%", modifiedBy);
		} else {
			modifiedOnText = strings["generateFlow-modifiedOnDate"].stringByReplacingOccurrencesOfString_withString("%date%", formatter.stringFromDate(NSDate.date()))
		}

		yPos += 12;

		modifiedDateLabel.setName(strings["generateFlow-modifiedDate"]);
		modifiedDateLabel.frame().setX(outerPadding);
		modifiedDateLabel.frame().setY(yPos);
		modifiedDateLabel.frame().setWidth(Math.min(groupBounds.size.width - (outerPadding*2), 600));
		modifiedDateLabel.setTextBehaviour(1);
		modifiedDateLabel.setStringValue(modifiedOnText);
		modifiedDateLabel.addAttribute_value(NSFontAttributeName, NSFont.fontWithName_size("HelveticaNeue", 12*exportScale));
		modifiedDateLabel.setTextColor(secondaryTextColor);
		modifiedDateLabel.adjustFrameToFit();
		flowBoard.addLayers([modifiedDateLabel]);

		yPos += modifiedDateLabel.frame().height();
	}

	yPos += 60;

	newGroup.removeFromParent();
	flowBoard.addLayers([newGroup]);
	newGroup.frame().setX(outerPadding);
	newGroup.frame().setY(yPos);
	flowBoard.frame().setWidth(newGroup.frame().width() + (outerPadding*2));
	flowBoard.frame().setHeight(yPos + newGroup.frame().height() + outerPadding);
	newGroup.ungroup();

	var labelWidth = flowBoard.frame().width() - (outerPadding*2);
	flowNameLabel.frame().setWidth(Math.min(labelWidth, 1200));
	flowNameLabel.setTextAlignment( 0 );
	if (flowDescriptionLabel) {
		flowDescriptionLabel.frame().setWidth(Math.min(labelWidth, 600));
		flowDescriptionLabel.setTextAlignment( 0 );
	}
	if (modifiedDateLabel) {
		modifiedDateLabel.frame().setWidth(Math.min(labelWidth, 600));
		modifiedDateLabel.setTextAlignment( 0 );
	}

	var flowPageName = settings.flowPageName,
		flowPage = doc.pages().filteredArrayUsingPredicate(NSPredicate.predicateWithFormat("name == %@", flowPageName)).firstObject();
	if (!flowPage) {
		flowPage = doc.addBlankPage();
		if (flowPageName == settings.newPageItemTitle) {
			flowPageName = "Page " + doc.pages().count();
		}
		flowPage.setName(flowPageName);
	}

	flowPage.addLayers([flowBoard]);

	context.command.setValue_forKey_onDocument_forPluginIdentifier(flowPageName, "lastUsedFlowPage", doc.documentData(), kPluginDomain);
	context.command.setValue_forKey_onLayer_forPluginIdentifier(initialArtboard.objectID(), "homeScreenID", flowBoard, kPluginDomain);
	context.command.setValue_forKey_onLayer_forPluginIdentifier(sourcePage.objectID(), "pageID", flowBoard, kPluginDomain);
	context.command.setValue_forKey_onLayer_forPluginIdentifier(shouldOrganize, "keepFlowPageOrganized", flowBoard, kPluginDomain);
	context.command.setValue_forKey_onLayer_forPluginIdentifier(settings.includePrototypingConnections, "includePrototypingConnections", flowBoard, kPluginDomain);

	if(flowNameLabel) {
		context.command.setValue_forKey_onLayer_forPluginIdentifier(flowNameLabel.objectID(), "titleLayerID", flowBoard, kPluginDomain);
	}
	if (flowDescriptionLabel) {
		context.command.setValue_forKey_onLayer_forPluginIdentifier(flowDescriptionLabel.objectID(), "descriptionLayerID", flowBoard, kPluginDomain);
	}

	flowBoard.setConstrainProportions(false);
	flowBoard.resizeToFitChildrenWithOption(0);
	flowBoard.exportOptions().addExportFormat();

	var shouldOrganize = settings.shouldOrganizeFlowPage;
	if (shouldOrganize && flowPageName == "_Flows") {

		var loop = flowPage.artboards().objectEnumerator(),
			i = 0, newX = 0, newY = 0, maxHeight = 0,
			spacing = 160, artboard;
		while (artboard = loop.nextObject()) {
			artboard.frame().setX(newX);
			artboard.frame().setY(newY);
			newX += artboard.frame().width() + spacing;
			maxHeight = Math.max(artboard.frame().height(), maxHeight);
			if (++i == 6) {
				i = 0
				newY += maxHeight + (spacing * 2);
				newX = maxHeight = 0;
			}
		}
	} else {
		var originForNewArtboard;
		if (flowPage.originForNewArtboard) {
			originForNewArtboard = flowPage.originForNewArtboard();
		} else {
			originForNewArtboard = flowPage.originForNewArtboardWithSize(flowBoard.absoluteRect().rect().size);
		}
		flowBoard.absoluteRect().setX(originForNewArtboard.x);
		flowBoard.absoluteRect().setY(originForNewArtboard.y);
	}

	doc.setCurrentPage(flowPage);
	flowBoard.select_byExtendingSelection(true, false);
	var visibleContentRect = NSInsetRect(flowBoard.absoluteRect().rect(), -60, -60);
	var currentView = sketchVersion < sketchVersion48 ? doc.currentView() : doc.contentDrawView();
	currentView.zoomToFitRect(visibleContentRect);

	NSUserDefaults.standardUserDefaults().setObject_forKey(shouldOrganize, kKeepOrganizedKey);
	NSUserDefaults.standardUserDefaults().setObject_forKey(settings.includePrototypingConnections, kIncludePrototypingKey);

	var eventID = settings.updatingFlow ? "updatedFlow" : "generatedFlow";
	logEvent(eventID, {numberOfScreens : screenNumber, format : exportFormat, exportScale : exportScale});
}

var updateFlow = function(context) {
	
	parseContext(context);
		
	var doc = context.document;
	var currentArtboard = doc.currentPage().currentArtboard();

	var homeScreenID = context.command.valueForKey_onLayer_forPluginIdentifier("homeScreenID", currentArtboard, kPluginDomain);
	var sourcePageID = context.command.valueForKey_onLayer_forPluginIdentifier("pageID", currentArtboard, kPluginDomain);
	if (!homeScreenID || !sourcePageID) {
		showAlert(strings["updateFlow-noFlowArtboard"], strings["updateFlow-noFlowArtboardMessage"]);
		return;
	}

	var sourcePage = doc.documentData().layerWithID(sourcePageID);
	var initialArtboard = doc.documentData().layerWithID(homeScreenID);
	if(!sourcePage || !initialArtboard) {
		showAlert(strings["updateFlow-noInitialArtboard"], strings["updateFlow-noInitialArtboardMessage"]);
		return;
	}

	var settingsWindow = getAlertWindow();
	settingsWindow.addButtonWithTitle(strings["updateFlow-saveButtonTitle"]);
	settingsWindow.addButtonWithTitle(strings["alerts-cancel"]);

	settingsWindow.setMessageText(strings["updateFlow-message"]);

	var titleLabelID = context.command.valueForKey_onLayer_forPluginIdentifier("titleLayerID", currentArtboard, kPluginDomain);
	var descriptionLabelID = context.command.valueForKey_onLayer_forPluginIdentifier("descriptionLayerID", currentArtboard, kPluginDomain);
	var keepFlowPageOrganized = context.command.valueForKey_onLayer_forPluginIdentifier("keepFlowPageOrganized", currentArtboard, kPluginDomain);
	var includePrototypingConnections = context.command.valueForKey_onLayer_forPluginIdentifier("includePrototypingConnections", currentArtboard, kPluginDomain);
	
	var flowName = "";
	if (titleLabelID) {
		var titleLabel = doc.documentData().layerWithID(titleLabelID)
		if(titleLabel) flowName = titleLabel.stringValue();
	}

	settingsWindow.addTextLabelWithValue(strings["generateFlow-flowName"]);
	var nameField = NSTextField.alloc().initWithFrame(NSMakeRect(0,0,300,23));
	nameField.setStringValue(flowName);
	settingsWindow.addAccessoryView(nameField);


	var flowDescription = "";
	if (descriptionLabelID) {
		var descriptionLabel = doc.documentData().layerWithID(descriptionLabelID)
		if(descriptionLabel) flowDescription = descriptionLabel.stringValue();
	}

	settingsWindow.addTextLabelWithValue(strings["generateFlow-description"]);
	var descriptionField = NSTextField.alloc().initWithFrame(NSMakeRect(0,0,300,100));
	descriptionField.setStringValue( flowDescription );
	settingsWindow.addAccessoryView(descriptionField);

	settingsWindow.alert().window().setInitialFirstResponder(nameField);
	nameField.setNextKeyView(descriptionField);
	descriptionField.setNextKeyView(nameField);

	var response = settingsWindow.runModal();
	if (response == "1000") {

		linkLayerPredicate = NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).destinationArtboardID != nil", kPluginDomain);

		var settings = {
			updatingFlow : true,
			flowName : nameField.stringValue(),
			flowDescription : descriptionField.stringValue(),
			shouldOrganizeFlowPage : keepFlowPageOrganized,
			flowPageName : doc.currentPage().name(),
			includePrototypingConnections : includePrototypingConnections
		};

		currentArtboard.removeFromParent();

		doc.setCurrentPage(sourcePage);

		generateFlowWithSettings(context, settings, initialArtboard, sourcePage);
		doc.showMessage("✅ " + strings["updateFlow-completed"]);
	}
}

var hideConnections = function(context) {

	var doc = context.document;
	var connectionsGroup = getConnectionsGroupInPage(doc.currentPage());

	if (connectionsGroup) {
		connectionsGroup.removeFromParent();
	}

	NSUserDefaults.standardUserDefaults().setObject_forKey(0, kShowConnectionsKey);
}

var showConnections = function(context) {

	NSUserDefaults.standardUserDefaults().setObject_forKey(1, kShowConnectionsKey);

	redrawConnections(context);
}

var sharedLayerStylesForContext = function(context) {

	var dict = {};

	if(sketchVersion < sketchVersion51) return dict;

	var doc = context.document || context.actionContext.document,
		localStyles = doc.documentData().layerStyles().sharedStyles(),
		foreignStyles = doc.documentData().valueForKeyPath("foreignLayerStyles.@unionOfObjects.localSharedStyle"),
		availableStyles = localStyles.arrayByAddingObjectsFromArray(foreignStyles),
		predicate = NSPredicate.predicateWithFormat("style.firstEnabledFill == nil"),
		borderStyles = availableStyles.filteredArrayUsingPredicate(predicate),
		loop = borderStyles.objectEnumerator(),
		sharedStyle;
	
	while(sharedStyle = loop.nextObject()) {
		dict[sharedStyle.objectID()] = sharedStyle;
	}

	return dict;
}

var redrawConnections = function(context) {
	var doc = context.document || context.actionContext.document;
	var selectedLayers = doc.selectedLayers().layers();

	sketchVersion = getVersionNumberFromString(NSBundle.mainBundle().objectForInfoDictionaryKey("CFBundleShortVersionString"));

	var connectionsGroup = getConnectionsGroupInPage(doc.currentPage());
	if (connectionsGroup) {
		connectionsGroup.removeFromParent();
	}

	var linkLayersPredicate = NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).destinationArtboardID != nil", kPluginDomain),
		linkLayers = doc.currentPage().children().filteredArrayUsingPredicate(linkLayersPredicate),
		loop = linkLayers.objectEnumerator(),
		connections = [],
		dropPointOffset = (sketchVersion < sketchVersion51) ? 10 : 4,
		linkLayer, destinationArtboardID, destinationArtboard, isCondition, linkRect, sharedBorderStyleID;

	var parentArtboards = linkLayers.valueForKeyPath("@distinctUnionOfObjects.parentArtboard"),
		loop2 = parentArtboards.objectEnumerator(),
		parentArtboard;
	while(parentArtboard = loop2.nextObject()) {
		parentArtboard.exportOptions().setLayerOptions(2);
	}

	while (linkLayer = loop.nextObject()) {

		destinationArtboardID = context.command.valueForKey_onLayer_forPluginIdentifier("destinationArtboardID", linkLayer, kPluginDomain);
		sharedBorderStyleID = context.command.valueForKey_onLayer_forPluginIdentifier("sharedBorderStyleID", linkLayer, kPluginDomain);

		destinationArtboard = doc.currentPage().artboards().filteredArrayUsingPredicate(NSPredicate.predicateWithFormat("objectID == %@", destinationArtboardID)).firstObject();

		if (destinationArtboard) {
			destinationArtboard.exportOptions().setLayerOptions(2);

			isCondition = context.command.valueForKey_onLayer_forPluginIdentifier("isConditionGroup", linkLayer, kPluginDomain) || 0;
			linkRect = linkLayer.parentArtboard() == nil ? linkLayer.absoluteRect().rect() : CGRectIntersection(linkLayer.absoluteRect().rect(), linkLayer.parentArtboard().absoluteRect().rect());

			sanitizeArtboard(destinationArtboard, context);

			connection = {
		  		linkRect : linkRect,
		  		linkID : linkLayer.objectID(),
		  		linkIsCondition : isCondition,
		  		destinationRect : destinationArtboard.absoluteRect().rect(),
		  		sharedBorderStyleID : sharedBorderStyleID,
		  		dropPoint : {
		  			x : destinationArtboard.absoluteRect().x() - dropPointOffset,
		  			y : destinationArtboard.absoluteRect().y()
		  		}
		  	}
		  	connections.push(connection);
		}
	}

	var sharedLayerStyles = sharedLayerStylesForContext(context);
	var connectionLayers = MSLayerArray.arrayWithLayers(drawConnections(connections, doc.currentPage(), 1, nil, sharedLayerStyles));
	connectionsGroup = MSLayerGroup.groupFromLayers(connectionLayers);
	connectionsGroup.setName("-Connections");
	connectionsGroup.setIsLocked(1);
	connectionsGroup.deselectLayerAndParent();
	context.command.setValue_forKey_onLayer_forPluginIdentifier(true, "isConnectionsContainer", connectionsGroup, kPluginDomain);

	var loop = selectedLayers.objectEnumerator(), selectedLayer;
	while (selectedLayer = loop.nextObject()) {
		selectedLayer.select_byExtendingSelection(true, true);
	}

	return connectionsGroup;
}

var drawConnections = function(connections, parent, exportScale, labelColor, sharedBorderStyles) {
	var connectionsCount = connections.length,
		flowIndicatorColor = NSUserDefaults.standardUserDefaults().objectForKey(kFlowIndicatorColorKey) || "#F5A623",
		flowIndicatorAlpha = NSUserDefaults.standardUserDefaults().objectForKey(kFlowIndicatorAlphaKey) || 1,
		minimumTapArea = NSUserDefaults.standardUserDefaults().objectForKey(kMinTapAreaKey) || 44,
		showLinkRects = NSUserDefaults.standardUserDefaults().objectForKey(kShowsLinkRectsKey) || 1,
		strokeWidth = NSUserDefaults.standardUserDefaults().objectForKey(kStrokeWidthKey) || 3,
		connectionType = NSUserDefaults.standardUserDefaults().objectForKey(kConnectionTypeKey) || "curved",
		magnetsType = NSUserDefaults.standardUserDefaults().objectForKey(kMagnetsTypeKey) || "nsew",
		connectionLayers = [],
		hitAreaColor = MSImmutableColor.colorWithSVGString("#000000").newMutableCounterpart(),
		hitAreaBorderColor = MSImmutableColor.colorWithSVGString(flowIndicatorColor).newMutableCounterpart(),
		arrowRotation = 0,
		arrowOffsetX = 0,
		shouldUseMarkers = sketchVersion >= sketchVersion51,
		destinationRectInset = shouldUseMarkers ? -4 : -12,
		dropPointYOffset = shouldUseMarkers ? 20 : 30,
		path, hitAreaLayer, linkRect, destinationRect, dropPoint, hitAreaBorder, startPoint, controlPoint1, controlPoint2, controlPoint1Offset, controlPoint2OffsetX, controlPoint2OffsetY, linePath, lineLayer, destinationArtboardIsConditional, originPoint, degrees, connectionPosition, controlPointOffset, minControlPointOffset, sharedBorderStyleID, sharedBorderStyle, linkLayerHasSharedStyleReference, straightConnection;
	hitAreaColor.setAlpha(0);
	hitAreaBorderColor.setAlpha(flowIndicatorAlpha);

	for (var i=0; i < connectionsCount; i++) {
		connection = connections[i];
		linkRect = connection.linkRect;

		sharedBorderStyleID = connection.sharedBorderStyleID;
		if (shouldUseMarkers && sharedBorderStyleID) {
			sharedBorderStyle = sharedBorderStyles[sharedBorderStyleID];
		} else {
			sharedBorderStyle = nil;
		}
		linkLayerHasSharedStyleReference = sharedBorderStyle != nil;

		if (showLinkRects == 1 && connection.linkIsCondition != 1) {

			if (linkRect.size.width < minimumTapArea) {
				linkRect = NSInsetRect(linkRect, (linkRect.size.width-minimumTapArea)/2, 0);
			}
			if (linkRect.size.height < minimumTapArea) {
				linkRect = NSInsetRect(linkRect, 0, (linkRect.size.height-minimumTapArea)/2);
			}

			path = NSBezierPath.bezierPathWithRect(linkRect);
			hitAreaLayer = sketchVersion < sketchVersion50 ? MSShapeGroup.shapeWithBezierPath(path) : MSShapeGroup.shapeWithBezierPath(MSPath.pathWithBezierPath(path));
			hitAreaLayer.style().addStylePartOfType(0).setColor(hitAreaColor);
			hitAreaBorder = hitAreaLayer.style().addStylePartOfType(1);
			hitAreaBorder.setColor(hitAreaBorderColor);
			hitAreaBorder.setPosition(2);
			hitAreaBorder.setThickness(2*exportScale);

			if (linkLayerHasSharedStyleReference) {
				hitAreaLayer.setStyle(sharedBorderStyle.newInstance());
			}

			hitAreaLayer.style().fills().removeAllObjects();
			hitAreaLayer.style().addStylePartOfType(0).setColor(hitAreaColor);

			parent.addLayers([hitAreaLayer]);
			connectionLayers.push(hitAreaLayer);
		}

		destinationArtboardIsConditional = connection.destinationIsConditional == 1;
		destinationRect = connection.destinationRect;

		if (destinationRect && (magnetsType == "nsew" || connection.isBackAction || connection.linkIsCrossPage)) {

			destinationRect = CGRectInset(destinationRect, destinationRectInset, destinationRectInset);
			
			if (CGRectGetMinX(destinationRect) >= CGRectGetMaxX(linkRect)) {
				connectionPosition = "right";
			} else if(CGRectGetMaxX(destinationRect) <= CGRectGetMinX(linkRect)) {
				connectionPosition = "left";
			} else {
				if(CGRectGetMinY(linkRect) > CGRectGetMaxY(destinationRect)) {
					connectionPosition = "top";
				}
				else {
					connectionPosition = "bottom";
				}
			}

			minControlPointOffset = connection.isBackAction || connection.linkIsCrossPage ? 0 : 160;

			switch(connectionPosition) {

				case "right":

					startPoint = NSMakePoint(CGRectGetMaxX(linkRect), CGRectGetMidY(linkRect));
					dropPoint = NSMakePoint(CGRectGetMinX(destinationRect), CGRectGetMidY(destinationRect));

					controlPointOffset = Math.max(Math.min(Math.abs(dropPoint.x - startPoint.x), 160), minControlPointOffset);
					controlPoint1 = NSMakePoint(startPoint.x + controlPointOffset, startPoint.y);
					controlPoint2 = NSMakePoint(dropPoint.x - controlPointOffset, dropPoint.y);

					arrowRotation = 0;
					arrowOffsetX = 0;

				break;

				case "left":

					startPoint = NSMakePoint(CGRectGetMinX(linkRect), CGRectGetMidY(linkRect));
					dropPoint = NSMakePoint(CGRectGetMaxX(destinationRect), CGRectGetMidY(destinationRect));

					controlPointOffset = Math.max(Math.min(Math.abs(dropPoint.x - startPoint.x), 160), minControlPointOffset);
					controlPoint1 = NSMakePoint(startPoint.x - controlPointOffset, startPoint.y);
					controlPoint2 = NSMakePoint(dropPoint.x + controlPointOffset, dropPoint.y);

					arrowRotation = 180;
					arrowOffsetX = 2;

				break;

				case "top":

					startPoint = NSMakePoint(CGRectGetMidX(linkRect), CGRectGetMinY(linkRect));
					dropPoint = NSMakePoint(CGRectGetMidX(destinationRect), CGRectGetMaxY(destinationRect));

					controlPointOffset = Math.max(Math.min(Math.abs(dropPoint.y - startPoint.y), 160), minControlPointOffset);
					controlPoint1 = NSMakePoint(startPoint.x, startPoint.y - controlPointOffset);
					controlPoint2 = NSMakePoint(dropPoint.x, dropPoint.y + controlPointOffset);

					arrowRotation = -90;
					arrowOffsetX = 2;

				break;

				case "bottom":

					dropPoint = NSMakePoint(CGRectGetMidX(destinationRect), CGRectGetMinY(destinationRect));
					startPoint = NSMakePoint(CGRectGetMidX(linkRect), CGRectGetMaxY(linkRect));

					controlPointOffset = Math.max(Math.min(Math.abs(dropPoint.y - startPoint.y), 160), minControlPointOffset);
					controlPoint1 = NSMakePoint(startPoint.x, startPoint.y + controlPointOffset);
					controlPoint2 = NSMakePoint(dropPoint.x, dropPoint.y - controlPointOffset);

					arrowRotation = 90;
					arrowOffsetX = 2;

				break;			

			}
		}
		else {

			dropPoint = destinationArtboardIsConditional ? NSMakePoint(connection.dropPoint.x+(5*exportScale), connection.dropPoint.y + (10*exportScale)) : NSMakePoint(connection.dropPoint.x, connection.dropPoint.y);
			if (dropPoint.x < CGRectGetMinX(linkRect)) {
				dropPoint = NSMakePoint(dropPoint.x + 18, dropPoint.y - (dropPointYOffset/exportScale) );
				arrowRotation = 90;
				arrowOffsetX = 2;
				if (dropPoint.y < CGRectGetMinY(linkRect)) {
					startPoint = NSMakePoint(CGRectGetMidX(linkRect), CGRectGetMinY(linkRect) + 5);
					controlPoint1Offset = Math.max(Math.abs(dropPoint.y - startPoint.y)/2, 200);
					controlPoint1 = NSMakePoint(startPoint.x, startPoint.y - controlPoint1Offset);
				} else {
					startPoint = NSMakePoint(CGRectGetMidX(linkRect), CGRectGetMaxY(linkRect) - 5);
					controlPoint1Offset = Math.max(Math.abs(dropPoint.y - startPoint.y)/2, 200);
					controlPoint1 = NSMakePoint(startPoint.x, startPoint.y + controlPoint1Offset);
				}
				controlPoint2OffsetX = 0;
				controlPoint2OffsetY = -160;

			} else {
				startPoint = NSMakePoint(CGRectGetMaxX(linkRect) - 5, CGRectGetMidY(linkRect));
				controlPoint1Offset = Math.max(Math.abs(dropPoint.x - startPoint.x)/2, 100);
				controlPoint1 = NSMakePoint(startPoint.x + controlPoint1Offset, startPoint.y);
				controlPoint2OffsetY = 0;
				controlPoint2OffsetX = Math.max(Math.abs(dropPoint.x - startPoint.x)/2, 100);
				arrowRotation = 0;
				arrowOffsetX = 0;
			}

			controlPoint2 = NSMakePoint(dropPoint.x - controlPoint2OffsetX, dropPoint.y + controlPoint2OffsetY);
		}

		if(!shouldUseMarkers) {
			linkRect = NSInsetRect(NSMakeRect(startPoint.x, startPoint.y, 0, 0), -5, -5);
			path = NSBezierPath.bezierPathWithOvalInRect(linkRect);
			hitAreaLayer = sketchVersion < sketchVersion50 ? MSShapeGroup.shapeWithBezierPath(path) : MSShapeGroup.shapeWithBezierPath(MSPath.pathWithBezierPath(path));
			hitAreaLayer.style().addStylePartOfType(0).setColor(hitAreaBorderColor);
			parent.addLayers([hitAreaLayer]);
			connectionLayers.push(hitAreaLayer);
		}

		
		linePath = NSBezierPath.bezierPath();
		linePath.moveToPoint(startPoint);
		straightConnection = connectionType == "straight" || Math.abs(startPoint.x-dropPoint.x) < 20 || Math.abs(startPoint.y-dropPoint.y) < 20;
		if (straightConnection) {
			linePath.lineToPoint(dropPoint);
			originPoint = CGPointMake(dropPoint.x - startPoint.x, dropPoint.y - startPoint.y);
    		degrees = Math.atan2(originPoint.y, originPoint.x) * (180.0 / Math.PI);
    		arrowRotation = (degrees > 0.0 ? degrees : (360.0 + degrees));
    		if (arrowRotation < 110 || arrowRotation > 255) { arrowOffsetX = 2 };
		} 
		else if (connectionType == "curved") {
			linePath.curveToPoint_controlPoint1_controlPoint2(dropPoint, controlPoint1, controlPoint2);
		}
		

		lineLayer = sketchVersion < sketchVersion50 ? MSShapeGroup.shapeWithBezierPath(linePath) : MSShapeGroup.shapeWithBezierPath(MSPath.pathWithBezierPath(linePath));
		lineLayer.setName("Flow arrow");
		hitAreaBorder = lineLayer.style().addStylePartOfType(1);
		hitAreaBorder.setColor(hitAreaBorderColor);
		hitAreaBorder.setThickness(strokeWidth*exportScale);
		hitAreaBorder.setPosition(0);

		if (linkLayerHasSharedStyleReference) {
			lineLayer.setStyle(sharedBorderStyle.newInstance());
		}
		
		parent.addLayers([lineLayer]);

		if (shouldUseMarkers && !linkLayerHasSharedStyleReference && !connection.isBackAction && !connection.linkIsCrossPage) {
			var startMarkerType = NSUserDefaults.standardUserDefaults().objectForKey(kStartMarkerTypeKey) || "4";
			var endMarkerType = NSUserDefaults.standardUserDefaults().objectForKey(kEndMarkerTypeKey) || "2";
			lineLayer.style().setStartMarkerType(parseInt(startMarkerType));
			lineLayer.style().setEndMarkerType(parseInt(endMarkerType));
		}

		connectionLayers.push(lineLayer);

		// draw backlink and crossPage layers
		if (connection.isBackAction) {

			var backLabel = MSTextLayer.new();
				backLabel.setName("Back");
				backLabel.absoluteRect().setX(dropPoint.x);
				backLabel.absoluteRect().setY(dropPoint.y);
				backLabel.frame().setWidth(300);
				backLabel.setStringValue("BACK");
				backLabel.addAttribute_value(NSFontAttributeName, NSFont.fontWithName_size("HelveticaNeue", 11*exportScale));
				backLabel.setTextColor(labelColor);
				backLabel.setTextBehaviour(0);
				backLabel.adjustFrameToFit();

			var padding = (14*exportScale);
			var backBackgroundWidth = Math.ceil(backLabel.frame().width()) + padding;
			var backBackgroundHeight = Math.ceil(backLabel.frame().height()) + padding;
			
			var backBG = MSShapeGroup.shapeWithPath(MSRectangleShape.alloc().initWithFrame(NSMakeRect(0, 0, backBackgroundWidth, backBackgroundHeight)));
			backBG.firstLayer().setCornerRadiusFloat(5);
			backBG.style().addStylePartOfType(0).setColor(hitAreaBorderColor);

			backBG.absoluteRect().setX(dropPoint.x - backBackgroundWidth);
			backBG.absoluteRect().setY(dropPoint.y - Math.ceil(backBackgroundHeight / 2));

			backLabel.absoluteRect().setX(dropPoint.x - backBackgroundWidth + (padding/2));
			backLabel.absoluteRect().setY(backBG.absoluteRect().y() + (padding/2));

			parent.addLayers([backBG, backLabel]);

			connectionLayers.push(backBG);
			connectionLayers.push(backLabel);

		}
		else if(connection.linkIsCrossPage) {

			var pageNameLabel = MSTextLayer.new();
				pageNameLabel.setName(connection.artboardParentName);
				pageNameLabel.absoluteRect().setX(dropPoint.x);
				pageNameLabel.absoluteRect().setY(dropPoint.y);
				pageNameLabel.frame().setWidth(300);
				pageNameLabel.setTextBehaviour(0);
				pageNameLabel.setStringValue(connection.artboardParentName);
				pageNameLabel.addAttribute_value(NSFontAttributeName, NSFont.fontWithName_size("HelveticaNeue", 11*exportScale));
				pageNameLabel.setTextColor(labelColor);
				pageNameLabel.adjustFrameToFit();
				pageNameLabel.style().contextSettings().setOpacity(0.6);

			var artboardNameLabel = MSTextLayer.new();
				artboardNameLabel.setName("↳ " + connection.artboardName);
				artboardNameLabel.absoluteRect().setX(dropPoint.x);
				artboardNameLabel.absoluteRect().setY(dropPoint.y);
				artboardNameLabel.frame().setWidth(300);
				artboardNameLabel.setTextBehaviour(0);
				artboardNameLabel.setStringValue("  ↳ " + connection.artboardName);
				artboardNameLabel.addAttribute_value(NSFontAttributeName, NSFont.fontWithName_size("HelveticaNeue", 12*exportScale));
				artboardNameLabel.setTextColor(labelColor);
				artboardNameLabel.adjustFrameToFit();

			var padding = (18*exportScale);
			var linkBackgroundWidth = Math.ceil(Math.max(pageNameLabel.frame().width(), artboardNameLabel.frame().width())) + padding;
			var linkBackgroundHeight = Math.ceil(pageNameLabel.frame().height() + 3 + artboardNameLabel.frame().height()) + padding;
			
			var linkBG = MSShapeGroup.shapeWithPath(MSRectangleShape.alloc().initWithFrame(NSMakeRect(0, 0, linkBackgroundWidth, linkBackgroundHeight)));
			linkBG.firstLayer().setCornerRadiusFloat(5);
			linkBG.style().addStylePartOfType(0).setColor(hitAreaBorderColor);

			linkBG.absoluteRect().setX(dropPoint.x);
			linkBG.absoluteRect().setY(dropPoint.y - (linkBackgroundHeight / 2));

			pageNameLabel.absoluteRect().setX(dropPoint.x + (padding/2));
			pageNameLabel.absoluteRect().setY(linkBG.absoluteRect().y() + (padding/2));

			artboardNameLabel.absoluteRect().setX(dropPoint.x + (padding/2));
			artboardNameLabel.absoluteRect().setY(pageNameLabel.absoluteRect().y() + pageNameLabel.absoluteRect().height() + 3);

			parent.addLayers([linkBG, pageNameLabel, artboardNameLabel]);

			connectionLayers.push(linkBG);
			connectionLayers.push(pageNameLabel);
			connectionLayers.push(artboardNameLabel);

		}
		else {
			// Draw arrow if before Sketch 51
			if (!shouldUseMarkers) {
				var arrowSize = Math.max(12, strokeWidth*3);
				path = NSBezierPath.bezierPath();
				path.moveToPoint(NSMakePoint(dropPoint.x+(arrowSize*0.6), dropPoint.y));
				path.lineToPoint(NSMakePoint(dropPoint.x-arrowSize, dropPoint.y+(arrowSize*0.6)));
				path.lineToPoint(NSMakePoint(dropPoint.x-(arrowSize*0.6), dropPoint.y));
				path.lineToPoint(NSMakePoint(dropPoint.x-arrowSize, dropPoint.y-(arrowSize*0.6)));
				path.closePath();
				var arrow = sketchVersion < sketchVersion50 ? MSShapeGroup.shapeWithBezierPath(path) : MSShapeGroup.shapeWithBezierPath(MSPath.pathWithBezierPath(path));
				arrow.style().addStylePartOfType(0).setColor(hitAreaBorderColor);
				arrow.setRotation(-arrowRotation);
				arrow.absoluteRect().setX(arrow.absoluteRect().x() + arrowOffsetX);
				parent.addLayers([arrow]);
				connectionLayers.push(arrow);
			}
		}

	}

	return connectionLayers;
}

var editSettings = function(context) {

	parseContext(context);
	var settingsWindow = getAlertWindow();
	settingsWindow.addButtonWithTitle(strings["alerts-save"]);
	settingsWindow.addButtonWithTitle(strings["alerts-cancel"]);
	settingsWindow.addButtonWithTitle(strings["settings-restoreDefaults"]);

	settingsWindow.setMessageText(strings["settings-title"]);
	settingsWindow.setInformativeText("v" + version + " | © Aby Nimbalkar | @abynim");

	settingsWindow.addTextLabelWithValue(strings["settings-exportOptions"]);
	var exportScale = 1;
	var formatOptions = NSArray.arrayWithArray(["PDF", "PNG", "JPG", "TIFF"]);
	var exportFormat = NSUserDefaults.standardUserDefaults().objectForKey(kExportFormatKey) || "PNG";
	var selectedIndex = formatOptions.indexOfObject(exportFormat);
	var formatDropdown = NSPopUpButton.alloc().initWithFrame_pullsDown(NSMakeRect(100,1,70,22), false);
	formatDropdown.addItemsWithTitles(formatOptions);
	formatDropdown.selectItemAtIndex(selectedIndex);

	settingsWindow.addAccessoryView(formatDropdown);

	// ------------
	var separator = NSBox.alloc().initWithFrame(NSMakeRect(0,0,300,10));
	separator.setBoxType(2);
	settingsWindow.addAccessoryView(separator);
	// ------------

	settingsWindow.addTextLabelWithValue(strings["settings-flowBackground"]);
	var bgOptionNames = NSArray.arrayWithArray([strings["settings-bgLight"], strings["settings-bgDark"]]);
	var bgOptions = NSArray.arrayWithArray(["Light", "Dark"]);
	var bgMode = NSUserDefaults.standardUserDefaults().objectForKey(kFlowBackgroundKey) || "Light";
	var bgDropdown = NSPopUpButton.alloc().initWithFrame_pullsDown(NSMakeRect(0,0,70,22), false);
	selectedIndex = bgOptions.indexOfObject(bgMode);
	bgDropdown.addItemsWithTitles(bgOptionNames);
	bgDropdown.selectItemAtIndex(selectedIndex);
	settingsWindow.addAccessoryView(bgDropdown);

	settingsWindow.addTextLabelWithValue(strings["settings-flowIndicatorStroke"]);
	var flowIndicatorColorWell = NSColorWell.alloc().initWithFrame(NSMakeRect(56,0,44,23));
	var flowIndicatorColorHex = NSUserDefaults.standardUserDefaults().objectForKey(kFlowIndicatorColorKey) || "#F5A623"
	var flowIndicatorColorAlpha = NSUserDefaults.standardUserDefaults().objectForKey(kFlowIndicatorAlphaKey) || 1
	var flowIndicatorMSColor = MSImmutableColor.colorWithSVGString(flowIndicatorColorHex);
	flowIndicatorMSColor.setAlpha(flowIndicatorColorAlpha);
	var flowIndicatorColor = flowIndicatorMSColor.NSColorWithColorSpace(NSColorSpace.deviceRGBColorSpace())
	flowIndicatorColorWell.setColor(flowIndicatorColor);

	var strokeWidth = NSUserDefaults.standardUserDefaults().objectForKey(kStrokeWidthKey) || 3;
	var strokeWidthField = NSTextField.alloc().initWithFrame(NSMakeRect(0,0,50,23));
	strokeWidthField.setStringValue(strokeWidth + "px");

	var connectionTypeNames = NSArray.arrayWithArray([strings["settings-connectionCurved"], strings["settings-connectionStraight"]]);
	var connectionTypes = NSArray.arrayWithArray(["curved", "straight"]);
	var currentConnectionType = NSUserDefaults.standardUserDefaults().objectForKey(kConnectionTypeKey) || "curved";
	var connectionTypeDropdown = NSPopUpButton.alloc().initWithFrame_pullsDown(NSMakeRect(106,0,90,22), false);
	selectedIndex = connectionTypes.indexOfObject(currentConnectionType);
	connectionTypeDropdown.addItemsWithTitles(connectionTypeNames);
	connectionTypeDropdown.selectItemAtIndex(selectedIndex);

	var flowIndicatorOptionsView = NSView.alloc().initWithFrame(NSMakeRect(0,0,300,23));
	flowIndicatorOptionsView.addSubview(flowIndicatorColorWell);
	flowIndicatorOptionsView.addSubview(strokeWidthField);
	flowIndicatorOptionsView.addSubview(connectionTypeDropdown);
	settingsWindow.addAccessoryView(flowIndicatorOptionsView);

	if (sketchVersion >= sketchVersion51) {
		var markerTypes = ["0", "4", "5", "6", "7", "1", "2", "3"];
		var markerTypeNames = ["None", "Open Arrow", "Filled Arrow", "Line", "Open Circle", "Filled Circle", "Open Square", "Filled Square"];
		var startMarkerType = NSUserDefaults.standardUserDefaults().objectForKey(kStartMarkerTypeKey) || "4";
		startMarkerType = ""+startMarkerType;
		var endMarkerType = NSUserDefaults.standardUserDefaults().objectForKey(kEndMarkerTypeKey) || "2";
		endMarkerType = ""+endMarkerType;

		var startMarkerTypeDropdown = NSPopUpButton.alloc().initWithFrame_pullsDown(NSMakeRect(0,0,80,22), false);
		var endMarkerTypeDropdown = NSPopUpButton.alloc().initWithFrame_pullsDown(NSMakeRect(84,0,80,22), false);
		
		startMarkerTypeDropdown.setImagePosition(NSImageOnly);
		endMarkerTypeDropdown.setImagePosition(NSImageOnly);

		var markerType, markerTypeInt, menuItem, markerImage, markerName, markerImageName;
		for (var i = 0; i < markerTypes.length; i++) {
			markerType = markerTypes[i];
			markerTypeInt = parseInt(markerType);
			markerName = markerTypeNames[markerTypeInt];

			markerImageName = "startMarker-"+markerType;
			menuItem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent(markerName, nil, "");
			markerImage = NSImage.alloc().initByReferencingURL(context.plugin.urlForResourceNamed("images/"+markerImageName+".tiff"));
			menuItem.setImage(markerImage);			
			menuItem.setRepresentedObject(markerType);
			startMarkerTypeDropdown.menu().addItem(menuItem);

			markerImageName = "endMarker-"+markerType;
			menuItem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent(markerName, nil, "");
			markerImage = NSImage.alloc().initByReferencingURL(context.plugin.urlForResourceNamed("images/"+markerImageName+".tiff"));
			menuItem.setImage(markerImage);
			menuItem.setRepresentedObject(markerType);
			endMarkerTypeDropdown.menu().addItem(menuItem);
		}

		startMarkerTypeDropdown.selectItemAtIndex(markerTypes.indexOf(startMarkerType));
		endMarkerTypeDropdown.selectItemAtIndex(markerTypes.indexOf(endMarkerType));

		var markerOptionsView = NSView.alloc().initWithFrame(NSMakeRect(0,0,300,23));
		markerOptionsView.addSubview(startMarkerTypeDropdown);
		markerOptionsView.addSubview(endMarkerTypeDropdown);
		settingsWindow.addAccessoryView(markerOptionsView);
	}

	settingsWindow.addTextLabelWithValue(strings["settings-minArea"]);
	var tapAreaField = NSTextField.alloc().initWithFrame(NSMakeRect(0,0,50,23));
	var minimumTapArea = NSUserDefaults.standardUserDefaults().objectForKey(kMinTapAreaKey) || 44;
	tapAreaField.setStringValue(minimumTapArea + "pt");
	settingsWindow.addAccessoryView(tapAreaField);

	var showLinkRects = NSUserDefaults.standardUserDefaults().objectForKey(kShowsLinkRectsKey) || 1;
	var showLinksCheckbox = NSButton.alloc().initWithFrame(NSMakeRect(0,0,300,22));
	showLinksCheckbox.setButtonType(NSSwitchButton);
	showLinksCheckbox.setBezelStyle(0);
	showLinksCheckbox.setTitle(strings["settings-drawBorders"]);
	showLinksCheckbox.setState(showLinkRects);
	settingsWindow.addAccessoryView(showLinksCheckbox);

	// ------------
	var separator = NSBox.alloc().initWithFrame(NSMakeRect(0,0,300,10));
	separator.setBoxType(2);
	settingsWindow.addAccessoryView(separator);
	// ------------

	settingsWindow.addTextLabelWithValue(strings["settings-artboardMagnets"]);
	var currentMagnetsType = NSUserDefaults.standardUserDefaults().objectForKey(kMagnetsTypeKey) || "nsew";
	var magnetsTypeDropdown = NSPopUpButton.alloc().initWithFrame_pullsDown(NSMakeRect(0,0,120,22), false);

	var topLeftItem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent("Top Left", nil, "");
	var topLeftImage = NSImage.alloc().initByReferencingURL(context.plugin.urlForResourceNamed("images/magnets--topleft.tiff"));
	topLeftItem.setRepresentedObject("topleft");
	topLeftItem.setImage(topLeftImage);
	magnetsTypeDropdown.menu().addItem(topLeftItem);
	if(currentMagnetsType == "topleft") magnetsTypeDropdown.selectItem(topLeftItem);

	var nsewItem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent("N,S,E,W", nil, "");
	var nsewImage = NSImage.alloc().initByReferencingURL(context.plugin.urlForResourceNamed("images/magnets--nsew.tiff"));
	nsewItem.setRepresentedObject("nsew");
	nsewItem.setImage(nsewImage);
	magnetsTypeDropdown.menu().addItem(nsewItem);
	if(currentMagnetsType == "nsew") magnetsTypeDropdown.selectItem(nsewItem);

	settingsWindow.addAccessoryView(magnetsTypeDropdown);

	// ------------
	var separator = NSBox.alloc().initWithFrame(NSMakeRect(0,0,300,10));
	separator.setBoxType(2);
	settingsWindow.addAccessoryView(separator);
	// ------------

	settingsWindow.addTextLabelWithValue(strings["settings-conditionFontSize"]);
	var conditionFontSizeField = NSTextField.alloc().initWithFrame(NSMakeRect(0, 0, 50, 23));
	var conditionFontSize = NSUserDefaults.standardUserDefaults().objectForKey(kConditionFontSizeKey) || 16;
	conditionFontSizeField.setStringValue(conditionFontSize + "pt");
	settingsWindow.addAccessoryView(conditionFontSizeField);

	// ------------
	var separator = NSBox.alloc().initWithFrame(NSMakeRect(0, 0, 300, 10));
	separator.setBoxType(2);
	settingsWindow.addAccessoryView(separator);
	// ------------

	settingsWindow.addTextLabelWithValue(strings["settings-yourName"]);
	var userName = NSUserDefaults.standardUserDefaults().objectForKey(kFullNameKey) || "";
	var userNameField = NSTextField.alloc().initWithFrame(NSMakeRect(0,0,200,23));
	userNameField.setStringValue(userName);
	settingsWindow.addAccessoryView(userNameField);

	var showName = NSUserDefaults.standardUserDefaults().objectForKey(kShowModifiedDateKey) || 0;
	var showNameCheckbox = NSButton.alloc().initWithFrame(NSMakeRect(0,0,300,22));
	showNameCheckbox.setButtonType(NSSwitchButton);
	showNameCheckbox.setBezelStyle(0);
	showNameCheckbox.setTitle(strings["settings-showDate"]);
	showNameCheckbox.setState(showName);
	settingsWindow.addAccessoryView(showNameCheckbox);

	// ------------
	var separator = NSBox.alloc().initWithFrame(NSMakeRect(0,0,300,10));
	separator.setBoxType(2);
	settingsWindow.addAccessoryView(separator);
	// ------------

	var autoUpdateConnections = NSUserDefaults.standardUserDefaults().objectForKey(kAutoUpdateConnectionsKey) || 1;
	var autoUpdateConnectionsCheckbox = NSButton.alloc().initWithFrame(NSMakeRect(0,0,300,22));
	autoUpdateConnectionsCheckbox.setButtonType(NSSwitchButton);
	autoUpdateConnectionsCheckbox.setBezelStyle(0);
	autoUpdateConnectionsCheckbox.setTitle(strings["settings-autoUpdateConnections"]);
	autoUpdateConnectionsCheckbox.setState(autoUpdateConnections);
	settingsWindow.addAccessoryView(autoUpdateConnectionsCheckbox);

	var response = settingsWindow.runModal();

	if (response == "1000") {

		var flowIndicatorMSColor = MSColor.colorWithNSColor(flowIndicatorColorWell.color()).immutableModelObject();
		var flowIndicatorColor = flowIndicatorMSColor.svgRepresentation()
		var flowIndicatorAlpha = flowIndicatorMSColor.alpha();
		NSUserDefaults.standardUserDefaults().setObject_forKey(formatDropdown.titleOfSelectedItem(), kExportFormatKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(bgOptions.objectAtIndex(bgDropdown.indexOfSelectedItem()), kFlowBackgroundKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(flowIndicatorColor, kFlowIndicatorColorKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(flowIndicatorAlpha, kFlowIndicatorAlphaKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(connectionTypes.objectAtIndex(connectionTypeDropdown.indexOfSelectedItem()), kConnectionTypeKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(magnetsTypeDropdown.selectedItem().representedObject(), kMagnetsTypeKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(parseInt(strokeWidthField.stringValue()), kStrokeWidthKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(parseInt(tapAreaField.stringValue()), kMinTapAreaKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(parseInt(conditionFontSizeField.stringValue()), kConditionFontSizeKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(showLinksCheckbox.state(), kShowsLinkRectsKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(userNameField.stringValue(), kFullNameKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(showNameCheckbox.state(), kShowModifiedDateKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(autoUpdateConnectionsCheckbox.state(), kAutoUpdateConnectionsKey);

		NSUserDefaults.standardUserDefaults().setObject_forKey(startMarkerTypeDropdown.selectedItem().representedObject(), kStartMarkerTypeKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(endMarkerTypeDropdown.selectedItem().representedObject(), kEndMarkerTypeKey);
		
		updateManifestForSettingsChange(context, autoUpdateConnectionsCheckbox.state());
		applySettings(context);
		logEvent("settingsChanged", {
			exportScale : exportScale,
			format : formatDropdown.titleOfSelectedItem(),
			backgroundMode : bgDropdown.titleOfSelectedItem(),
			showsName : showNameCheckbox.state(),
			flowIndicatorColor : flowIndicatorColor,
			artboardMagnets : magnetsTypeDropdown.selectedItem().representedObject()
		});

	} else if (response == "1002") {

		NSUserDefaults.standardUserDefaults().removeObjectForKey(kExportFormatKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kFlowBackgroundKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kFlowIndicatorColorKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kFlowIndicatorAlphaKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kConnectionTypeKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kMagnetsTypeKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kStrokeWidthKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kMinTapAreaKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kShowsLinkRectsKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kFullNameKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kShowModifiedDateKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kConditionFontSizeKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kAutoUpdateConnectionsKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kStartMarkerTypeKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kEndMarkerTypeKey);

		updateManifestForSettingsChange(context, 0);
		applySettings(context);
		logEvent("settingsReset", nil);

	}
}

var applySettings = function(context) {

	var doc = context.document;
	var connectionsLayerPredicate = NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).isConnectionsContainer == true", kPluginDomain);
	var connectionsGroup = doc.currentPage().children().filteredArrayUsingPredicate(connectionsLayerPredicate).firstObject();

	if (connectionsGroup) {
		var isVisible = connectionsGroup.isVisible(),
			newConnections = redrawConnections(context);
		newConnections.setIsVisible(isVisible);
	}
}

var updateManifestForSettingsChange = function(context, autoUpdateConnections) {

	var manifestPath = context.plugin.url().URLByAppendingPathComponent("Contents").URLByAppendingPathComponent("Sketch").URLByAppendingPathComponent("manifest.json").path(),
		manifest = NSJSONSerialization.JSONObjectWithData_options_error(NSData.dataWithContentsOfFile(manifestPath), NSJSONReadingMutableContainers, nil),
		commands = manifest.commands,
		commandsCount = commands.count(),
		command, actions;

	for (var i = 0; i < commandsCount; i++) {
		command = commands[i];
		if (command.identifier == "actionHandler") {
			actions = command.handlers.actions;
			if (autoUpdateConnections == 1) {
				actions.setObject_forKey("onLayersMoved", "LayersMoved.finish");
			} else {
				actions.removeObjectForKey("LayersMoved.finish");
			}
		}
	}

	NSString.alloc().initWithData_encoding(NSJSONSerialization.dataWithJSONObject_options_error(manifest, NSJSONWritingPrettyPrinted, nil), NSUTF8StringEncoding).writeToFile_atomically_encoding_error(manifestPath, true, NSUTF8StringEncoding, nil);
	AppController.sharedInstance().pluginManager().reloadPlugins();
}

var editShortcuts = function(context) {

	parseContext(context);
	var settingsWindow = getAlertWindow();
	settingsWindow.addButtonWithTitle(strings["alerts-save"]);
	settingsWindow.addButtonWithTitle(strings["alerts-cancel"]);

	settingsWindow.setMessageText(strings["shortcuts-title"]);
	settingsWindow.setInformativeText(strings["shortcuts-message"]);

	var manifestPath = context.plugin.url().URLByAppendingPathComponent("Contents").URLByAppendingPathComponent("Sketch").URLByAppendingPathComponent("manifest.json").path(),
		manifest = NSJSONSerialization.JSONObjectWithData_options_error(NSData.dataWithContentsOfFile(manifestPath), NSJSONReadingMutableContainers, nil),
		commands = manifest.commands,
		validCommands = manifest.menu.items,
		commandsCount = commands.count(),
		shortcutFields = {},
		command, shortcutField, shortcut;

	for (var i = 0; i < commandsCount; i++) {
		command = commands[i];
		if (!validCommands.containsObject(command.identifier) || command.allowsShortcut == false)
			continue;
		settingsWindow.addTextLabelWithValue(command.name);
		shortcutField = NSTextField.alloc().initWithFrame(NSMakeRect(0,0,160,23));
		shortcut = command.shortcut == nil ? "" : command.shortcut;
		shortcutField.setStringValue(shortcut);
		settingsWindow.addAccessoryView(shortcutField);

		shortcutFields[command.identifier] = shortcutField;
	}

	var response = settingsWindow.runModal();

	if (response == "1000") {

		for (var i = 0; i < commandsCount; i++) {
			command = commands[i];
			shortcutField = shortcutFields[command.identifier];
			if(typeof shortcutField === 'undefined')
				continue;

			command.shortcut = shortcutField.stringValue();
		}

		NSString.alloc().initWithData_encoding(NSJSONSerialization.dataWithJSONObject_options_error(manifest, NSJSONWritingPrettyPrinted, nil), NSUTF8StringEncoding).writeToFile_atomically_encoding_error(manifestPath, true, NSUTF8StringEncoding, nil);
		AppController.sharedInstance().pluginManager().reloadPlugins();

	}
}

var checkForUpdates = function(context) {

	parseContext(context);

	context.document.showMessage(strings["checkUpdates-checking"]);

	var json = NSJSONSerialization.JSONObjectWithData_options_error(NSData.dataWithContentsOfURL(NSURL.URLWithString("https://abynim.github.io/UserFlows/version.json")), 0, nil),
		currentVersion = json.valueForKey("currentVersion"),
		currentVersionAsInt = getVersionNumberFromString(currentVersion),
		installedVersionAsInt = getVersionNumberFromString(version),
		updateAvailable = currentVersionAsInt > installedVersionAsInt,
		updateAlert = getAlertWindow();

		updateAlert.setMessageText(updateAvailable ? strings["checkUpdates-updateAvailableTitle"] : strings["checkUpdates-noUpdateAvailableTitle"]);
		if (updateAvailable) {
			var infoText = strings["checkUpdates-updateAvailableMessage"].stringByReplacingOccurrencesOfString_withString("%currentVersion%", currentVersion).stringByReplacingOccurrencesOfString_withString("%installedVersion%", version);
			updateAlert.setInformativeText(infoText);
			updateAlert.addButtonWithTitle(strings["checkUpdates-updateNow"]);
			updateAlert.addButtonWithTitle(strings["checkUpdates-updateLater"]);
		} else {
			updateAlert.setInformativeText(strings["checkUpdates-noUpdateAvailableMessage"]);
			updateAlert.addButtonWithTitle(strings["alerts-done"]);
		}

		var response = updateAlert.runModal();
		if (updateAvailable && response == "1000") {
			var websiteURL = NSURL.URLWithString(json.valueForKey("websiteURL"));
			NSWorkspace.sharedWorkspace().openURL(websiteURL);
		}
}

var editLanguage = function(context) {

	parseContext(context);

	var settingsWindow = getAlertWindow();
	settingsWindow.addButtonWithTitle(strings["alerts-save"]);
	settingsWindow.addButtonWithTitle(strings["alerts-cancel"]);

	settingsWindow.setMessageText(strings["language-title"]);
	settingsWindow.setInformativeText(strings["language-message"]);

	var languagesDropdown = NSPopUpButton.alloc().initWithFrame(NSMakeRect(0,0,300,25)),
		currentLanguage = NSUserDefaults.standardUserDefaults().objectForKey(kLanguageCodeKey) || "en",
		languageCode;
	for (var i = 0; i < supportedLanguages.length; i++) {
		languageCode = supportedLanguages[i];
		languagesDropdown.addItemWithTitle(languageNames[languageCode]);
		if (currentLanguage == languageCode) {
			languagesDropdown.selectItemAtIndex(i);
		}
	}
	settingsWindow.addAccessoryView(languagesDropdown);

	var response = settingsWindow.runModal();

	if (response == "1000") {

		var localeID = supportedLanguages[languagesDropdown.indexOfSelectedItem()];
		NSUserDefaults.standardUserDefaults().setObject_forKey(localeID, kLanguageCodeKey);

		// update manifest
		var manifestPath = context.plugin.url().URLByAppendingPathComponent("Contents").URLByAppendingPathComponent("Sketch").URLByAppendingPathComponent("manifest.json").path(),
		manifest = NSJSONSerialization.JSONObjectWithData_options_error(NSData.dataWithContentsOfFile(manifestPath), NSJSONReadingMutableContainers, nil),
		commands = manifest.commands,
		commandsCount = commands.count(),
		stringsFilePath = context.plugin.urlForResourceNamed(localeID + ".plist").path(),
		newStrings = NSDictionary.dictionaryWithContentsOfFile(stringsFilePath),
		command, commandNameKey;

		for (var i = 0; i < commandsCount; i++) {
			command = commands[i];
			commandNameKey = "menu-" + command.identifier;
			command.name = newStrings[commandNameKey];
		}

		manifest.description = newStrings["manifest-description"];

		NSString.alloc().initWithData_encoding(NSJSONSerialization.dataWithJSONObject_options_error(manifest, NSJSONWritingPrettyPrinted, nil), NSUTF8StringEncoding).writeToFile_atomically_encoding_error(manifestPath, true, NSUTF8StringEncoding, nil);
		AppController.sharedInstance().pluginManager().reloadPlugins();

	}
}

var onLayersMoved = function(context) {
	
	var doc = context.actionContext.document;
	var connectionsGroup = getConnectionsGroupInPage(doc.currentPage());

	if (connectionsGroup) {
		redrawConnections(context);
	}
}

var onSelectionChanged = function(context) {
	var oldSel = context.actionContext.oldSelection;
	var newSel = context.actionContext.newSelection;

	var ud = NSUserDefaults.standardUserDefaults();

	if (oldSel.count() == 0 && newSel.count() == 1) {
		ud.setObject_forKey(newSel.firstObject().objectID(), kFirstLayerIDKey);
	} 
	else if(newSel.count() == 0) {
		ud.removeObjectForKey(kFirstLayerIDKey);
	}
}

var showAlert = function(message, info, primaryButtonText, secondaryButtonText) {
	var alert = getAlertWindow();
	alert.setMessageText(message);
	alert.setInformativeText(info);
	if (typeof primaryButtonText !== 'undefined') {
		alert.addButtonWithTitle(primaryButtonText);
	}
	if (typeof secondaryButtonText !== 'undefined') {
		alert.addButtonWithTitle(secondaryButtonText);
	}
	alert.runModal();
}

var getConnectionsGroupInPage = function(page) {
	var connectionsLayerPredicate = NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).isConnectionsContainer == true", kPluginDomain);
	return page.children().filteredArrayUsingPredicate(connectionsLayerPredicate).firstObject();
}

var parseContext = function(context) {
	iconImage = NSImage.alloc().initByReferencingFile(context.plugin.urlForResourceNamed("icon-internal.png").path());
	version = context.plugin.version();
	sketchVersion = getVersionNumberFromString(NSBundle.mainBundle().objectForInfoDictionaryKey("CFBundleShortVersionString"));

	var localeID = NSUserDefaults.standardUserDefaults().objectForKey(kLanguageCodeKey) || "en",
		stringsFilePath = context.plugin.urlForResourceNamed(localeID + ".plist").path();

	strings = NSDictionary.dictionaryWithContentsOfFile(stringsFilePath);
}

var getAlertWindow = function() {
	var alert = COSAlertWindow.new();
	if (iconImage) {
		alert.setIcon(iconImage);
	}
	return alert;
}

var getVersionNumberFromString = function(versionString) {
	var versionNumber = versionString.stringByReplacingOccurrencesOfString_withString(".", "") + ""
	while(versionNumber.length != 3) {
		versionNumber += "0"
	}
	return parseInt(versionNumber)
}

var sanitizeArtboard = function(artboard, context) {
	if (context.command.valueForKey_onLayer_forPluginIdentifier("artboardID", artboard, kPluginDomain) == nil) {
		context.command.setValue_forKey_onLayer_forPluginIdentifier(artboard.objectID(), "artboardID", artboard, kPluginDomain);
	}
}

var logEvent = function(event, props) {
	var uuid = NSUserDefaults.standardUserDefaults().objectForKey(kUUIDKey);
	var localeID = NSUserDefaults.standardUserDefaults().objectForKey(kLanguageCodeKey) || "en";
	if (!uuid) {
		uuid = NSUUID.UUID().UUIDString();
		NSUserDefaults.standardUserDefaults().setObject_forKey(uuid, kUUIDKey);
	}
	var fProps = {
		token : "7175b47d63e993c9ec2a5cfd5a3f378c",
		sketchVersion : NSBundle.mainBundle().objectForInfoDictionaryKey("CFBundleShortVersionString"),
		uuid : uuid,
		locale : localeID,
		pluginVersion : version
	}
	if (props) {
		for (var key in props)
			fProps[key] = props[key];
	}

	var payload = {
			event : event,
			properties : fProps
		},
		json = NSJSONSerialization.dataWithJSONObject_options_error(payload, 0, nil),
		base64 = json.base64EncodedStringWithOptions(0),
		url = NSURL.URLWithString(NSString.stringWithFormat("https://api.mixpanel.com/track/?data=%@&ip=1", base64));

	if (url) NSURLSession.sharedSession().dataTaskWithURL(url).resume();
}
