var map;
var markers = [];
var bouncingMarker = null;
var viewModel = {};

// When page loads, get the weather information from Wunderground API
// Place the temperature and city into <span> class using jQuery
$(document).ready(function($) {
	$.ajax({
		url : "http://api.wunderground.com/api/67b2781c84afc2c3/conditions/q/CA/Sacramento.json",
		dataType : "jsonp",
		success : function(parsed_json) {
			var details = parsed_json.current_observation;
			$("#weatherContainer .temp").html(details.temp_f + "&deg;");
			$("#weatherContainer .city").text(details.display_location.full);
		} 
	}); 
});

// Initialize the Google Map using Maps API and mapping it to the div with "map" id
function initMap() {
	map = new google.maps.Map(document.getElementById('map'), { center: {lat: 38.453131, lng: -121.335495}, zoom: 12, mapTypeControl: false,
        disableDefaultUI: true });
	getMapMarkers();
	
}

// Pull from Json file or API call with Json return and place into markers variable
// using knockoutJS observable for displaying in the template

function getMapMarkers() {
	var promise = $.getJSON("/json/crimes.json", function(json) {
		$.each(json, function(key, val) {
	    	val["visible"] = ko.observable(true);
	    	val["boolCheck"] = true;
	    	markers.push(val);
		});
		
	});

	promise.done(function(data) {
		viewModel = {
			query: ko.observable(''),
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

		markersArray[key].contentString = '<strong>' + markersArray[key].PrimaryViolation + '</strong><br />' + markersArray[key].OccurenceLocation + '<br>' + markersArray[key].OccurenceCity + '<br>' + 'Reported: ' + markersArray[key].ReportDate;

		info = new google.maps.InfoWindow({
			content: markersArray[key].contentstring
		});

		new google.maps.event.addListener(markersArray[key].holdMarker, 'click', (function(marker, i) {
			return function () {
				info.setContent(markersArray[key].contentString);
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

        var searchNav = $('#' + markersArray[key].ActivityNumber);
        searchNav.click((function(mapMarker, i) {
          return function() {
            info.setContent(markersArray[key].contentString);
            info.open(map,mapMarker);
            setBounce(mapMarker);
            map.setZoom(15);
            map.setCenter(mapMarker.getPosition());
          }; 
        })(markersArray[key].holdMarker, key));
	});
}

// Set bounce animation to map marker and give it a timeout of when
// to stop bouncing.
function setBounce(mapMarker) {
	mapMarker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(function() { mapMarker.setAnimation(null); }, 1450);
}

// On key up in the input text, filter map based on query
$("#input").keyup(function() {
	filterMap();
})

// On key down of either the backspace or delete key, recenter map
// and change zoom to reset for new selection
$("#input").keydown(function(e) {
	if (e.which == 8 || e.which == 46) {
		map.setCenter({lat: 38.453131, lng: -121.335495});
		map.setZoom(12);
	}
})

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

// When menu button is clicked, toggle between show and hide based
// on the Search Navigation visibility
$("#menuButton").click(function() {
	if ($("#searchNavigation").is(':visible')) {
		hideMenu();
	} else {
		showMenu();
	}
});

// Function to hide navigation and move menu button and recenter map
function hideMenu() {
	$("#searchNavigation").hide();
	$("#menuContainer").css('left', 10);
	map.setCenter({lat: 38.453131, lng: -121.335495});
}

// Function to show navigation and move menu button and recenter map
function showMenu() {
	$("#searchNavigation").show();
	$("#menuContainer").css('left', 310);
	map.setCenter({lat: 38.453131, lng: -121.335495});
}

// Responsive resizing based and navigation displaying based on
// size of window width
$(window).resize(function () {
	var windowWidth = $(window).width();
	if (windowWidth <= 640 && $("#searchNavigation").is(':visible')) {
		hideMenu();
	} else if (windowWidth > 640 && $("#searchNavigation").not(':visible')){
		showMenu();
	}
});



