import { useControl } from "react-map-gl";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

const MAPBOX_TOKEN =
  "pk.eyJ1IjoibmljbHF0IiwiYSI6ImNsOWR6YWk1ejA0Y2UzcG95djhucHlqaTEifQ.gHrtX5AcWucEpY3W3n1DQQ";

mapboxgl.workerClass =
  // eslint-disable-next-line import/no-webpack-loader-syntax, import/no-unresolved
  require("worker-loader!mapbox-gl/dist/mapbox-gl-csp-worker").default;

export const Geocoder = (props) => {
  {
    useControl(
      () =>
        new MapboxGeocoder({
          accessToken: MAPBOX_TOKEN,
          mapboxgl: mapboxgl,
          proximity: {
            longitude: 103.7727,
            latitude: 1.2907,
          },
          countries: "SG",
          marker: false,
        }),
      {
        position: props.position,
      }
    );
  }
};
