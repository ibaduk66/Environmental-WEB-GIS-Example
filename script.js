var map = L.map('map').setView([30.3753, 69.3451], 5);

var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap Contributors'
});

var satellite = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
        attribution: '&copy; Tiles Esri'
    }
);

var baseMaps = {
    'OpenStreetMap': osm,
    'Satellite Imagery': satellite
};

var weatherStationsLayer;
var cityLayer;
var pakistanLayer;
var layerControl;

function updateLayerControl() {
    if (layerControl) {
        map.removeControl(layerControl);
    }

    var overlayMaps = {};

    if (weatherStationsLayer) {
        overlayMaps['Weather Stations'] = weatherStationsLayer;
    }

    if (cityLayer) {
        overlayMaps['Cities'] = cityLayer;
    }

    if (pakistanLayer) {
        overlayMaps['Pakistan Boundary'] = pakistanLayer;
    }

    layerControl = L.control.layers(baseMaps, overlayMaps, { collapsed: false });
    layerControl.addTo(map);
}


function getTemperatureSize(temp) {
    if (temp < 25) {
        return 8;
    } else if (temp <= 30) {
        return 14;
    } else {
        return 20;
    }
}

function getTemperatureColor(temp) {
    if (temp < 25) {
        return '#0bd623';
    } else if (temp <= 30) {
        return '#1e90ff';
    } else {
        return '#ff4d4d';
    }
}

function createWeatherStationsLayer(data) {
    return L.geoJSON(data, {
        pointToLayer: function (feature, latlng) {
            var temp = Number(feature.properties.Temperature) || 0;
            return L.circleMarker(latlng, {
                radius: getTemperatureSize(temp),
                color: '#ffffff',
                weight: 1,
                fillColor: getTemperatureColor(temp),
                fillOpacity: 0.8,
                opacity: 1
            });
        },
        onEachFeature: function (feature, layer) {
            var props = feature.properties || {};
            var info = Object.entries(props)
                .map(function ([key, value]) {
                    return '<b>' + key + ':</b> ' + (value ?? 'N/A');
                })
                .join('<br>');

            layer.bindPopup('<b>' + (props.Name || 'Station') + '</b><br>' + info);
        }
    });
}

async function loadMapLayers() {
    try {
        var weatherResponse = await fetch('./data/weather_stations.geojson');

        var weatherData = await weatherResponse.json();

        weatherStationsLayer = createWeatherStationsLayer(weatherData);

        osm.addTo(map);
        weatherStationsLayer.addTo(map);
        updateLayerControl();
    } catch (error) {
        console.error('Could not load map data:', error);
    }
}

loadMapLayers();

fetch('./data/cities.geojson')
    .then(function (response) {
        if (!response.ok) {
            throw new Error('Cities file not found');
        }
        return response.json();
    })
    .then(function (data) {
        cityLayer = L.geoJSON(data, {
            pointToLayer: function (feature, latlng) {
                var type = feature.properties.type || 'City';
                var colors = {
                    'Capital City': '#00510b',
                    'Major City': '#02046b'
                };
                var color = colors[type] || '#4682b4';
                var radius = type === 'Capital City' ? 10 : 8;

                return L.circleMarker(latlng, {
                    radius: radius,
                    fillColor: color,
                    color: '#000000',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.85
                });
            },
            onEachFeature: function (feature, layer) {
                layer.bindPopup(
                    '<b>City</b> ' + (feature.properties.name || 'N/A') +
                    '<br><b>Province</b> ' + (feature.properties.province || 'N/A') +
                    '<br><b>Type</b> ' + (feature.properties.type || 'N/A')
                );
            }
        });

        cityLayer.addTo(map);
        updateLayerControl();
    })
    .catch(function (error) {
        console.warn('Cities layer not loaded:', error.message);
    });

fetch('./data/pakistan.geojson')
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        pakistanLayer = L.geoJSON(data, {
            style: {
                color: '#205522',
                weight: 2,
                fillOpacity: 0
            }
        });

        pakistanLayer.addTo(map);
        updateLayerControl();
    })
    .catch(function (error) {
        console.warn('Pakistan boundary not loaded:', error.message);
    });