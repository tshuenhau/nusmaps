import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Checkbox,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  ToggleButton,
  Button,
} from "@mui/material";
import { Add, Tune } from "@mui/icons-material";

import Map, {
  Marker,
  Popup,
  GeolocateControl,
  NavigationControl,
  Layer,
  Source,
} from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./MapView.css";

import BasicCard from "../components/BasicCard";
import { Geocoder } from "../components/Geocoder";
import { StyledFab } from "../components/StyledFab";

import { AuthContext } from "../contexts/AuthProvider";

import { getOngoing, getUpcoming, getPast } from "../api/API";

// const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
const MAPBOX_TOKEN = "pk.eyJ1IjoibmljbHF0IiwiYSI6ImNsOWR6YWk1ejA0Y2UzcG95djhucHlqaTEifQ.gHrtX5AcWucEpY3W3n1DQQ";

const MapView = () => {
  const mapRef = React.useRef();
  const geolocateControlRef = useRef();
  const [currentLocationLoaded, setCurrentLocationLoaded] = useState();

  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [viewState, setViewState] = useState({
    longitude: 103.7727,
    latitude: 1.2907,
    zoom: 13,
  });

  const [events, setEvents] = useState([]); //TODO: rename events to something else
  const [geoEvents, setGeoEvents] = useState(null);
  const [eventsSelected, setEventsSelected] = useState(true);
  const [groupsSelected, setGroupsSelected] = useState(true);
  const [filter, setFilter] = useState("default");
  const [popupInfo, setPopupInfo] = useState();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const [cursor, setCursor] = useState('auto');

  const handleMove = useCallback((evt) => {
    setViewState(evt.viewState);
  }, []);


  const handleMapClick = (event) => {
    setPopupInfo(null);

    const features = event.features || [];
    if (features.length > 0) {
      if (features[0].layer.id != "clusters") { // if point is not a cluster, show popup
        console.log("clicked point")


        var data = JSON.parse(features[0].properties.data);
        // console.log(data);
        // match data title to event title
        var event = events.find((event) => event.data().title == data.title);
        // console.log(event);

        // get current zoom level, ease map, and center point
        var zoom = mapRef.current.getZoom();
        mapRef.current.easeTo({
          center: features[0].geometry.coordinates,
          zoom: zoom,
          duration: 1000,
        });

        setPopupInfo(event);
      } else {
        // console.log("clicked cluster")
        if (event !== null && event.features[0] !== undefined) {
          const feature = event.features[0];
          const clusterId = feature.properties.cluster_id;
          // console.log(mapRef);
          const mapboxSource = mapRef.current.getSource('geoData');

          mapboxSource.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) {
              return;
            }

            mapRef.current.easeTo({
              center: feature.geometry.coordinates,
              zoom,
              duration: 500
            });
          });
        }
      }
    }
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const layerStyle = {
    id: "point",
    type: "circle",
    paint: {
      "circle-radius": 10,
      "circle-color": "#007cbf"
    },
  };

  const layoutLayerText = {
    "text-field": "{point_count_abbreviated}",
    "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 12,
  };

  const layerVaryingCircleStyle = {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "#51bbd6",
      100,
      "#f1f075",
      750,
      "#f28cb1",
    ],
    "circle-radius": ["step", ["get", "point_count"], 20, 100, 30, 750, 40],
  };

  const layerUnclusteredPointStyle = {
    "circle-color": "#11b4da",
    "circle-radius": 4,
    "circle-stroke-width": 1,
    "circle-stroke-color": "#fff",
  };

  const unclusteredPointLayer = {
    id: 'unclustered-point',
    type: 'circle',
    source: 'events',
    filter: ['!', ['has', 'point_count']],
    paint: layerUnclusteredPointStyle
  }

  const onMouseEnter = useCallback(() => setCursor('pointer'), []);
  const onMouseLeave = useCallback(() => setCursor('auto'), []);

  // Loads events and listens for upcoming ones.
  const loadEvents = useCallback(async () => {
    let type = null;

    if (
      (eventsSelected && !groupsSelected) ||
      (!eventsSelected && groupsSelected)
    ) {
      type = eventsSelected ? "Event" : "Group";
    }

    if (filter === "default") {
      const ongoing = await getOngoing(type, null, null);
      const upcoming = await getUpcoming(type, null, null);
      setEvents(ongoing.concat(upcoming));
      parseGeoData(ongoing.concat(upcoming));
    } else if (filter === "ongoing") {
      const ongoing = await getOngoing(type, null, null);
      setEvents(ongoing);
      parseGeoData(ongoing);
    } else if (filter === "upcoming") {
      const upcoming = await getUpcoming(type, null, null);
      setEvents(upcoming);
      parseGeoData(upcoming);
    } else if (filter === "past") {
      const past = await getPast(type, null, null);
      setEvents(past);
      parseGeoData(past);
    }
  }, [eventsSelected, groupsSelected, filter]);

  const parseGeoData = (eventsList) => {
    let coordinates = [];
    eventsList.forEach((e) => {
      coordinates.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [e.data().longitude, e.data().latitude, 0.0],
        },
        properties: {
          data: e.data(),
        },
      });
    });
    let geojsonMarker = {
      type: "FeatureCollection",
      features: coordinates,
    };
    setGeoEvents(geojsonMarker);
  };

  useEffect(() => {
    loadEvents();
  }, [eventsSelected, groupsSelected, filter, loadEvents]);

  return (
    <>
      <Map
        {...viewState}
        onMove={handleMove}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        cursor={cursor}
        mapStyle="mapbox://styles/mapbox/streets-v9"
        mapboxAccessToken={MAPBOX_TOKEN}
        interactiveLayerIds={["clusters", unclusteredPointLayer.id]}
        onClick={handleMapClick}
        ref={mapRef}
        reuseMaps
        onIdle={() => {
          if (!currentLocationLoaded) {
            if (geolocateControlRef.current) {
              setCurrentLocationLoaded("loading");
              geolocateControlRef.current.trigger();
            }
          }
        }}
      >
        <Geocoder position="top-left" />
        <NavigationControl
          position="bottom-left"
          style={{ "margin-bottom": "50px" }}
        />
        <GeolocateControl
          showAccuracyCircle={false}
          position="bottom-left"
          positionOptions={{ timeout: 30000 }}
          trackUserLocation={true}
          ref={geolocateControlRef}
          onGeolocate={() => {
            if (currentLocationLoaded === "loading") {
              mapRef.current.flyTo({
                zoom: mapRef.current.getZoom(),
              });
              setCurrentLocationLoaded("loaded");
            }
          }}
        />

        {geoEvents !== null && (
          <Source
            id="geoData"
            type="geojson"
            cluster={true}
            clusterMaxZoom={14}
            clusterRadius={50}
            data={geoEvents}
          >
            <Layer {...layerStyle} />
            <Layer
              id="clusters"
              type="circle"
              // onMouseEnter={() => { console.log("evt") }}
              filter={["has", "point_count"]}
              paint={layerVaryingCircleStyle}
            />
            <Layer
              id="cluster-count"
              type="symbol"
              filter={["has", "point_count"]}
              layout={layoutLayerText}
            />
            <Layer {...unclusteredPointLayer} />
            {/* <Layer
              id="unclustered-point"
              type="circle"
              filter={["!", ["has", "point_count"]]}
              paint={layerUnclusteredPointStyle}
            /> */}
          </Source>
        )}
        {/* {events
          ? events.map((event) => (
            <Marker
              key={event.data().title}
              longitude={event.data().longitude}
              latitude={event.data().latitude}
              // style={{ cursor: "pointer" }}
              style={{
                display: "none"
              }}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupInfo(event);
                mapRef.current.flyTo({
                  center: e.target.getLngLat(),
                });
              }}
            />
          ))
          : null} */}

        {popupInfo ? (
          <Popup
            anchor="top"
            closeButton={false}
            closeOnClick={false}
            longitude={popupInfo.data().longitude}
            latitude={popupInfo.data().latitude}
          >
            <BasicCard
              key={popupInfo.data().title}
              eventUid={popupInfo.id}
              {...popupInfo.data()}
            />
          </Popup>
        ) : null}
      </Map>

      <Box className="filter">
        <ToggleButton
          value={"Events"}
          selected={eventsSelected}
          onChange={() => {
            setEventsSelected(!eventsSelected);
            setPopupInfo(null);
          }}
          sx={{
            marginRight: 1,
            flexGrow: 1,
            height: 32,
            color: "white",
            backgroundColor: "#0A1929",
            border: 0,
            "&:hover": {
              backgroundColor: "#fff",
            },
          }}
          size="small"
        >
          Events
        </ToggleButton>
        <ToggleButton
          value={"Groups"}
          selected={groupsSelected}
          onChange={() => {
            setGroupsSelected(!groupsSelected);
            setPopupInfo(null);
          }}
          sx={{
            marginRight: 1,
            flexGrow: 1,
            height: 32,
            color: "white",
            backgroundColor: "#0A1929",
            border: 0,
            "&:hover": {
              backgroundColor: "#fff",
            },
          }}
          size="small"
        >
          Groups
        </ToggleButton>

        <Button
          sx={{
            backgroundColor: "#0A1929 !important",
            marginLeft: 0,
            minWidth: "unset",
            width: "fit-content",
            height: 32,
          }}
          size="small"
          variant="contained"
          onClick={handleClick}
        >
          <Tune sx={{ color: "white !important" }} />
        </Button>
        <Menu
          id="basic-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
        >
          <MenuItem
            onClick={() => {
              if (filter === "upcoming") {
                setFilter("default");
              } else if (filter === "default") {
                setFilter("upcoming");
              } else {
                setFilter("ongoing");
              }
            }}
          >
            <ListItemIcon>
              <Checkbox
                edge="start"
                checked={filter === "default" || filter === "ongoing"}
                tabIndex={-1}
                disableRipple
                inputProps={{ "aria-labelledby": "Ongoing" }}
              />
            </ListItemIcon>
            <ListItemText primary={"Ongoing"} />
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (filter === "ongoing") {
                setFilter("default");
              } else if (filter === "default") {
                setFilter("ongoing");
              } else {
                setFilter("upcoming");
              }
            }}
          >
            <ListItemIcon>
              <Checkbox
                edge="start"
                checked={filter === "default" || filter === "upcoming"}
                tabIndex={-1}
                disableRipple
                inputProps={{ "aria-labelledby": "Upcoming" }}
              />
            </ListItemIcon>
            <ListItemText primary={"Upcoming"} />
          </MenuItem>
          <MenuItem
            onClick={() => {
              setFilter("past");
            }}
          >
            <ListItemIcon>
              <Checkbox
                edge="start"
                checked={filter === "past"}
                tabIndex={-1}
                disableRipple
                inputProps={{ "aria-labelledby": "Past" }}
              />
            </ListItemIcon>
            <ListItemText primary={"Past"} />
          </MenuItem>
        </Menu>
      </Box>

      <StyledFab
        color="secondary"
        onClick={() => navigate(user ? "/create" : "/profile")}
      >
        <Add />
      </StyledFab>
    </>
  );
};

export default MapView;