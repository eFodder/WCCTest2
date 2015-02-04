function populateDeviceDetails(){
	$('#content_outer .device_details').html('Device Model: ' + device.model + '<br />' +
		'Device Cordova: '  + device.cordova  + '<br />' +
		'Device Platform: ' + device.platform + '<br />' +
		'Device UUID: '     + device.uuid     + '<br />' +
		'Device Version: '  + device.version  + '<br />');
}

var pictureSource;   // picture source
var destinationType; // sets the format of returned value

// Called when a photo is successfully retrieved
function onPhotoDataSuccess(imageData) {
	// Uncomment to view the base64-encoded image data
	// console.log(imageData);

	// Get image handle
	var smallImage = document.getElementById('smallImage');

	// Unhide image elements
	smallImage.style.display = 'block';

	// Show the captured photo
	// The in-line CSS rules are used to resize the image
	smallImage.src = "data:image/jpeg;base64," + imageData;
}

// Called when a photo is successfully retrieved
function onPhotoURISuccess(imageURI) {
  // Uncomment to view the image file URI
  // console.log(imageURI);

  // Get image handle
  var largeImage = document.getElementById('largeImage');

  // Unhide image elements
  largeImage.style.display = 'block';

  // Show the captured photo
  // The in-line CSS rules are used to resize the image
  largeImage.src = imageURI;
}

// A button will call this function
function capturePhoto() {
  // Take picture using device camera and retrieve image as base64-encoded string
  navigator.camera.getPicture(onPhotoDataSuccess, onCameraFail, { quality: 50,
	destinationType: destinationType.DATA_URL });
}

// A button will call this function
function capturePhotoEdit() {
  // Take picture using device camera, allow edit, and retrieve image as base64-encoded string
  navigator.camera.getPicture(onPhotoDataSuccess, onCameraFail, { quality: 20, allowEdit: true,
	destinationType: destinationType.DATA_URL });
}

// A button will call this function
function getPhoto(source) {
  // Retrieve image file location from specified source
  navigator.camera.getPicture(onPhotoURISuccess, onCameraFail, { quality: 50,
	destinationType: destinationType.FILE_URI,
	sourceType: source });
}

// Called if something bad happens.
function onCameraFail(message) {
  alert('Failed because: ' + message);
}

function getOldCurrentPosition() {
	navigator.geolocation.getCurrentPosition(onOldPositionSuccess, onOldPositionError);
}

// onSuccess Geolocation
function onOldPositionSuccess(position) {
	$('#location-output').html(
		'Latitude: '           + position.coords.latitude              + '<br />' +
		'Longitude: '          + position.coords.longitude             + '<br />' +
		'Altitude: '           + position.coords.altitude              + '<br />' +
		'Accuracy: '           + position.coords.accuracy              + '<br />' +
		'Altitude Accuracy: '  + position.coords.altitudeAccuracy      + '<br />' +
		'Heading: '            + position.coords.heading               + '<br />' +
		'Speed: '              + position.coords.speed                 + '<br />' +
		'Timestamp: '          + position.timestamp                    + '<br />');
}

// onError Callback receives a PositionError object
function onOldPositionError(error) {
	$('#location-output').html('Unable to obtain position:<br>' + 
		'code: '    + error.code    + '<br>' +
		'message: ' + error.message + '<br>');
}

function getCompass() {
	navigator.compass.getCurrentHeading(onCompassSuccess, onCompassError);
}

// onSuccess: Get the current heading
function onCompassSuccess(heading) {
	$('#compass-output').html('Heading: ' + heading.magneticHeading);
}

// onError: Failed to get the heading
function onCompassError(compassError) {
	$('#compass-output').html('Unable to find compass heading:<br> Compass Error: ' + compassError.code);
}

function toggleMenu() {
	if ($('#controls-menu').css('display') == 'block') {
		$('#controls-menu').css('display','none');
	} else {
		$('#controls-menu').css('display','block');
	}
}

function fireDeviceReady(){
	
	//Setup photo capture variables
	pictureSource=navigator.camera.PictureSourceType;
    destinationType=navigator.camera.DestinationType;
	
	//populateDeviceDetails();
	
	//$('#content_outer .device_details').html('boo');
}