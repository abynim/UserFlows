var kPluginDomain = "com.abynim.sketchplugins.userflows";
var kKeepOrganizedKey = "com.abynim.userflows.keepOrganized";
var kExportScaleKey = "com.abynim.userflows.exportScale";
var kExportFormatKey = "com.abynim.userflows.exportFormat";
var kShowModifiedDateKey = "com.abynim.userflows.showModifiedDate";
var kFlowIndicatorColorKey = "com.abynim.userflows.flowIndicatorColor";
var kFlowBackgroundKey = "com.abynim.userflows.backgroundColor";
var kMinTapAreaKey = "com.abynim.userflows.minTapArea";
var kFullNameKey = "com.abynim.userflows.fullName";
var kUUIDKey = "com.abynim.userflows.uuid";
var kShowConnectionsKey = "com.abynim.userflows.showConnections";
var kShowsLinkRectsKey = "com.abynim.userflows.showsLinkRects";
var kStrokeWidthKey = "com.abynim.userflows.strokeWidth";
var kConditionalArtboardKey = "com.abynim.userflows.conditionalArtboard";
var linkLayerPredicate;
var iconImage;

var defineLink = function(context) {

	parseContext(context);

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
		showAlert("Invalid selection", "Select a layer or group to define as a Link, select the destination artboard, then run this command again.");
		return;
	}
	
	context.command.setValue_forKey_onLayer_forPluginIdentifier(destArtboard.objectID(), "destinationArtboardID", linkLayer, kPluginDomain);

	var doc = context.document;
	var showingConnections = NSUserDefaults.standardUserDefaults().objectForKey(kShowConnectionsKey) || 1;

	if (showingConnections == 1) {
		redrawConnections(context);
	} else {
		doc.showMessage("Link defined: " + linkLayer.name() + " → " + destArtboard.name());
	}

}

var removeLink = function(context) {
	var doc = context.document,
		selection = context.selection;
	if (selection.count() == 0) {
		doc.showMessage("Select a layer already defined as a link, to remove its link attributes.");
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
		var plural = context.selection.count() == 1 ? "Link" : "Links";
		doc.showMessage(plural + " removed.");
	}
}

var editArtboardDescription = function(context) {
	
	parseContext(context);

	var currentArtboard = context.document.currentPage().currentArtboard();
	if (!currentArtboard) {
		showAlert("Select an artboard");
		return;
	}

	var settingsWindow = getAlertWindow();
	settingsWindow.addButtonWithTitle("Save");
	settingsWindow.addButtonWithTitle("Cancel");

	settingsWindow.setMessageText("Artboard: " + currentArtboard.name());

	settingsWindow.addTextLabelWithValue("Description");
	var descriptionField = NSTextField.alloc().initWithFrame(NSMakeRect(0,0,300,100));
	settingsWindow.addAccessoryView(descriptionField);

	if (settingsWindow.runModal() == "1000") {
		context.command.setValue_forKey_onLayer_forPluginIdentifier(descriptionField.stringValue(), "artboardDescription", currentArtboard, kPluginDomain);
		context.document.showMessage("Artboard description saved");
	}
}

var addCondition = function(context) {

	parseContext(context);

	var settingsWindow = getAlertWindow();
	settingsWindow.addButtonWithTitle("Save");
	settingsWindow.addButtonWithTitle("Cancel");

	settingsWindow.setMessageText("Add or Edit Conditions");
	// settingsWindow.setInformativeText("");

	var parentArtboards = context.selection.valueForKeyPath("@distinctUnionOfObjects.parentArtboard"),
		currentArtboard = parentArtboards.firstObject(),
		artboardIsConditional = parentArtboards.count() == 1 ? (context.command.valueForKey_onLayer_forPluginIdentifier(kConditionalArtboardKey, currentArtboard, kPluginDomain) || 0) : 0,
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
	conditionField.setPlaceholderString("Ex: If user is logged in");
	conditionView.addSubview(conditionField);
	settingsWindow.addAccessoryView(conditionView);
	conditionFields.push(conditionField);
	conditionChecks.push(checkbox);
	conditionLinks.push(0);

	elseCheckbox = NSButton.alloc().initWithFrame(NSMakeRect(0,0,300,23));
	elseCheckbox.title = "Else..";
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

	if (settingsWindow.runModal() == "1000") {
		
		var conditionBoard;

		if (artboardIsConditional) {
			conditionBoard = currentArtboard;
			conditionBoard.removeAllLayers();
		} else {
			conditionBoard = MSArtboardGroup.new();
			conditionBoard.setName("⤙ Conditions");
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
			conditionBorderColor = MSImmutableColor.colorWithSVGString(flowIndicatorColor).newMutableCounterpart(),
			conditionBoardWidth = conditionBoard.frame().width(),
			count = 0,
			conditionLabel, conditionValue, conditionBox, conditionBorder, conditionBoxHeight, layersArray, conditionGroup, isElse;
		
		for (var i = 0; i < numConditions; i++) {
			
			checkbox = conditionChecks[i];
			
			if (checkbox.state() == NSOffState) continue;
			
			isElse = checkbox == elseCheckbox;
			if (isElse) {
				conditionValue = "Else";
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
			conditionLabel.addAttribute_value(NSFontAttributeName, NSFont.fontWithName_size("HelveticaNeue", 16));
			conditionLabel.setLineHeight(16*1.4);
			conditionLabel.setTextColor(MSImmutableColor.colorWithSVGString("#121212").newMutableCounterpart());
			conditionLabel.adjustFrameToFit();
			context.command.setValue_forKey_onLayer_forPluginIdentifier(1, (isElse ? "isElse" : "isCondition"), conditionLabel, kPluginDomain);

			conditionBoxHeight = conditionLabel.frame().height() + 16;
			conditionBox = MSShapeGroup.shapeWithPath(MSRectangleShape.alloc().initWithFrame(NSMakeRect(conditionSpacing, listY, conditionBoardWidth-(conditionSpacing*2), conditionBoxHeight)));
			conditionBox.firstLayer().setCornerRadiusFloat(5);
			conditionBox.style().addStylePartOfType(0).setColor(MSImmutableColor.colorWithSVGString("#f9f9f9").newMutableCounterpart());
			conditionBorder = conditionBox.style().addStylePartOfType(1);
			conditionBorder.setColor(conditionBorderColor);
			conditionBorder.setPosition(2);
			conditionBorder.setThickness(2);

			listY += conditionBoxHeight + conditionSpacing;

			conditionBoard.addLayers([conditionBox, conditionLabel]);
			layersArray = MSLayerArray.arrayWithLayers([conditionBox, conditionLabel]);
			conditionGroup = MSLayerGroup.groupFromLayers(layersArray);
			conditionGroup.setName("Condition " + count);

			context.command.setValue_forKey_onLayer_forPluginIdentifier(1, "isConditionGroup", conditionGroup, kPluginDomain);

			conditionLink = conditionLinks[i];
			if (conditionLink != 0) {
				context.command.setValue_forKey_onLayer_forPluginIdentifier(conditionLink, "destinationArtboardID", conditionGroup, kPluginDomain);
			}

		}

		conditionBoard.frame().setHeight(listY);
		if (artboardIsConditional != 1) {
			var vcr = context.document.currentView().visibleContentRect(),
				absPosition = NSMakePoint(CGRectGetMidX(vcr)-CGRectGetMidX(conditionBoard.absoluteRect().rect()), CGRectGetMidY(vcr)-CGRectGetMidY(conditionBoard.absoluteRect().rect()));
			conditionBoard.setAbsolutePosition(absPosition);
		}

		var showingConnections = NSUserDefaults.standardUserDefaults().objectForKey(kShowConnectionsKey) || 1;
		if (showingConnections == 1) {
			redrawConnections(context);
		}
	}
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
		showAlert("Invalid selection", "Select a layer that you have defined as a Link, then run this command again.");
		return;
	}

	var doc = context.document,
		destinationArtboard = doc.currentPage().artboards().filteredArrayUsingPredicate(NSPredicate.predicateWithFormat("objectID == %@", destinationArtboardID)).firstObject();
	if (destinationArtboard) {
		var cRect = doc.currentView().visibleContentRect(),
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

		doc.currentView().centerRect(destinationArtboard.absoluteRect().rect());
		destinationArtboard.select_byExpandingSelection(true, false);
	}
}

var goBackToLink = function(context) {

	var doc = context.document,
		rects = context.command.valueForKey_onDocument_forPluginIdentifier("contentRectsHistory", doc.documentData(), kPluginDomain).mutableCopy();

	if (rects) {
		var contentRect = rects.lastObject();

		if (!contentRect) {  return;  }

		if (contentRect.linkLayerID ) {
			var layer = doc.currentPage().children().filteredArrayUsingPredicate(NSPredicate.predicateWithFormat("objectID == %@", contentRect.linkLayerID)).firstObject();
			if(layer) {
				layer.select_byExpandingSelection(true, false);
			}
		}

		var cRect = NSMakeRect(contentRect.x, contentRect.y, contentRect.width, contentRect.height);
		doc.currentView().centerRect(cRect);

		rects.removeLastObject();
		context.command.setValue_forKey_onDocument_forPluginIdentifier(rects, "contentRectsHistory", doc.documentData(), kPluginDomain);
	}
}

var generateFlow = function(context) {
	
	parseContext(context);

	var doc = context.document;
	var settingsWindow = getAlertWindow();
	settingsWindow.addButtonWithTitle("Generate Diagram");
	settingsWindow.addButtonWithTitle("Cancel");

	settingsWindow.setMessageText("Generate a User Flow");

	settingsWindow.addTextLabelWithValue("Start from:");

	linkLayerPredicate = NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).destinationArtboardID != nil", kPluginDomain);
	var linkLayers = doc.currentPage().children().filteredArrayUsingPredicate(linkLayerPredicate);

	if (linkLayers.count() == 0) {
		howAlert("No links defined", "This page has no link layers defined. Define at least one link layer by going to `Plugins > User Flows > Define Link`");
		return;
	}

	var artboardsWithLinks = linkLayers.valueForKeyPath("@distinctUnionOfObjects.parentArtboard");
	var artboardsDropdown = NSPopUpButton.alloc().initWithFrame(NSMakeRect(0,0,300,25));
	var loop = artboardsWithLinks.objectEnumerator(), artboardWithLinks, menuItem;
	while (artboardWithLinks = loop.nextObject()) {
		menuItem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent(artboardWithLinks.name(), nil, "");
		artboardsDropdown.menu().addItem(menuItem);
	}

	var homeScreenID = context.command.valueForKey_onLayer_forPluginIdentifier("homeScreenID", doc.currentPage(), kPluginDomain);
	if (homeScreenID) {
		var artboardIDs = artboardsWithLinks.valueForKeyPath("@unionOfObjects.objectID");
		var homeScreenIndex = Math.max(0, artboardIDs.indexOfObject(homeScreenID));
		artboardsDropdown.selectItemAtIndex(homeScreenIndex);
	}
	settingsWindow.addAccessoryView(artboardsDropdown);

	settingsWindow.addTextLabelWithValue("Flow Name");
	var nameField = NSTextField.alloc().initWithFrame(NSMakeRect(0,0,300,23));
	settingsWindow.addAccessoryView(nameField);

	settingsWindow.addTextLabelWithValue("Flow Description");
	var descriptionField = NSTextField.alloc().initWithFrame(NSMakeRect(0,0,300,100));
	settingsWindow.addAccessoryView(descriptionField);

	var separator = NSBox.alloc().initWithFrame(NSMakeRect(0,0,300,10));
	separator.setBoxType(2);
	settingsWindow.addAccessoryView(separator);

	var pageNames = doc.valueForKeyPath("pages.@unionOfObjects.name")
	if (!pageNames.containsObject("_Flows")) { 
		pageNames = NSArray.arrayWithObject("_Flows").arrayByAddingObjectsFromArray(pageNames);
	}
	pageNames = pageNames.arrayByAddingObject("[New Page]");
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
	keepOrganizedCheckbox.setTitle("Keep _Flows Page Organized");
	keepOrganizedCheckbox.setState(keepOrganized);
	settingsWindow.addAccessoryView(keepOrganizedCheckbox);

	settingsWindow.alert().window().setInitialFirstResponder(nameField);
	nameField.setNextKeyView(descriptionField);
	descriptionField.setNextKeyView(nameField);

	var response = settingsWindow.runModal();
	if (response == "1000") {

		var connectionsOverlayPredicate = NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).isConnectionsContainer == true", kPluginDomain),
			connectionsOverlay = doc.currentPage().children().filteredArrayUsingPredicate(connectionsOverlayPredicate).firstObject(),
			connectionsGroupVisible;
		if (connectionsOverlay) {
			connectionsOverlayVisible = connectionsOverlay.isVisible();
			connectionsOverlay.setIsVisible(0);
		}

		var exportScale = NSUserDefaults.standardUserDefaults().objectForKey(kExportScaleKey) || 1,
			exportFormat = NSUserDefaults.standardUserDefaults().objectForKey(kExportFormatKey) || "pdf",
			modifiedBy = NSUserDefaults.standardUserDefaults().objectForKey(kFullNameKey),
			showModifiedDate = NSUserDefaults.standardUserDefaults().objectForKey(kShowModifiedDateKey) || false,
			flowBackground = NSUserDefaults.standardUserDefaults().objectForKey(kFlowBackgroundKey) || "Light",
			flowName = nameField.stringValue(),
			flowDescription = descriptionField.stringValue(),
			artboardBitmapLayers = [],
			connections = [],
			exportedArtboardIDs = {},
			outerPadding = 40*exportScale,
			spacing = 50*exportScale,
			screenNumber = 1,
			initialArtboard = artboardsWithLinks.objectAtIndex(artboardsDropdown.indexOfSelectedItem()),
			artboardsToExport = [initialArtboard],
			screenShadowColor = MSImmutableColor.colorWithSVGString("#00000").newMutableCounterpart(),
			tempFolderURL = NSFileManager.defaultManager().URLsForDirectory_inDomains(NSCachesDirectory, NSUserDomainMask).lastObject().URLByAppendingPathComponent(kPluginDomain),
			artboard, artboardID, linkLayers, linkLayersCount, destinationArtboard, destinationArtboardID, linkLayer, screenLayer, exportRequest, exportURL, screenShadow, connection, artboardNameLabel, primaryTextColor, secondaryTextColor, flowBackgroundColor, artboardIsConditional, isCondition, destinationArtboardIsConditional;

		context.command.setValue_forKey_onLayer_forPluginIdentifier(initialArtboard.objectID(), "homeScreenID", doc.currentPage(), kPluginDomain);
		screenShadowColor.setAlpha(.2);
		exportFormat = exportFormat.toLowerCase();

		if (flowBackground == "Dark") {
			flowBackgroundColor = MSImmutableColor.colorWithSVGString("#1E1D1C").newMutableCounterpart();
			primaryTextColor = MSImmutableColor.colorWithSVGString("#FFFFFF").newMutableCounterpart();
			secondaryTextColor = MSImmutableColor.colorWithSVGString("#9B9B9B").newMutableCounterpart();
		} else {
			flowBackgroundColor = MSImmutableColor.colorWithSVGString("#FFFFFF").newMutableCounterpart();
			primaryTextColor = MSImmutableColor.colorWithSVGString("#121212").newMutableCounterpart();
			secondaryTextColor = MSImmutableColor.colorWithSVGString("#999999").newMutableCounterpart();
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
			exportRequest.setScale(exportScale);
			exportRequest.setShouldTrim(0);
			exportRequest.setSaveForWeb(1);
			exportRequest.setBackgroundColor(( artboard.hasBackgroundColor() ? artboard.backgroundColor() : MSImmutableColor.colorWithSVGString("#FFFFFF").newMutableCounterpart() ));
			exportRequest.setIncludeArtboardBackground(1);
			exportRequest.setName(artboard.objectID());
			exportRequest.setFormat(exportFormat);
			exportURL = tempFolderURL.URLByAppendingPathComponent(artboard.objectID()).URLByAppendingPathExtension(exportFormat);
			doc.saveArtboardOrSlice_toFile(exportRequest, exportURL.path());

			screenLayer = MSBitmapLayer.bitmapLayerWithImageFromPath(exportURL);
			doc.currentPage().addLayers([screenLayer]);
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
				doc.currentPage().addLayers([artboardNameLabel]);
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
			  
			  isCondition = context.command.valueForKey_onLayer_forPluginIdentifier("isConditionGroup", linkLayer, kPluginDomain) || 0;

			  destinationArtboard = doc.currentPage().artboards().filteredArrayUsingPredicate(NSPredicate.predicateWithFormat("objectID == %@", destinationArtboardID)).firstObject();
			  destinationArtboardIsConditional = context.command.valueForKey_onLayer_forPluginIdentifier(kConditionalArtboardKey, destinationArtboard, kPluginDomain) || 0;
			  if (destinationArtboard) {

			  	connection = {
			  		linkRect : linkLayer.absoluteRect().rect(),
			  		linkIsCondition : isCondition,
			  		destinationIsConditional : destinationArtboardIsConditional,
			  		dropPoint : {
			  			x : destinationArtboard.absoluteRect().x() - (10*exportScale),
			  			y : destinationArtboard.absoluteRect().y() - (10*exportScale)
			  		}
			  	}
			  	connections.push(connection);
				artboardsToExport.push(destinationArtboard);
			  	
			  }
			}
		}

		if (connectionsOverlay) {
			connectionsOverlay.setIsVisible(connectionsOverlayVisible);
		}
		
		var connectionLayers = MSLayerArray.arrayWithLayers(drawConnections(connections, doc.currentPage(), exportScale));
		var connectionsGroup = MSLayerGroup.groupFromLayers(connectionLayers);
		connectionsGroup.setName("Connections");
		artboardBitmapLayers.push(connectionsGroup);
		connectionsGroup.setIsLocked(1);

		var groupBounds = CGRectZero;
		for (var i = 0; i < artboardBitmapLayers.length; i++) {
			groupBounds = CGRectUnion(groupBounds, artboardBitmapLayers[i].absoluteRect().rect());
		}
		var layers = MSLayerArray.arrayWithLayers(artboardBitmapLayers);
		var newGroup = MSLayerGroup.groupFromLayers(layers);
		newGroup.setName("Flow Group");
		newGroup.resizeToFitChildrenWithOption(1);

		var flowBoard = MSArtboardGroup.new();
		flowBoard.setName(flowName);
		flowBoard.setHasBackgroundColor(1);
		flowBoard.setBackgroundColor(flowBackgroundColor);

		var flowNameLabel = MSTextLayer.new();
		flowNameLabel.setName(flowName);
		flowNameLabel.frame().setX(outerPadding);
		flowNameLabel.frame().setY(outerPadding);
		flowNameLabel.frame().setWidth(groupBounds.size.width);
		flowNameLabel.setTextBehaviour(1);
		flowNameLabel.setStringValue(flowName);
		flowNameLabel.addAttribute_value(NSFontAttributeName, NSFont.fontWithName_size("HelveticaNeue", 18*exportScale));
		flowNameLabel.setTextColor(primaryTextColor);
		flowNameLabel.adjustFrameToFit();
		flowNameLabel.setIsLocked(1);
		flowBoard.addLayers([flowNameLabel]);

		var yPos = outerPadding + flowNameLabel.frame().height() + 14;

		if (flowDescription && flowDescription != "") {
			var flowDescriptionLabel = MSTextLayer.new();
			flowDescriptionLabel.setName("Flow Description");
			flowDescriptionLabel.frame().setX(outerPadding);
			flowDescriptionLabel.frame().setY(yPos);
			flowDescriptionLabel.frame().setWidth(groupBounds.size.width);
			flowDescriptionLabel.setTextBehaviour(1);
			flowDescriptionLabel.setStringValue(flowDescription);
			flowDescriptionLabel.addAttribute_value(NSFontAttributeName, NSFont.fontWithName_size("HelveticaNeue", 12*exportScale));
			flowDescriptionLabel.setTextColor(secondaryTextColor);
			flowDescriptionLabel.adjustFrameToFit();
			flowDescriptionLabel.setIsLocked(1);
			flowBoard.addLayers([flowDescriptionLabel]);
			yPos = flowDescriptionLabel.frame().y() + flowDescriptionLabel.frame().height();
		}

		if (showModifiedDate == 1) {

			var formatter = NSDateFormatter.alloc().init();
			formatter.setTimeStyle(NSDateFormatterNoStyle);
			formatter.setDateStyle(NSDateFormatterMediumStyle);

			var modifiedDateLabel = MSTextLayer.new();
			var modifiedOnText = "Modified on " + formatter.stringFromDate(NSDate.date());
			if (modifiedBy && modifiedBy != "") {
				modifiedOnText += " by " + modifiedBy;
			}
			modifiedDateLabel.setName("Modified Date");
			modifiedDateLabel.frame().setX(outerPadding);
			modifiedDateLabel.frame().setY(yPos + 12);
			modifiedDateLabel.frame().setWidth(groupBounds.size.width - (outerPadding*2));
			modifiedDateLabel.setTextBehaviour(1);
			modifiedDateLabel.setStringValue(modifiedOnText);
			modifiedDateLabel.addAttribute_value(NSFontAttributeName, NSFont.fontWithName_size("HelveticaNeue", 12*exportScale));
			modifiedDateLabel.setTextColor(secondaryTextColor);
			modifiedDateLabel.adjustFrameToFit();
			modifiedDateLabel.setIsLocked(1);
			flowBoard.addLayers([modifiedDateLabel]);
		}

		yPos += 60;

		newGroup.removeFromParent();
		flowBoard.addLayers([newGroup]);
		newGroup.frame().scaleBy(exportScale);
		newGroup.frame().setX(outerPadding);
		newGroup.frame().setY(yPos);
		flowBoard.frame().setWidth(newGroup.frame().width() + (outerPadding*2));
		flowBoard.frame().setHeight(yPos + newGroup.frame().height() + outerPadding);
		newGroup.ungroup();

		var flowPageName = pagesDropdown.titleOfSelectedItem(),
			flowPage = doc.pages().filteredArrayUsingPredicate(NSPredicate.predicateWithFormat("name == %@", flowPageName)).firstObject();;
		if (!flowPage) {
			flowPage = doc.addBlankPage();
			if (flowPageName == "[New Page]") {
				flowPageName = "Page " + doc.pages().count();
			}
			flowPage.setName(flowPageName);
		}

		flowPage.addLayers([flowBoard]);
		var shouldOrganize = keepOrganizedCheckbox.state();
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
			var originForNewArtboard = flowPage.originForNewArtboard();
			flowBoard.absoluteRect().setX(originForNewArtboard.x);
			flowBoard.absoluteRect().setY(originForNewArtboard.y);
		}

		context.command.setValue_forKey_onDocument_forPluginIdentifier(flowPageName, "lastUsedFlowPage", doc.documentData(), kPluginDomain);

		flowBoard.setConstrainProportions(false);
		flowBoard.resizeToFitChildrenWithOption(0);
		flowBoard.exportOptions().addExportFormat();

		doc.setCurrentPage(flowPage);
		flowBoard.select_byExpandingSelection(true, false);
		doc.currentView().zoomToFitRect(NSInsetRect(flowBoard.absoluteRect().rect(), -60, -60));

		// update defaults
		NSUserDefaults.standardUserDefaults().setObject_forKey(shouldOrganize, kKeepOrganizedKey);

		logEvent("generatedFlow", {numberOfScreens : screenNumber, format : exportFormat, exportScale : exportScale});
	}
}

var updateFlow = function(context) {

}

var hideConnections = function(context) {

	var doc = context.document;
	var connectionsLayerPredicate = NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).isConnectionsContainer == true", kPluginDomain);
	var connectionsGroup = doc.currentPage().children().filteredArrayUsingPredicate(connectionsLayerPredicate).firstObject();

	if (connectionsGroup) {
		connectionsGroup.removeFromParent();
	}

	NSUserDefaults.standardUserDefaults().setObject_forKey(0, kShowConnectionsKey);
}

var showConnections = function(context) {

	NSUserDefaults.standardUserDefaults().setObject_forKey(1, kShowConnectionsKey);

	redrawConnections(context);
}

var redrawConnections = function(context) {
	var doc = context.document || context.actionContext.document;
	var selectedLayers = doc.findSelectedLayers();
	var connectionsGroup = getConnectionsGroupInPage(doc.currentPage());

	if (connectionsGroup) {
		connectionsGroup.removeFromParent();
	}

	var linkLayersPredicate = NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).destinationArtboardID != nil", kPluginDomain),
		linkLayers = doc.currentPage().children().filteredArrayUsingPredicate(linkLayersPredicate),
		loop = linkLayers.objectEnumerator(),
		connections = [],
		linkLayer, destinationArtboardID, destinationArtboard, isCondition;

	while (linkLayer = loop.nextObject()) {

		destinationArtboardID = context.command.valueForKey_onLayer_forPluginIdentifier("destinationArtboardID", linkLayer, kPluginDomain);

		isCondition = context.command.valueForKey_onLayer_forPluginIdentifier("isConditionGroup", linkLayer, kPluginDomain) || 0;
		  
		destinationArtboard = doc.currentPage().artboards().filteredArrayUsingPredicate(NSPredicate.predicateWithFormat("objectID == %@", destinationArtboardID)).firstObject();
		if (destinationArtboard) {

			connection = {
		  		linkRect : linkLayer.absoluteRect().rect(),
		  		linkIsCondition : isCondition,
		  		dropPoint : {
		  			x : destinationArtboard.absoluteRect().x() - 10,
		  			y : destinationArtboard.absoluteRect().y()
		  		}
		  	}
		  	connections.push(connection);
		}
	}

	var connectionLayers = MSLayerArray.arrayWithLayers(drawConnections(connections, doc.currentPage(), 1));
	connectionsGroup = MSLayerGroup.groupFromLayers(connectionLayers);
	connectionsGroup.setName("Connections");
	connectionsGroup.setIsLocked(1);
	context.command.setValue_forKey_onLayer_forPluginIdentifier(true, "isConnectionsContainer", connectionsGroup, kPluginDomain);
	doc.currentPage().deselectAllLayers();

	var loop = selectedLayers.objectEnumerator(), selectedLayer;
	while (selectedLayer = loop.nextObject()) {
		selectedLayer.select_byExpandingSelection(true, true);
	}

	return connectionsGroup;
}

var drawConnections = function(connections, parent, exportScale) {
	var connectionsCount = connections.length,
		flowIndicatorColor = NSUserDefaults.standardUserDefaults().objectForKey(kFlowIndicatorColorKey) || "#F5A623",
		minimumTapArea = NSUserDefaults.standardUserDefaults().objectForKey(kMinTapAreaKey) || 44,
		showLinkRects = NSUserDefaults.standardUserDefaults().objectForKey(kShowsLinkRectsKey) || 1,
		strokeWidth = NSUserDefaults.standardUserDefaults().objectForKey(kStrokeWidthKey) || 3,
		connectionLayers = [],
		hitAreaColor = MSImmutableColor.colorWithSVGString("#000000").newMutableCounterpart(),
		hitAreaBorderColor = MSImmutableColor.colorWithSVGString(flowIndicatorColor).newMutableCounterpart(),
		arrowRotation = 0,
		arrowOffsetX = 0,
		path, hitAreaLayer, linkRect, dropPoint, hitAreaBorder, startPoint, controlPoint1, controlPoint1Offset, controlPoint2OffsetX, controlPoint2OffsetY, linePath, lineLayer, destinationArtboardIsConditional;
	hitAreaColor.setAlpha(0);

	for (var i=0; i < connectionsCount; i++) {
		connection = connections[i];
		linkRect = connection.linkRect;
		destinationArtboardIsConditional = connection.destinationIsConditional == 1;
		if (linkRect.size.width < minimumTapArea) {
			linkRect = NSInsetRect(linkRect, (linkRect.size.width-minimumTapArea)/2, 0);
		}
		if (linkRect.size.height < minimumTapArea) {
			linkRect = NSInsetRect(linkRect, 0, (linkRect.size.height-minimumTapArea)/2);
		}

		if (showLinkRects == 1 && connection.linkIsCondition != 1) {
			path = NSBezierPath.bezierPathWithRect(linkRect);
			hitAreaLayer = MSShapeGroup.shapeWithBezierPath(path);
			hitAreaLayer.style().addStylePartOfType(0).setColor(hitAreaColor);
			hitAreaBorder = hitAreaLayer.style().addStylePartOfType(1);
			hitAreaBorder.setColor(hitAreaBorderColor);
			hitAreaBorder.setPosition(2);
			hitAreaBorder.setThickness(2*exportScale);
			parent.addLayers([hitAreaLayer]);
			connectionLayers.push(hitAreaLayer);
		}

		dropPoint = destinationArtboardIsConditional ? NSMakePoint(connection.dropPoint.x+(5*exportScale), connection.dropPoint.y + (10*exportScale)) : NSMakePoint(connection.dropPoint.x, connection.dropPoint.y);
		if (dropPoint.x < CGRectGetMinX(linkRect)) {
			dropPoint = NSMakePoint(dropPoint.x + 18, dropPoint.y - (30/exportScale) );
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
		}
		
		linkRect = NSInsetRect(NSMakeRect(startPoint.x, startPoint.y, 0, 0), -5, -5);
		path = NSBezierPath.bezierPathWithOvalInRect(linkRect);
		hitAreaLayer = MSShapeGroup.shapeWithBezierPath(path);
		hitAreaLayer.style().addStylePartOfType(0).setColor(hitAreaBorderColor);
		parent.addLayers([hitAreaLayer]);
		connectionLayers.push(hitAreaLayer);

		linePath = NSBezierPath.bezierPath();
		linePath.moveToPoint(startPoint);
		linePath.curveToPoint_controlPoint1_controlPoint2(dropPoint, controlPoint1, NSMakePoint(dropPoint.x - controlPoint2OffsetX, dropPoint.y + controlPoint2OffsetY));

		lineLayer = MSShapeGroup.shapeWithBezierPath(linePath);
		lineLayer.setName("Flow arrow");
		hitAreaBorder = lineLayer.style().addStylePartOfType(1);
		hitAreaBorder.setColor(hitAreaBorderColor);
		hitAreaBorder.setThickness(strokeWidth*exportScale);
		hitAreaBorder.setPosition(0);
		parent.addLayers([lineLayer]);
		connectionLayers.push(lineLayer);

		var arrowSize = Math.max(12, strokeWidth*3);
		path = NSBezierPath.bezierPath();
		path.moveToPoint(NSMakePoint(dropPoint.x+(arrowSize*0.6), dropPoint.y));
		path.lineToPoint(NSMakePoint(dropPoint.x-arrowSize, dropPoint.y+(arrowSize*0.6)));
		path.lineToPoint(NSMakePoint(dropPoint.x-(arrowSize*0.6), dropPoint.y));
		path.lineToPoint(NSMakePoint(dropPoint.x-arrowSize, dropPoint.y-(arrowSize*0.6)));
		path.closePath();
		var arrow = MSShapeGroup.shapeWithBezierPath(path);
		arrow.style().addStylePartOfType(0).setColor(hitAreaBorderColor);
		arrow.setRotation(-arrowRotation);
		arrow.absoluteRect().setX(arrow.absoluteRect().x() + arrowOffsetX);
		parent.addLayers([arrow]);
		connectionLayers.push(arrow);

	}

	return connectionLayers;
}

var editSettings = function(context) {
	
	parseContext(context);
	var settingsWindow = getAlertWindow();
	settingsWindow.addButtonWithTitle("Save");
	settingsWindow.addButtonWithTitle("Cancel");
	settingsWindow.addButtonWithTitle("Reset Defaults");

	settingsWindow.setMessageText("User Flows Settings");
	settingsWindow.setInformativeText("v" + context.plugin.version() + " | © Aby Nimbalkar | @abynim");

	settingsWindow.addTextLabelWithValue("Artboard Export Options");
	var scaleOptions = [1, 2];
	var numOptions = scaleOptions.length;
	var exportScale = NSUserDefaults.standardUserDefaults().objectForKey(kExportScaleKey) || 1;
	var buttonCell = NSButtonCell.new();
	buttonCell.setTitle("Scale Options");
	buttonCell.setButtonType(NSRadioButton);

	var scaleOptionsMatrix = NSMatrix.alloc().initWithFrame_mode_prototype_numberOfRows_numberOfColumns(NSMakeRect(0, 0, 300, 22), NSRadioModeMatrix, buttonCell, 1, numOptions);
	scaleOptionsMatrix.setAutorecalculatesCellSize(true);
	scaleOptionsMatrix.setIntercellSpacing(NSMakeSize(10,10));
	var cells = scaleOptionsMatrix.cells();
	var scaleOption;

	for (var i = 0; i<numOptions; i++) {
		scaleOption = scaleOptions[i];
		cells.objectAtIndex(i).setTitle(scaleOption + "x");
		if (exportScale == scaleOption) {
			scaleOptionsMatrix.selectCellAtRow_column(0, i);
		}
	}

	var formatOptions = NSArray.arrayWithObjects("PDF", "PNG", "JPG", "TIFF");
	var exportFormat = NSUserDefaults.standardUserDefaults().objectForKey(kExportFormatKey) || "PNG";
	var selectedIndex = formatOptions.indexOfObject(exportFormat);
	var formatDropdown = NSPopUpButton.alloc().initWithFrame_pullsDown(NSMakeRect(100,1,70,22), false);
	formatDropdown.addItemsWithTitles(formatOptions);
	formatDropdown.selectItemAtIndex(selectedIndex);

	var exportOptionsView = NSView.alloc().initWithFrame(NSMakeRect(0,0,300,30));
	exportOptionsView.addSubview(scaleOptionsMatrix);
	exportOptionsView.addSubview(formatDropdown);
	settingsWindow.addAccessoryView(exportOptionsView);

	// ------------
	var separator = NSBox.alloc().initWithFrame(NSMakeRect(0,0,300,10));
	separator.setBoxType(2);
	settingsWindow.addAccessoryView(separator);
	// ------------

	settingsWindow.addTextLabelWithValue("Flow Background");
	var bgOptions = NSArray.arrayWithObjects("Light", "Dark");
	var bgMode = NSUserDefaults.standardUserDefaults().objectForKey(kFlowBackgroundKey) || "Light";
	var bgDropdown = NSPopUpButton.alloc().initWithFrame_pullsDown(NSMakeRect(0,0,70,22), false);
	selectedIndex = bgOptions.indexOfObject(bgMode);
	bgDropdown.addItemsWithTitles(bgOptions);
	bgDropdown.selectItemAtIndex(selectedIndex);
	settingsWindow.addAccessoryView(bgDropdown);

	settingsWindow.addTextLabelWithValue("Flow Indicator Stroke");
	var flowIndicatorColorWell = NSColorWell.alloc().initWithFrame(NSMakeRect(56,0,44,23));
	var flowIndicatorColorHex = NSUserDefaults.standardUserDefaults().objectForKey(kFlowIndicatorColorKey) || "#F5A623"
	var flowIndicatorColor = MSImmutableColor.colorWithSVGString(flowIndicatorColorHex).NSColorWithColorSpace(NSColorSpace.deviceRGBColorSpace())
	flowIndicatorColorWell.setColor(flowIndicatorColor);

	var strokeWidth = NSUserDefaults.standardUserDefaults().objectForKey(kStrokeWidthKey) || 3;
	var strokeWidthField = NSTextField.alloc().initWithFrame(NSMakeRect(0,0,50,23));
	strokeWidthField.setStringValue(strokeWidth + "px");

	var flowIndicatorOptionsView = NSView.alloc().initWithFrame(NSMakeRect(0,0,300,23));
	flowIndicatorOptionsView.addSubview(flowIndicatorColorWell);
	flowIndicatorOptionsView.addSubview(strokeWidthField);
	settingsWindow.addAccessoryView(flowIndicatorOptionsView);

	settingsWindow.addTextLabelWithValue("Minimum Link Area");
	var tapAreaField = NSTextField.alloc().initWithFrame(NSMakeRect(0,0,50,23));
	var minimumTapArea = NSUserDefaults.standardUserDefaults().objectForKey(kMinTapAreaKey) || 44;
	tapAreaField.setStringValue(minimumTapArea + "pt");
	settingsWindow.addAccessoryView(tapAreaField);

	var showLinkRects = NSUserDefaults.standardUserDefaults().objectForKey(kShowsLinkRectsKey) || 1;
	var showLinksCheckbox = NSButton.alloc().initWithFrame(NSMakeRect(0,0,300,22));
	showLinksCheckbox.setButtonType(NSSwitchButton);
	showLinksCheckbox.setBezelStyle(0);
	showLinksCheckbox.setTitle("Draw borders around link layers");
	showLinksCheckbox.setState(showLinkRects);
	settingsWindow.addAccessoryView(showLinksCheckbox);

	// ------------
	var separator = NSBox.alloc().initWithFrame(NSMakeRect(0,0,300,10));
	separator.setBoxType(2);
	settingsWindow.addAccessoryView(separator);
	// ------------

	settingsWindow.addTextLabelWithValue("Your Name");
	var userName = NSUserDefaults.standardUserDefaults().objectForKey(kFullNameKey) || "";
	var userNameField = NSTextField.alloc().initWithFrame(NSMakeRect(0,0,200,23));
	userNameField.setStringValue(userName);
	settingsWindow.addAccessoryView(userNameField);

	var showName = NSUserDefaults.standardUserDefaults().objectForKey(kShowModifiedDateKey) || 0;
	var showNameCheckbox = NSButton.alloc().initWithFrame(NSMakeRect(0,0,300,22));
	showNameCheckbox.setButtonType(NSSwitchButton);
	showNameCheckbox.setBezelStyle(0);
	showNameCheckbox.setTitle("Show Date and Name on Flows");
	showNameCheckbox.setState(showName);
	settingsWindow.addAccessoryView(showNameCheckbox);

	// ------------
	var separator = NSBox.alloc().initWithFrame(NSMakeRect(0,0,300,10));
	separator.setBoxType(2);
	settingsWindow.addAccessoryView(separator);
	// ------------

	var response = settingsWindow.runModal();

	if (response == "1000") {

		var exportScale = parseInt(scaleOptionsMatrix.selectedCell().title());
		var flowIndicatorColor = MSColor.colorWithNSColor(flowIndicatorColorWell.color()).immutableModelObject().svgRepresentation();
		NSUserDefaults.standardUserDefaults().setObject_forKey(exportScale, kExportScaleKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(formatDropdown.titleOfSelectedItem(), kExportFormatKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(bgDropdown.titleOfSelectedItem(), kFlowBackgroundKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(flowIndicatorColor, kFlowIndicatorColorKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(parseInt(strokeWidthField.stringValue()), kStrokeWidthKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(parseInt(tapAreaField.stringValue()), kMinTapAreaKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(showLinksCheckbox.state(), kShowsLinkRectsKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(userNameField.stringValue(), kFullNameKey);
		NSUserDefaults.standardUserDefaults().setObject_forKey(showNameCheckbox.state(), kShowModifiedDateKey);
		applySettings(context);
		logEvent("settingsChanged", { 
			exportScale : exportScale, 
			format : formatDropdown.titleOfSelectedItem(), 
			backgroundMode : bgDropdown.titleOfSelectedItem(), 
			showsName : showNameCheckbox.state(), 
			flowIndicatorColor : flowIndicatorColor
		});

	} else if (response == "1002") {
		
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kExportScaleKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kExportFormatKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kFlowBackgroundKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kFlowIndicatorColorKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kStrokeWidthKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kMinTapAreaKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kShowsLinkRectsKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kFullNameKey);
		NSUserDefaults.standardUserDefaults().removeObjectForKey(kShowModifiedDateKey);
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

var editShortcuts = function(context) {
	
	parseContext(context);
	var settingsWindow = getAlertWindow();
	settingsWindow.addButtonWithTitle("Save");
	settingsWindow.addButtonWithTitle("Cancel");

	settingsWindow.setMessageText("User Flows Keyboard Shortcuts");
	settingsWindow.setInformativeText("Shortcuts are defined by using a combination of modifiers (cmd, control, shift, option) and any other key. For example – 'cmd shift y'. Remember to check if a shortcut is already being used by a different plugin or by Sketch itself.");

	var manifestPath = context.plugin.url().URLByAppendingPathComponent("Contents").URLByAppendingPathComponent("Sketch").URLByAppendingPathComponent("manifest.json").path(),
		manifest = NSJSONSerialization.JSONObjectWithData_options_error(NSData.dataWithContentsOfFile(manifestPath), NSJSONReadingMutableContainers, nil),
		commands = manifest.commands,
		validCommands = manifest.menu.items,
		commandsCount = commands.count(),
		shortcutFields = {},
		command, shortcutField, shortcut;

	for (var i = 0; i < commandsCount; i++) {
		command = commands[i];
		if (!validCommands.containsObject(command.identifier))
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

	context.document.showMessage("Checking for updates...");

	var json = NSJSONSerialization.JSONObjectWithData_options_error(NSData.dataWithContentsOfURL(NSURL.URLWithString("https://abynim.github.io/UserFlows/version.json")), 0, nil),
		currentVersion = json.valueForKey("currentVersion"),
		currentVersionAsInt = getVersionNumberFromString(currentVersion),
		installedVersion = context.plugin.version(),
		installedVersionAsInt = getVersionNumberFromString(installedVersion),
		updateAvailable = currentVersionAsInt > installedVersionAsInt,
		updateAlert = getAlertWindow();

		updateAlert.setMessageText(updateAvailable ? "An update is available." : "You're good.");
		if (updateAvailable) {
			updateAlert.setInformativeText("The most recent version is " + currentVersion + " and you have version " + installedVersion + ". Please download and install the plugin again from the website.");
			updateAlert.addButtonWithTitle("Update Now");
			updateAlert.addButtonWithTitle("Later");
		} else {
			updateAlert.setInformativeText("You have the most recent version of UserFlows installed 👍");
			updateAlert.addButtonWithTitle("Done");
		}

		var response = updateAlert.runModal();
		if (updateAvailable && response == "1000") {
			var websiteURL = NSURL.URLWithString(json.valueForKey("websiteURL"));
			NSWorkspace.sharedWorkspace().openURL(websiteURL);
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
	iconImage = NSImage.alloc().initByReferencingFile(context.plugin.urlForResourceNamed("icon.png").path());
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

var logEvent = function(event, props) {
	var uuid = NSUserDefaults.standardUserDefaults().objectForKey(kUUIDKey);
	if (!uuid) {
		uuid = NSUUID.UUID().UUIDString();
		NSUserDefaults.standardUserDefaults().setObject_forKey(uuid, kUUIDKey);
	}
	var fProps = {
		token : "7175b47d63e993c9ec2a5cfd5a3f378c",
		sketchVersion : NSBundle.mainBundle().objectForInfoDictionaryKey("CFBundleShortVersionString"),
		uuid : uuid
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
