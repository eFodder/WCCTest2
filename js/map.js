var currentLatitude = 0;
var currentLongitude = 0;
var locationLoaded = false;
var mapSetup = false;
var zoomLevel = 1;
var inAdmin = false;
var isDragging = false;
var stopClick = false;
var feedProcess;
var feedExpanded = false;

var newHotspot = { points:[] };

// This function fires the phonegap call to actually get the Geoposition - called by setupMap
function getCurrentPosition() {
	if(!debug.isDebug && navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(onPositionSuccess, onPositionError);
	} else {
		// Use debug data - this will need to be changed when it becomes a proper app in which case debug data should not be used unless it has been explicitly set.
		currentLatitude = debug.latitude;
		currentLongitude = debug.longitude;	
		
		locationLoaded = true;
		if (mapSetup) {
			setLatLongRatios();
		}
	}	
}

// This function is fired when the geolocation check is successful - called by getCurrentPosition
function onPositionSuccess(geoPosition) {
	/*$('#location-output').html(
		'Latitude: '           + position.coords.latitude              + '<br />' +
		'Longitude: '          + position.coords.longitude             + '<br />' +
		'Altitude: '           + position.coords.altitude              + '<br />' +
		'Accuracy: '           + position.coords.accuracy              + '<br />' +
		'Altitude Accuracy: '  + position.coords.altitudeAccuracy      + '<br />' +
		'Heading: '            + position.coords.heading               + '<br />' +
		'Speed: '              + position.coords.speed                 + '<br />' +
		'Timestamp: '          + position.timestamp                    + '<br />');*/
	
	currentLatitude = geoPosition.coords.latitude;
	currentLongitude = geoPosition.coords.longitude;
	
	locationLoaded = true;
	if (mapSetup) {
		setLatLongRatios();
	}
}

// This function is fired when the geolocation check is unsuccessful - called by getCurrentPosition
function onPositionError(error) {
	/*$('#location-output').html('Unable to obtain position:<br>' + 
		'code: '    + error.code    + '<br>' +
		'message: ' + error.message + '<br>');*/
	console.log('Unable to obtain position');
	
	//Revert to debug while we are testing
	currentLatitude = debug.latitude;
	currentLongitude = debug.longitude;
	
	locationLoaded = true;
	if (mapSetup) {
		setLatLongRatios();
	}
}

// This function sizes the map to fit the viewport - initially called by setupMap
function resizeMapImage() {
	var img = $('#map-image');
	img.css({  });
	var imageWidth = img.outerWidth();
	var imageHeight = img.outerHeight();
	var imageRatio = imageWidth / imageHeight;
	
	$('#map-outer').css({ 'width':$(window).width()+'px', 'height':$(window).height()+"px", 'overflow':'hidden' });
	// True size variables
	var tWidth = $(window).width();
	var tHeight = $(window).height();
	// Size Constraints of inner panel based on the current zoom level - we will calculate based on these virtual figures.
	var vWidth = $(window).width() * config['zoom'+zoomLevel];
	var vHeight = $(window).height() * config['zoom'+zoomLevel];
	
	if (imageWidth < vWidth) {
		imageWidth = vWidth;
		imageHeight = imageWidth / imageRatio;
	}
	//Ratio based on width
	var ratio = imageWidth / vWidth;
	//Ratio based on height
	if (vHeight < (imageHeight / ratio)) {
		ratio = imageHeight / vHeight;
	}
	
	var newWidth = imageWidth / ratio;
	var newHeight = imageHeight / ratio;
	
	//Calculate positioning information based on the true screen sizes
	var xPos = (tWidth - newWidth) / 2;
	var yPos = (tHeight - newHeight) / 2;
	
	mapdata.xPosition = xPos;
	mapdata.yPosition = yPos;
	mapdata.mapWidth = newWidth;
	mapdata.mapHeight = newHeight;
	
	/*mapdata.zoomX = mapdata.xPosition;
	mapdata.zoomY = mapdata.yPosition;
	mapdata.zoomWidth = mapdata.mapWidth;
	mapdata.zoomHeight = mapdata.mapHeight;*/
	
	$(img).css({ 'width':newWidth, 'height':newHeight });
	$('#map-inner').css({ 'position':'relative', 'left':xPos, 'top':yPos, 'width':newWidth+'px', 'height':newHeight+'px' });
	
	//Size hotspot holder to match -- we need to do this to catch click events
	$('#hotspot-holder').css({
			'position':'absolute',
			'top':'0px',
			'left':'0px',
			'width':mapdata.mapWidth+'px',
			'height':mapdata.mapHeight+'px'
		});
	
	//Map is setup so we can add the hotspots to it - user position does not affect this
	zoomControls();
	drawHotspots();
	// The core details stored active points should be fine but if we have zoomed etc then the points xPoint / yPoint will be off so update these
	$.each(newHotspot.points, function(index, point) {
		var xPointInit = percentageAsPoint(point.xPos, false);
		var yPointInit = percentageAsPoint(point.yPos, true);
		//Update point data and actual point
		point.xPointInit = xPointInit;
		point.yPointInit = yPointInit;
		point.xPoint = xPointInit - ($('#point' + index).outerWidth() / 2);
		point.yPoint = yPointInit - ($('#point' + index).outerHeight() / 2);
		// If there is a line to this point then update that too
		if ($('#line' + index).length > 0) {
			//remove so we can redraw
			$('#line' + index).remove();
			//Using p1x,p1y,p2x.. to represent point1Xposition, point1YPosition etc. 
			var p1x = newHotspot.points[index-1].xPointInit;
			var p1y = newHotspot.points[index-1].yPointInit;
			
			drawLineBetweenPoints(index, p1x, p1y, xPointInit, yPointInit);
		}
		$('#point' + index).css({ left:point.xPoint+'px', top:point.yPoint+'px' });
	});
		
	mapSetup = true;
	if (locationLoaded){
		setLatLongRatios();
	}
}

// This function converts working lat/long values to positives and calculates ratios - called by setLatLongRatios
function setPositionValues() {
	mapdata.currentLat = Math.abs(currentLatitude);
	mapdata.currentLong = Math.abs(currentLongitude);
	mapdata.topLat = Math.abs(config.topLat);
	mapdata.botLat = Math.abs(config.botLat);
	mapdata.leftLong = Math.abs(config.leftLong);
	mapdata.rightLong = Math.abs(config.rightLong);
	
	mapdata.latRatio = mapdata.mapHeight / (mapdata.botLat - mapdata.topLat);
	mapdata.longRatio = mapdata.mapWidth / (mapdata.rightLong - mapdata.leftLong);	
}

// This function sets the zoom display of the map - called by resizeMapImage
function zoomControls() {
	console.log('Setting zoom control');
	
	//The zoom arrow is floating on the right of the screen, this needs to have boundries (top/bottom) as well as increments to move by
	mapdata.zoomIconHeight = $('.zoom-level').outerHeight();
	mapdata.zoomTop = $('.zoom-in:first').outerHeight();
	mapdata.zoomBot = $(window).height() - $('.zoom-out:first').outerHeight() - mapdata.zoomIconHeight;	
	var zoomable = mapdata.zoomBot - mapdata.zoomTop;
	mapdata.zoomIncrement = zoomable / (config.zoomLevels-1);
	
	console.log(mapdata);
	
	//Current zoomicon position
	var currentZoomPos = mapdata.zoomBot - ((zoomLevel - 1) * mapdata.zoomIncrement);
	$('.zoom-level').css('top',currentZoomPos+'px');
	
}

// This function performs a change in the zoom level, either zooming in one increment (true) or out (false) - called by user clicking the zoom controls
function zoomMapIn(zoomIn) {
	if(zoomIn){
		if (zoomLevel == config.zoomLevels) { return; }
		zoomLevel++;
	} else {
		if (zoomLevel == 1) { return; }
		zoomLevel--;
	}
	
	resizeMapImage();
}

// This function adds the geolocation icon to the map - called by resizeMapImage if location has been loaded, otherwise by onPositionSuccess
function setLatLongRatios() {
	setPositionValues();
	
	if (mapdata.currentLat > mapdata.topLat
			&& mapdata.currentLat < mapdata.botLat
			&& mapdata.currentLong > mapdata.leftLong
			&& mapdata.currentLong < mapdata.rightLong) {
		console.log('within map bounds');
		/*var iconTop =  
			((mapdata.currentLat - mapdata.topLat) * mapdata.latRatio) 
			- ($('#currentUserPosition').outerHeight() / 2);
		var iconLeft = 
			((mapdata.currentLong - mapdata.leftLong) * mapdata.longRatio)
			- ($('#currentUserPosition').outerWidth() / 2);*/
				
		// We must have an icon div created in order to position it
		if ($('#currentUserPosition').length == 0) {
			$('#map-inner').append('<div id="currentUserPosition"></div>'); 
		}	

		var iconTop =  
			((mapdata.currentLat - mapdata.topLat) * mapdata.latRatio) 
			- ($('#currentUserPosition').outerHeight());
		var iconLeft = 
			((mapdata.currentLong - mapdata.leftLong) * mapdata.longRatio)
			- ($('#currentUserPosition').outerWidth() / 2);
		console.log('left = '+iconLeft+'\n top = '+iconTop);
		
		$('#currentUserPosition').css({ 'top':iconTop+'px', 'left':iconLeft+'px'});
	} else {
		console.log('outside of map bounds');
	}
}

// This function draws all hotspots and titles on top of the map - This is currently done with SVG which allows us to style the generated polygons with a greater degree of control unlike image-maps which do not allow for individual styling of components.  - called by closeHotspot and resizeMapImage
function drawHotspots() {
	if (mapHotspots.length > 0) {
		console.log('Drawing Hotspots');
	
		//Currently using SVG as it seems to be the best solution, image maps does not support styling of the individual shapes and am unsure how this would react once we get pinch/zoom added.
		
		//Start with a clean slate
		$('#hotspot-map').remove();	
		$('#hotspot-titles').remove();
		$('#hotspot-content').remove();
		
		
		//Add to the holder, this needs to be done with pure js as jquery does not play nicely
		var container = document.getElementById("hotspot-holder");
		mapSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		mapSvg.setAttribute("version", "1.2");
		mapSvg.setAttribute("baseProfile", "tiny");
		mapSvg.setAttribute("id", "hotspot-map");
		container.appendChild(mapSvg);
		
		//The hotspot titles should be above the areas so this needs to be placed after the svg has been created
		$('#hotspot-holder').append('<div id="hotspot-titles"></div>');
		//The hotspot content popups should display above all other content so this needs to be placed after everything else
		$('#hotspot-holder').append('<div id="hotspot-content"></div>');
		
		$('#hotspot-map').css({
			  'position': 'relative',
			  'width':mapdata.mapWidth+'px',
			  'height':mapdata.mapHeight+'px'
			})
			
		for (var i = 0; i < mapHotspots.length; i++) {
			var hotspot = mapHotspots[i];
			
			var pointString = '';
			//Cycle all points to construct the point string
			$.each(hotspot.points, function(index, point) {
				//console.log(point);
				var xPoint = percentageAsPoint(point.xPos,false);
				var yPoint = percentageAsPoint(point.yPos,true);
				if (pointString.length > 0) { pointString += ' '; }
				pointString += xPoint + ',' + yPoint;
			})
			
			// Adding the polygon object through jquery will not work, it will add it to the dom but not the display, this needs to be done with pure js.
			hotspotPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
			hotspotPolygon.setAttribute("id", "hotspot-boundry-"+i);
			hotspotPolygon.setAttribute("class", "hotspot-boundry");
			hotspotPolygon.setAttribute("points", pointString);
			hotspotPolygon.setAttribute("onclick", "" +
				"if(!isDragging){ " +
					"$('#hotspot-content-"+i+"').popup(); " +
					"$('#hotspot-content-"+i+"').css('display','block'); " +
					"$('#hotspot-content-"+i+"').popup('open'); " +
				"}");
			hotspotPolygon.setAttribute("data-rel", "popup");
			mapSvg.appendChild(hotspotPolygon);
			
			//The popup is triggered by jquery mobile through the data-role / data-rel tags.  The divs containing popup content will be placed in a div after all other map data to ensure it is shown on top
			var contentPanel = '<div id="hotspot-content-'+i+'" data-role="popup" class="hotspot-content" data-overlay-theme="a">' +
					'<div class="panel-head">' + hotspot.name + '</div>' +
					'<div class="panel-content">' + hotspot.content + '</div>';
			
			if (hotspot.feedingTimes && hotspot.feedingTimes.length > 0) {
				contentPanel += '<div class="feedTimesTable"><table class="feedTable"><tbody><tr><th>Name</th><th>Time</th></tr>';
				$.each(hotspot.feedingTimes, function(index, ftime){
					contentPanel += '<tr><td>' + ftime.name + '</td><td>' + ('0' + ftime.time.hour).slice(-2) + ':' + ('0' + ftime.time.minute).slice(-2) + '</td></tr>';
				});
				contentPanel += '</tbody></table></div>';
			}
					
			contentPanel +=	'</div>';
			$('#hotspot-content').append(contentPanel);
			
			// Check for feeding times
			var timeText = '';
			
			
			if (hotspot.feedingTimes && hotspot.feedingTimes.length > 0) {
				var timeId = getNextFeedingTime(i);
				
				if (timeId == null) {
					timeText = 'No feedings left today';
				} else {
					timeText = 'Next feeding: '+('0' + hotspot.feedingTimes[timeId].time.hour).slice(-2)+':'+('0' + hotspot.feedingTimes[timeId].time.minute).slice(-2);
				}
			}
			
			var titleHtml = '<div id="hotspot-title-'+i+'" class="hotspot-title">'+
				'<div class="title">' + hotspot.name + '</div>';
			if (timeText.length > 0) {
				titleHtml += '<div class="feeding">' + timeText + '</div>';
			}
			titleHtml += '</div>'
			$('#hotspot-titles').append(titleHtml);
			var boundry = $('#hotspot-boundry-'+i);
			$('#hotspot-title-'+i).css({ 
				'left':boundry.position().left + (boundry[0].getBBox().width / 2) - ($('#hotspot-title-'+i).outerWidth() / 2),
				'top':boundry.position().top + (boundry[0].getBBox().height / 2) - ($('#hotspot-title-'+i).outerHeight() / 2)
			})
		}
			
	} else {
		console.log('No Hotspots to draw');
	}
}

//This function finalises the hotspot being created, adds name and content and cleans up the temporary displayed content - called by the user clicking 'Close Hotspot'
function closeHotspot() {
	console.log('Closing Hotspot');
	
    var hotspotName=prompt("Please enter a display name for the new hotspot","hotspot-"+mapHotspots.length);
    if (hotspotName != null){
       var hotspotContent=prompt("Please enter the content for "+hotspotName,"Hotspot Content");
	   if (hotspotContent != null) {
			//Should now have all the information we need to create a new hotspot, combine it all together and clean up the temporary elements.//
			newHotspot.name = hotspotName;
			newHotspot.content = hotspotContent;
			newHotspot.id = mapHotspots.length;
		
			mapHotspots.push(newHotspot);
			
			console.log('***** new Hotspot *****');
			console.log(JSON.stringify(newHotspot));
		   
			$('#hotspot-holder').off('click');
			$('#mappage').css('cursor','auto');
			$('#point-controls').css('display','none');
			$('.creatingHS').remove();

			drawHotspots();	
			inAdmin = false;
	   }
   }
}

//This function adds a hotspot point at the current mouse position. It also draws a line between this point and the next if required
var addPoint = function(e) {
	if (!isDragging) {
		console.log('Adding Point');
		
		var xPos = pointAsPercentage(e.pageX, false);
		var yPos = pointAsPercentage(e.pageY, true);
		
		//Setup working vals
		var thisId = newHotspot.points.length;
		
		//Add visual representation of point to the map
		var newPoint = $('#map-image').parent().append('<div id="point' + thisId + '" class="new-point creatingHS"></div>');
		var pointRef = $('#point' + thisId);
		var xPointInit = percentageAsPoint(xPos,false);
		var yPointInit = percentageAsPoint(yPos,true)
		var xPoint = xPointInit - (pointRef.outerWidth() / 2);
		var yPoint = yPointInit - (pointRef.outerHeight() / 2);
		pointRef.css({ 'left':xPoint+'px','top':yPoint+'px' });
		
		var newPointObject = {
			pointId:thisId,
			pageX:e.pageX,
			pageY:e.pageY,
			xPos:xPos,
			yPos:yPos,
			xPointInit:xPointInit,
			yPointInit:yPointInit,
			xPoint:xPoint,
			yPoint:yPoint
		};
		newHotspot.points.push(newPointObject);
		
		//Draw line between points
		if (newHotspot.points.length > 1) {
			//Using p1x,p1y,p2x.. to represent point1Xposition, point1YPosition etc. 
			var p1x = newHotspot.points[thisId-1].xPointInit;
			var p1y = newHotspot.points[thisId-1].yPointInit;
			var p2x = newHotspot.points[thisId].xPointInit;
			var p2y = newHotspot.points[thisId].yPointInit;
			
			drawLineBetweenPoints(thisId, p1x, p1y, p2x, p2y);			
		}
		
		console.log(newHotspot);
	}
}

//This function calculates and draws a line between two points
function drawLineBetweenPoints(id, p1x, p1y, p2x, p2y) {
	console.log(p1x+'-'+p1y+'-'+p2x+'-'+p2y);
			
	//Calculate length, and angle of a line between two points, actually just creates a long thin div and rotates it. - relies on the div having a style of transform-origin: 0 100%; which will ensure that the line rotates from the center of the first point
	var length = Math.sqrt((p1x-p2x)*(p1x-p2x) + (p1y-p2y)*(p1y-p2y));
	var angle  = Math.atan2(p2y - p1y, p2x - p1x) * 180 / Math.PI;
	var transform = 'rotate('+angle+'deg)';
	
	var line = $('<div id="line' + id + '">')
	.insertBefore('.new-point:first')
	.addClass('map-line')
	.addClass('creatingHS')
	.css({
	  'position': 'absolute',
	  'transform': transform,
	  'transform-origin':'0 100%',
	  'top':p1y+'px',
	  'left':p1x+'px'
	})
	.width(length);
}

//This function calculates a point passed as x/y (of the viewport) into the percentage position on the map - called by addPoint
function pointAsPercentage(point, AsHeight) {
	var thisPos = $('#map-inner').position().left;
	var size = mapdata.mapWidth;
	
	if (AsHeight) {
		thisPos = $('#map-inner').position().top;
		size = mapdata.mapHeight;
	}
	
	return (point - thisPos) / (size / 100);
}

//This function converts a map position passed as a percentage into the pixel value of the map - called by addPoint
function percentageAsPoint(percentage, AsHeight) {
	var size = mapdata.mapWidth;
	if (AsHeight) {
		size = mapdata.mapHeight;
	}
	return (size / 100) * percentage;
}

// This function shows/hides the admin menu
function toggleMenu() {
	if ($('#controls-menu').css('display') == 'block') {
		$('#controls-menu').css('display','none');
	} else {
		$('#controls-menu').css('display','block');
	}
}

// This function sets up the map for admin work to create a new hotspot - called by user clicking 'Create Hotspot'
function createHotspot() {
	inAdmin = true;
	$('#mappage').css('cursor','crosshair');
	toggleMenu();
	
	$('#point-controls').css('display','block');
	
	newHotspot = { points:[] };
	
	$('#hotspot-holder').on('click',addPoint);
}

// This function runs when the app starts and creates an array of all upcoming feeding times from now
function compileUpcomingFeedingTimes() {
	feedingTimes = [];
	sortFeedingTimes = [];
	
	// Check all hotspots
	$.each(mapHotspots, function(hsIndex, hotspot) {
		$.each(hotspot.feedingTimes, function(fIndex, feeding) {
			feeding.hotspot = hsIndex;
			feeding.feedTime = fIndex;
			feedingTimes.push(feeding);
		});
	});
	feedingTimes = feedingTimes.sort(sortFeedTimes);
	console.log(feedingTimes);
	
	// We need to be able to show alerts and remove passed times, so start a timer
	if(feedingTimes.length > 0) {
		feedProcess = setInterval(checkFeedStates, 60000);
	}
	checkFeedStates();
}

// This function checks the upcoming feedings and marks to alert or ignore - called by the feedProcess timer.
function checkFeedStates(){
	
	var updateActions = {};
	var feedingAlerts = [];
	
	$.each(mapHotspots, function(index, hotspot) {
		if ('feedingTimes' in hotspot) {
			var actionObj = {
				hotspot:index,
				update:1,
				text:'No feedings left today'
			};
			updateActions[index.toString()] = actionObj;
		}
	});
	
	$.each(feedingTimes, function(index, feeding) {
		//Check each feeding time to ensure it has not expired, or if it is due within the next x minutes (alert timeframe)
		var now = new Date();		
		var alertMillis = now.getTime();
		var oneMinuteInMillis = 60000;
		alertMillis += oneMinuteInMillis * config.feedingAlertTime;
		var alert = new Date(alertMillis);
		
		var currentTime = parseInt(now.getHours().toString() + (('0' + now.getMinutes()).slice(-2)));
		var alertTime = parseInt(alert.getHours().toString() + (('0' + alert.getMinutes()).slice(-2)));		
		var feedTime = parseInt(feeding.time.hour.toString() + (('0' + feeding.time.minute.toString()).slice(-2)));
		console.log('Current='+currentTime +' - Alert='+alertTime+' - Feed='+feedTime);
		
		if (currentTime > feedTime) {
			// Ok to leave, function will update with 'No feedings left..' if applicable
		} else {
			if(updateActions[feeding.hotspot.toString()].update == 1) {
				updateActions[feeding.hotspot.toString()].text = 'Next feeding: '+('0' + feeding.time.hour).slice(-2)+':'+('0' + feeding.time.minute).slice(-2);
				updateActions[feeding.hotspot.toString()].update = 0;
			}
			if (alertTime > feedTime) {
				console.log('active');
				// Add feeding to alert array
				feedingAlerts.push(feeding);
			}
		}
	});
	
	$.each(updateActions, function(index, action) {
		$('#hotspot-title-'+action.hotspot+' .feeding').html(action.text);
	});
	
	// Update feeding alert panel
	$('#feedTimes .feedDetails').html('');
	var numAlerts = feedingAlerts.length;
	$('#feedTimes .feedCount').html(numAlerts);
		
	if(numAlerts == 0) {
		$('#feedTimes .info').html('There are no feedings due to start');
	} else {
		if (numAlerts == 1){
			$('#feedTimes .info').html('There is '+numAlerts+' feeding due to start in the next '+config.feedingAlertTime+' minutes');
		} else {
			$('#feedTimes .info').html('There are '+numAlerts+' feedings due to start in the next '+config.feedingAlertTime+' minutes');
		}
		$.each(feedingAlerts, function(index, feeding){
			$('#feedTimes .feedDetails').append('<div class="feedDetail">'+
				'<span class="time">'+feeding.time.hour+':'+('0' + feeding.time.minute).slice(-2)+'</span>'+
				'<span class="name">'+feeding.name+'</span><br>'+
				'<span class="description">'+feeding.description+'</span></div>');
		});
	}
	
	// Position feed panel
	if (feedExpanded) {
		var fleft = 0;
		var fbot = 0;
	} else {
		var fleft = -($('#feedTimes').outerWidth() - 60);
		var fbot = -($('#feedTimes').outerHeight() - 60);
	}
	$('#feedTimes').css({ 'left':fleft+'px', 'bottom':fbot+'px' });
}

// This function figures out and returns the index of the next feeding time for the selected hotspot - called by drawHotspots
function getNextFeedingTime(spotId) {
	var currentTime = new Date();
	var thisHour = currentTime.getHours();
	var thisMinute = currentTime.getMinutes();
	var feedId = null;
	
	// This relies on the times being in chronological order.  Will write a function to sort them when I add the ability to add a new time	
	$.each(mapHotspots[spotId].feedingTimes, function(index, feed) {
		//Check the feeding time is after the current time
		if (feed.time.hour > thisHour) {
			// Doesn't matter what the minutes are this is in the future
			feedId = index
			return false;
		}
		if (feed.time.hour == thisHour) {
			// Check minutes
			if (feed.time.minute > thisMinute) {
				feedId = index
				return false;
			}
		}
	});
	return feedId;
}

function runTimeRules() {
	var nowDate = new Date();
	var now = parseInt(nowDate.getHours())
}

function sortFeedTimes(a, b){
	var ta = parseInt(a.time.hour.toString() + ('0' + a.time.minute).slice(-2));
	var tb = parseInt(b.time.hour.toString() + ('0' + b.time.minute).slice(-2));
	if(ta > tb){
		return 1;
	} else if (tb < tb){
		return -1;
	} else if (a.time.name > b.time.name) {
		return -1;
	} else if (a.time.name < b.time.name) {
		return 1;
	} else {
		console.log(ta+ ' - '+tb);
		return 0;
	}
}

// This is basically the mousedown event over the map, but we are checking for a drag event based on the distance moved from when we first pressed
var initX;
var initY;
var finX;
var finY;
var touchDrag = false;

function startDrag(e) {	
	var touch = e;
	if (e.type == 'touchstart' || e.type == 'touchmove') {
		touch = e.touches[0] || e.changedTouches[0];
	}
	var initialX = touch.pageX;
	var initialY = touch.pageY;
	initX = touch.pageX;
	initY = touch.pageY;
	
	var mapX = $('#map-inner').position().left;
	var mapY = $('#map-inner').position().top;
	var drag = 5;
	// clear isDragging in case it is a normal mousedown
	isDragging = false;
	$(window).on('touchmove mousemove', function() {
		var touch = event;
		//alert('touchmove');
		if (event.type == 'touchmove') {
			touch = event.touches[0] || event.changedTouches[0];
			touchDrag = true;
		}
		var nowX = touch.pageX - initialX;
		var nowY = touch.pageY - initialY;
			
		if (nowX > drag || nowX < -drag || nowY > drag || nowY < -drag) {
			isDragging = true;
						
			$('#map-inner').css({ 'left':mapX+nowX+'px', 'top':mapY+nowY+'px' });
		}		
	});
}

function stopDrag(e) {
	$(window).unbind("touchmove mousemove");
	
	/*if (touchDrag) {
		touchDrag=false;
		
		var touch = event;
		if (event.type == 'touchend') {
			touch = event.touches[0] || event.changedTouches[0];
		}
		
		finX = touch.pageX;
		finY = touch.pageY;
		alert('x='+finX+' - y='+finY+' - isDragging='+isDragging+' - touchDrag='+touchDrag);
	}*/
    
	if (isDragging) { //was a drag event
		var animateTo = {};
		var mapDiv = $('#map-inner');
		// Narrower than viewport then centralise
		if(mapDiv.width() < $(window).width()) {
			animateTo.left = ($(window).width() - mapDiv.width()) / 2 +'px';
		} else {
			// white space to left so move to edge, if to right then move to right edge
			if (mapDiv.position().left > 0) { 
				animateTo.left = '0px'; 
			} else if (($(window).width() - mapDiv.position().left) > mapDiv.width()) {
				animateTo.left = $(window).width() - mapDiv.width();
			}			
		}
		
		// Shorter than viewport then centralise
		if(mapDiv.height() < $(window).height()) {
			animateTo.top = ($(window).height() - mapDiv.height()) / 2 +'px';
		} else {
			// white space to top so move to top, if to bottom then move to bottom edge
			if (mapDiv.position().top > 0) { 
				animateTo.top = '0px'; 
			} else if (($(window).height() - mapDiv.position().top) > mapDiv.height()) {
				animateTo.top = $(window).height() - mapDiv.height();
			}			
		}
		// Perform animation
		$('#map-inner').animate(animateTo);
    }
}

// Initial function
function setupMap() {
	//Load image	
	$('#map-image').attr('src', config.mapImage);
	// Attempt geolocation fetching
	getCurrentPosition();
	
	$('#map-image').load(resizeMapImage);
	
	// Set dragging actions - these will be disabled when in admin
	$('#map-inner').on('touchstart mousedown',startDrag);
	$('#map-inner').on('touchend mouseup',stopDrag);
	
	// Check for upcoming feeding times
	compileUpcomingFeedingTimes();	
		
	$(window).resize(resizeMapImage);
}

function swapbackground() {
	var currentSrc = $('#map-image').attr('src');
	if (currentSrc.indexOf("civic_") >= 0) {
		$('#map-image').attr('src','img/zoo_map.png');
	} else {
		$('#map-image').attr('src','img/civic_center.png');
	}
}

function newLatLong() {
	var latLong = $('#map_lat_long').val();
	if (latLong.length > 0) {
		var pos = latLong.split(", ");
		
		debug.latitude = pos[0];
		debug.longitude = pos[1];
		
		getCurrentPosition();
	}
}

function toggleFeedPanel() {
	// Position feed panel
	if (feedExpanded) {
		var fleft = -($('#feedTimes').outerWidth() - 60);
		var fbot = -($('#feedTimes').outerHeight() - 60);
		feedExpanded = false;
	} else {
		var fleft = 0;
		var fbot = 0;
		feedExpanded = true;
	}
	$('#feedTimes').animate({ 'left':fleft+'px', 'bottom':fbot+'px' }, 500);
}