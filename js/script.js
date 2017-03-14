var map;
var markers = [];
var bouncingMarker = null;
var viewModel = {};

// When page loads, get the weather information from Wunderground API
// Place the temperature and city into <span> class using jQuery
$(document).ready(function($) {
	$.ajax({
		url : 'http://api.wunderground.com/api/67b2781c84afc2c3/conditions/q/CA/Sacramento.json',
		dataType : 'jsonp',
		success : function(parsed_json) {
			var details = parsed_json.current_observation;
			viewModel.temperature(details.temp_f + '&deg;');
			viewModel.city(details.display_location.full);
		},
		error: function(request, status, error) {
        	alert(request.responseText);
		}
	}); 
});

// Initialize the Google Map using Maps API and mapping it to the div with 'map' id
function initMap() {
	map = new google.maps.Map(document.getElementById('map'), { center: {lat: 38.453131, lng: -121.335495}, zoom: 12, mapTypeControl: false,
        disableDefaultUI: true });
	getMapMarkers();
	
}

// Map error handling if the map doesn't load properly
function mapErrorHandling(e) {
	alert("Google Maps did not load properly, please try again later.");
}

// Pull from Json file or API call with Json return and place into markers variable
// using knockoutJS observable for displaying in the template

function getMapMarkers() {
	// http://saccounty.cloudapi.junar.com/api/v2/datastreams/SACRA-COUNT-CRIME-DATA/data.ajson/?auth_key=YOUR_API_KEY&limit=50&
	// http://saccounty.cloudapi.junar.com/api/v2/datastreams/SACRA-COUNT-CRIME-DATA/data.pjson/?auth_key=d9abb5c2955c831a20afb305625d4a9a31307dfb&limit=50&filter0=column8[==]95624&filter1=column0[%3E]2016-0015395&where=(filter0%20and%20filter1)
	var promise = $.getJSON('json/crimes.json', function(json) {
		$.each(json, function(key, val) {
			getFlickrImage(json[key].lat, json[key].lng, function(data) {
				val['imagePath'] = data;
			});

	    	val['visible'] = ko.observable(true);
	    	val['boolCheck'] = true;
	    	markers.push(val);
		});
		
	});

	promise.done(function(data) {
		viewModel = {
			query: ko.observable(''),
			temperature: ko.observable(),
			city: ko.observable(),
		}

		viewModel.markers = ko.computed(function() {
		    var self = this;
		    var search = self.query().toLowerCase();
		    return ko.utils.arrayFilter(markers, function(marker) {
		    if (marker.PrimaryViolation.toLowerCase().indexOf(search) >= 0) {
		            marker.boolCheck = true;
		            return marker.visible(true);
		        } else {
		            marker.boolCheck = false;
		            filterMap();
		            return marker.visible(false);
		        }
		    });       
		}, viewModel);

		ko.applyBindings(viewModel);	
		placeMarkers(markers);
		// filterMap();
	});
	promise.catch(function() {
		alert("Crime data failed to load.");
	});
}

// For each marker pulled from Json, place a map marker on the map
function placeMarkers(markersArray) {
	$.each(markersArray, function (key, val) {
		markersArray[key].holdMarker = new google.maps.Marker({
			position: new google.maps.LatLng(markersArray[key].lat, markersArray[key].lng),
			map: map,
			title: markersArray[key].PrimaryViolation,
			animation: google.maps.Animation.DROP,
			icon: {
	            url: 'img/handcuffs.png',
	            size: new google.maps.Size(64, 64),
	            origin: new google.maps.Point(0, 0),
	            anchor: new google.maps.Point(12.5, 40)
            },
          	shape: {
	            coords: [1,64,-64,-64,1],
	            type: 'poly'
          	}  
		});

		markersArray[key].contentString = '<hr/><strong>' + markersArray[key].PrimaryViolation + '</strong><br />' + markersArray[key].OccurenceLocation + '<br>' + markersArray[key].OccurenceCity + '<br>' + 'Reported: ' + markersArray[key].ReportDate;

		info = new google.maps.InfoWindow({
			content: markersArray[key].contentstring
		});

		new google.maps.event.addListener(markersArray[key].holdMarker, 'click', (function(marker, i) {
			return function () {
				setImageData = '<img width="160px" height="120px" src="' + markersArray[key].imagePath +'" />' + markersArray[key].contentString;
				info.setContent(setImageData);
				info.open(map, this);

				if(bouncingMarker) 
				    bouncingMarker.setAnimation(null);
			    if(bouncingMarker != this) {
			        setBounce(marker);
			        bouncingMarker = this;
			    } else {
			        bouncingMarker = null;
				}
			}
		})(markersArray[key].holdMarker, key));

	});
}

var selectMarker = function(mapMarker) {
	setImageData = '<img width="160px" height="120px" src="' + mapMarker.imagePath +'" />' + mapMarker.contentString;
	var windowWidth = $(window).width();
	info.setContent(setImageData);
    info.open(map,mapMarker.holdMarker);
    setBounce(mapMarker.holdMarker);
    map.setZoom(15);
    if (windowWidth <= 640 && $('#searchNavigation').is(':visible')) {
		toggleMenu();
	}
    map.setCenter(mapMarker.holdMarker.getPosition());
}

// Set bounce animation to map marker and give it a timeout of when
// to stop bouncing.
function setBounce(mapMarker) {
	mapMarker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(function() { mapMarker.setAnimation(null); }, 1450);
}

// Filter map function to determine which markers should be visible
function filterMap() {
	$.each(markers, function(key, val) {
	    if(markers[key].boolCheck === true) {
	    markers[key].holdMarker.setMap(map);
	    } else {
	    markers[key].holdMarker.setMap(null);
	    }
	});
}

var filterResults = function (d, e) {
	if (e.which == 8 || e.which == 46) {
		map.setCenter({lat: 38.453131, lng: -121.335495});
		map.setZoom(12);
	}
}

var toggleMenu = function() {
	if ($('#searchNavigation').is(':visible')) {
		hideMenu();
	} else {
		showMenu();
	}
}

// Function to hide navigation and move menu button and recenter map
function hideMenu() {
	$('#searchNavigation').hide();
	$('#menuContainer').css('left', 10);
	// map.setCenter({lat: 38.453131, lng: -121.335495});
}

// Function to show navigation and move menu button and recenter map
function showMenu() {
	$('#searchNavigation').show();
	$('#menuContainer').css('left', 310);
	// map.setCenter({lat: 38.453131, lng: -121.335495});
}

//GET JSON from Flickr
function getFlickrImage(lat, lng, handleData) {
	var flickrUrl = 'https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=d1f077a0e1a0a789cc563b38bc061500&text=landscape&accuracy=16&lat=' + lat + '&lon=' + lng + '&radius=2&format=json';
	$.ajax({
	    url: flickrUrl,
	    dataType: 'jsonp',
	    jsonp: 'jsoncallback',
	    success: function(data) {
	        var response = data.photos.photo;
	        var photoUrl = 'https://farm' + response[0].farm + '.staticflickr.com/' + response[0].server + '/' + response[0].id + '_' + response[0].secret + '.jpg';
	        
	        handleData(photoUrl);
	    },
	    error: function() {
	    	//Display message if error getting flickr JSON
			alert("Unable to load image data from Flickr");

		}
	});
}


// Responsive resizing based and navigation displaying based on
// size of window width
$(window).resize(function () {
	var windowWidth = $(window).width();
	if (windowWidth <= 640 && $('#searchNavigation').is(':visible')) {
		hideMenu();
	} else if (windowWidth > 640 && $('#searchNavigation').not(':visible')){
		showMenu();
	}
});
