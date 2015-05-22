@import 'common.js'

var userDefaults = {
	flowsPageName:"_Flows",
	exportScaleIndex:1,
	flowIndicatorColor:"#F5A623",
	organizeFlows:1,
	showModifiedDate:1,
	minimumTapArea:44.0,
	fullName:"",
	exportFormat:"PDF"
}

var scaleOptions = ['1x', '2x'];
var formatOptions = [NSArray arrayWithObjects:"PNG", "JPG", "PDF", "TIFF", nil]
iconName = "icon.png"

var askForFlowDetails = function() {
	initDefaults(userDefaults)
	
	if(selectionIsEmpty()) {
		showDialog("Select layers or artboards you want to use to make a flow.")
		return
	}
	
	var alert = createAlertBase(false)
	[alert addButtonWithTitle: 'Generate'];
	[alert addButtonWithTitle: 'Cancel'];
	
	[alert setMessageText: 'Generate a User Flow']
	
	// suggest presiously used Flow Names
	var allArtboards = getAllArtboardsInDoc(),
		flowArtboardNames = [NSArray new],
		flowArtboardName;
	
	flowArtboardNames = [flowArtboardNames arrayByAddingObject:""]
	var loop = [allArtboards objectEnumerator]
	while (artboard = [loop nextObject]) {
		if ([currentCommand valueForKey:@"isUserFlow" onLayer:artboard forPluginIdentifier:pluginDomain] == 1) {
			flowArtboardName = [artboard name]
			if (![flowArtboardNames containsObject:flowArtboardName] && flowArtboardName != "Untitled Flow") {
				flowArtboardNames = [flowArtboardNames arrayByAddingObject:flowArtboardName]
			}
		}
	}
	
	[alert addTextLabelWithValue: 'Flow Name'] // 0
	if([flowArtboardNames count] == 0) {
		[alert addTextFieldWithValue: 'New Flow'] // 1
	} else {
    	[alert addAccessoryView: createSelect(flowArtboardNames, 0)] // 1
	}
	
	[alert addTextLabelWithValue: 'Description'] // 2
	[alert addAccessoryView: createTextArea("", 300, 100)] // 3
	
	[alert addAccessoryView: createSeparator()] // 4
	
	var pageNames = [NSArray new],
		pages = [doc pages], pName;

	pageNames = [pageNames arrayByAddingObject:"_Flows"]
	var loop = [pages objectEnumerator]
	while (page = [loop nextObject]) {
		pName = [page name]
		if (pName != "_Flows") {
			pageNames = [pageNames arrayByAddingObject:pName]
		}
	}
	pageNames = [pageNames arrayByAddingObject:"[New Page]"]
	
	var lastSelectedPageName = getDefault('flowsPageName'),
		lastSelectedPageIndex = [pageNames containsObject:lastSelectedPageName] ? [pageNames indexOfObject:lastSelectedPageName] : 0
	[alert addTextLabelWithValue: 'Add to Page'] // 5
	[alert addAccessoryView: createDropDown(pageNames, lastSelectedPageIndex)] // 6
	
	[alert addAccessoryView: createCheckbox({name: 'Keep _Flows Page Organized', value: 'organizeFlows'}, getDefault('organizeFlows'))] // 7
	
	var webView = createWebViewWithURL("http://silverux.com/sketchplugins/userflows/ga.html", 0, 0, 0, 0)
	[alert addAccessoryView: webView] // 8

	if ([alert runModal] == "1000") {
		var view, pageName, 
			scaleIndex = getDefault('exportScaleIndex');
		view = elementAtIndex(alert, 6)
		pageName = [view titleOfSelectedItem];
		
		var settings = {
			flowName: valueAtIndex(alert, 1),
			flowDescription: valueAtIndex(alert, 3),
			showModifiedDate: getDefault('showModifiedDate'),
			exportToPage: pageName,
			organizeFlows: checkedAtIndex(alert, 7),
			exportToScale: scaleIndex + 1,
			flowIndicatorColor: getDefault('flowIndicatorColor'),
			minimumTapArea: getDefault('minimumTapArea'),
			modifiedBy: getDefault('fullName')
		}
		// Save Defaults
		setDefault('flowsPageName', pageName)
		setDefault('organizeFlows', settings.organizeFlows)
		
		generateFlowWithSettings(settings)
	}
}

var generateFlowWithSettings = function(s) {
	
	var exportScale = s.exportToScale,
		exportFormat = getDefault('exportFormat').toLowerCase(),
		spacing = 50*exportScale,
		outerPadding = 40*exportScale,
		selectedArtboards = [NSArray array],
		flowBoard = [MSArtboardGroup new],
		flowWidth = outerPadding, 
		flowHeight = 0,
		flowName = s.flowName,
		flowGroup = addGroup(flowName, flowBoard),
		flowDescription = s.flowDescription,
		flowIndicatorColor = (s.flowIndicatorColor.indexOf("#") == -1) ? s.flowIndicatorColor : s.flowIndicatorColor.substr(1),
		minimumTapArea = s.minimumTapArea,
		flowLabel, flowFrame, optimalPosition, flowDescriptionLabel, modifiedDateLabel;
	
	// get artboards from selection	
	var ab, selectedObjectRect, artboardAndRect, abID,
	uniqueArtboards = [];
	var loop = [selection objectEnumerator]
	while (item = [loop nextObject]) {
		ab = getParentArtboard(item);
		abID = [ab objectID];
		if(uniqueArtboards.indexOf(abID) == -1) {
			if (![ab hasBackgroundColor]) setArtboardColor(ab, 'FFFFFF')
			selectedObjectRect = isArtboard(item) ? {x:0,y:0,width:0,height:0} : addPaddingIfRequired(getFrame(item, ab), minimumTapArea);
			artboardAndRect = {artboard:ab, selectionRect:selectedObjectRect}
			selectedArtboards = [selectedArtboards arrayByAddingObject:artboardAndRect]
			uniqueArtboards.push(abID);
		}
	}
	
	// sort artboards by x position
	selectedArtboards = [selectedArtboards sortedArrayUsingDescriptors:[
		[NSSortDescriptor sortDescriptorWithKey:@"artboard.absoluteRect.rulerX" ascending:true]
	]]
	
	// setup the flow artboard	
	[currentPage addLayers:[flowBoard]]
	if (flowName == "") [flowBoard setName:"Untitled Flow"]
	else [flowBoard setName:flowName]
	optimalPosition = getOptimalPositionForNewArtboardInPage()
	setPosition(flowBoard, optimalPosition.x, optimalPosition.y)
	setArtboardColor(flowBoard, 'FFFFFF')

	flowFrame = getRect(flowBoard)
	[currentCommand setValue:1 forKey:@"isUserFlow" onLayer:flowBoard forPluginIdentifier:pluginDomain]
	
	// setup flow name, description, and date labels
	if(s.showModifiedDate == 1) {
		modifiedDateLabel = addText("_Modified Date", flowBoard, 9*exportScale);
		setColor(modifiedDateLabel, '999999')
		[modifiedDateLabel setIsLocked:true];
		setPosition(modifiedDateLabel, outerPadding, outerPadding)
		setSize(modifiedDateLabel, 10, 10)
	}
	if(flowDescription != "") {
		flowDescriptionLabel = addText("_Description", flowBoard, 12*exportScale);
		setColor(flowDescriptionLabel, '999999')
		[flowDescriptionLabel setIsLocked:true];
		setPosition(flowDescriptionLabel, outerPadding, outerPadding)
		setSize(flowDescriptionLabel, 10, 10)
	}
	
	flowLabel = addText(flowName, flowBoard, 18*exportScale);
	[flowLabel setIsLocked:true];
	setPosition(flowLabel, outerPadding, outerPadding);
	setSize(flowLabel, 10, 10)
	
	// create images for artboards and populate the flow artboard
	var artboard, screenImage, screenLayer, screenFrame, aWidth, aHeight, selectionRect, hitAreaLayer, hitAreaFrame, arrowContainer, textLayer, textFrame, screenContainer, screenY, arrow, arrowStartPoint, arrowEndPoint, arrowY, screenNumber = 0;
	
	loop = [selectedArtboards objectEnumerator]
	while (ar = [loop nextObject]) {
		artboard = ar.artboard;
		selectionRect = ar.selectionRect;
		screenFrame = getFrame(artboard)
		aWidth = screenFrame.width*exportScale
		aHeight = screenFrame.height*exportScale
		
		screenContainer = addGroup([artboard name], flowGroup)
		setPosition(screenContainer, flowWidth, outerPadding)
		
		screenNumber++;
		textLayer = addText([artboard name], screenContainer, 12*exportScale)
		setPosition(textLayer, 0, 0)
		setSize(textLayer, aWidth, 10)
		[textLayer setTextBehaviour:1]
		[textLayer setStringValue:screenNumber + ": " + [artboard name]]
		textFrame = getFrame(textLayer)
		screenY = textFrame.height+10
	
		screenLayer = flattenLayerToBitmap(artboard, true, exportScale, exportFormat)
		setPosition(screenLayer, 0, screenY, true)
		removeLayer(screenLayer)
		[screenContainer addLayers:[screenLayer]]
		setShadow(screenLayer)
	
		// add hit area layer
		if(selectionRect.width != 0 && selectionRect.height != 0) {
			arrowContainer = addGroup("Flow Indicator", screenContainer)
			hitAreaLayer = addShape("Tap Area", arrowContainer)
			setPosition(hitAreaLayer, flowFrame.x+flowWidth+(selectionRect.x*exportScale), flowFrame.y+outerPadding+screenY+(selectionRect.y*exportScale), true)
			setSize(hitAreaLayer, (selectionRect.width*exportScale), (selectionRect.height*exportScale), true)
			setColor(hitAreaLayer, '000000', 0)
			setBorder(hitAreaLayer, 2*exportScale, 2, flowIndicatorColor, 1)
		
			hitAreaFrame = getFrame(hitAreaLayer)
			arrowY = hitAreaFrame.y+(hitAreaFrame.height/2);
			arrowStartPoint = {x:hitAreaFrame.x+hitAreaFrame.width, y:arrowY}
			arrowEndPoint = {x:aWidth+(spacing/2), y:arrowY}
			arrow = addLine('Flow Arrow', arrowContainer, arrowStartPoint, arrowEndPoint, 2*exportScale, flowIndicatorColor)

			[[arrow firstLayer] setEndDecorationType:1]
		
			[arrowContainer resizeRoot:false];
		}
	
		[screenContainer resizeRoot:false];
		flowWidth += getFrame(screenContainer).width + spacing
		flowHeight = Math.max(flowHeight, getFrame(screenContainer).height)
	}

	// update flow artboard dimensions and add it to current page
	[flowGroup resizeRoot:false];
	[flowGroup setHasClickThrough:true];
	
	flowWidth -= (spacing-outerPadding)
	flowHeight += (outerPadding*2);
	
	setSize(flowLabel, flowWidth-(outerPadding*2), 10);
	[flowLabel setTextBehaviour:1];
	[flowLabel setStringValue:flowName];
	[flowLabel adjustFrameToFit];
	var flowLabelFrame = getFrame(flowLabel);
	var descriptionLabelHeight = 0
	
	if(flowDescription != "") {
		setSize(flowDescriptionLabel, flowWidth-(outerPadding*2), 10);
		[flowDescriptionLabel setTextBehaviour:1];
		[flowDescriptionLabel setStringValue:flowDescription];
		[flowDescriptionLabel adjustFrameToFit];
		setPosition(flowDescriptionLabel, outerPadding, outerPadding+flowLabelFrame.height + 14)
		descriptionLabelHeight = getFrame(flowDescriptionLabel).height + 10;
	}
	
	if(s.showModifiedDate == 1) {
		var modifiedOnText = "Modified on " + getCurrentDateAsString();
		if(s.modifiedBy != "") modifiedOnText += " by " + s.modifiedBy;
		setSize(modifiedDateLabel, flowWidth-(outerPadding*2), 10);
		[modifiedDateLabel setTextBehaviour:1];
		[modifiedDateLabel setStringValue:modifiedOnText];
		[modifiedDateLabel adjustFrameToFit];
		setPosition(modifiedDateLabel, outerPadding, outerPadding+flowLabelFrame.height + 14 + descriptionLabelHeight)
	}
	
	var flowInfoHeight = (s.showModifiedDate == 1) ? flowLabelFrame.height + 14 + descriptionLabelHeight + getFrame(modifiedDateLabel).height : flowLabelFrame.height + 14 + descriptionLabelHeight;
	
	setPosition(flowGroup, flowLabelFrame.x, flowInfoHeight+(outerPadding*2))
	setSize(flowBoard, flowWidth, flowHeight+flowInfoHeight+outerPadding)

	[flowGroup resizeRoot:false];
	
	// move flow to another page if required
	if (s.exportToPage != [currentPage name]) {
		[currentPage removeLayer: flowBoard]
		
		var flowsPage, existingPages = [doc pages];
		loop = [existingPages objectEnumerator]
		while (item = [loop nextObject]) {
			if([item name] == s.exportToPage) {
				flowsPage = item
				break;
			}
		}
		if(!flowsPage) {
			flowsPage = [doc addBlankPage]
			if (s.exportToPage == "[New Page]") {
				var newPageName = "Page " + [existingPages count]
				[flowsPage setName:newPageName]
				setDefault('flowsPageName', newPageName)
			} else {
				[flowsPage setName:s.exportToPage]
			}
		}
		[doc setCurrentPage:flowsPage]
		[flowsPage addLayers:[flowBoard]]
		
		if([flowsPage name] == "_Flows" && s.organizeFlows) { 
			organizeArtboardsInPage(flowsPage, 160, 6)
		} else {
			optimalPosition = getOptimalPositionForNewArtboardInPage(flowsPage)
			setPosition(flowBoard, optimalPosition.x, optimalPosition.y)
		}
	}
	
	
	[flowBoard setConstrainProportions:false];
	[flowBoard resizeRoot:false];
	
	makeExportable(flowBoard)
	var exportSize = [[[[flowBoard exportOptions] sizes] array] lastObject]
	exportSize.format = exportFormat

	[flowBoard select:true byExpandingSelection:false];
	
	// zoom to fit new flowboard
	[[doc currentView] zoomToFitRect:[[flowBoard absoluteRect] rect]];
}

var addPaddingIfRequired = function(rect, minDimensions) {
	var diff;
	if (rect.width < minDimensions) {
		diff = minDimensions-rect.width
		rect.x = Math.round(rect.x - (diff/2))
		rect.width = Math.round(rect.width  + diff)
	}
	if (rect.height < minDimensions) {
		diff = minDimensions-rect.height
		rect.y = Math.round(rect.y - (diff/2))
		rect.height = Math.round(rect.height  + diff)
	}
	return rect
}

var showSettingsDialog = function() {
	initDefaults(userDefaults)
	
	var alert = createAlertBase(),
		versionText = "Version " + [plugin version] + "  -  © Aby Nimbalkar - aby@silverux.com";
	[alert setMessageText: 'User Flow Settings']
	[alert setInformativeText: versionText]
	
	var lastSelectedExportScaleIndex = getDefault('exportScaleIndex')
	[alert addTextLabelWithValue: 'Artboard Export Options'] // 0
	var radioButtons = createRadioButtons(scaleOptions, 1, scaleOptions.length, "Scale Options", lastSelectedExportScaleIndex)

	var lastSelectedFormat = getDefault('exportFormat'),
		lastSelectedFormatIndex = [formatOptions indexOfObject:lastSelectedFormat]
	var formatDropdown = createDropDown(formatOptions, lastSelectedFormatIndex)
	[formatDropdown setFrame:NSMakeRect(100,1,70,22)]

	var exportOptionsView = [[NSView alloc] initWithFrame:NSMakeRect(0, 0, 300, 30)];
	[exportOptionsView addSubview:radioButtons]
	[exportOptionsView addSubview:formatDropdown]

	[alert addAccessoryView: exportOptionsView] // 1
	
	[alert addAccessoryView: createSeparator()] // 2
	
	[alert addTextLabelWithValue: 'Color of Flow Indicators'] // 3
	var colorWell = createColorWell(getDefault('flowIndicatorColor'))
	[alert addAccessoryView: colorWell] // 4
	
	[alert addTextLabelWithValue: 'Minimum Tap Area'] // 5
	[alert addAccessoryView: createTextArea(getDefault('minimumTapArea')+"px", 50, 23)] // 6
	
	[alert addAccessoryView: createSeparator()] // 7
	
	[alert addTextLabelWithValue: 'Your Name'] // 8
	[alert addTextFieldWithValue: getDefault('fullName')] // 9
	
	[alert addAccessoryView: createCheckbox({name: 'Show Date and Name on Flows', value: 'showModifiedDate'}, getDefault('showModifiedDate'))] // 10
	
	[alert addAccessoryView: createSeparator()] // 11
	
	[alert addButtonWithTitle: 'Reset Defaults'];
	
	var response = [alert runModal]
	
	if (response == "1000") {
		scaleIndex = [[radioButtons selectedCell] tag]-100;


		var newColor = [colorWell color],
			exportFormat = [formatDropdown titleOfSelectedItem],
			newHex = NSColorToHex(newColor)
		setDefault('exportScaleIndex', scaleIndex)
		setDefault('flowIndicatorColor', newHex)
		setDefault('minimumTapArea', parseFloat(valueAtIndex(alert, 6)))
		setDefault('fullName', valueAtIndex(alert, 9))
		setDefault('showModifiedDate', checkedAtIndex(alert, 10))
		setDefault('exportFormat', exportFormat)
	} else if (response == "1002") {
		resetDefaults(userDefaults)
	}
}