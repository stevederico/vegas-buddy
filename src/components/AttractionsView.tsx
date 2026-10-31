import { useEffect, useState, useRef } from "react";
import attractions from "@/assets/attractions.json"; // Ensure this path matches your project structure
import Header from '@stevederico/skateboard-ui/Header';
import { Button } from "@stevederico/skateboard-ui/shadcn/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@stevederico/skateboard-ui/shadcn/ui/card";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { applyLeafletIcons } from "@/utils/leafletIcons";
import { venueImageSrc } from "@/utils/venueImage";

/** A scheduled window during which an attraction is open. */
interface TimeWindow {
  days?: string[];
  start_time: string;
  end_time: string;
}

/** An attraction entry from attractions.json (time_windows may be absent). */
interface Attraction {
  venue: string;
  image?: string | null;
  deal_details: string;
  time_windows?: TimeWindow[];
  location: string;
  gps?: string;
  price?: string;
  tags?: string[];
}

/** An attraction annotated with the currently-active window for sorting. */
interface SortedAttraction extends Attraction {
  currentWindow?: TimeWindow;
}

function isAttraction(v: unknown): v is Attraction {
  if (typeof v !== 'object' || v === null) return false;
  return typeof Reflect.get(v, 'venue') === 'string'
    && typeof Reflect.get(v, 'deal_details') === 'string'
    && typeof Reflect.get(v, 'location') === 'string';
}
const attractionsData: Attraction[] = Array.isArray(attractions)
  ? attractions.filter(isAttraction)
  : [];

applyLeafletIcons(L.Icon.Default);



/**
 * Attractions view.
 *
 * Lists Las Vegas attractions filtered by location, tag (e.g. "free"), and an
 * optional "open now" toggle. Supports a list view (cards) and a Leaflet map
 * view with a marker per attraction that has valid coordinates.
 *
 * @returns Attractions screen
 */
export default function HomeView() {
  const [currentAttractions, setCurrentAttractions] = useState<SortedAttraction[]>([]);
  const [locationFilter, setLocationFilter] = useState<string[]>(["strip", "fremont"]);
  const [attractionFilter, setAttractionFilter] = useState<string[]>(["free"]);
  const [openNow, setOpenNow] = useState(true);
  const [mapMode, setMapMode] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const formatTime = (timeStr: string | undefined): string => {
    if (!timeStr || timeStr === "close") return timeStr || "N/A";
    const [hours, minutes] = timeStr.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}${minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : ""} ${period}`;
  };

  useEffect(() => {
    filterAttractions();
    const intervalId = setInterval(() => filterAttractions(), 60000);
    return () => clearInterval(intervalId);
  }, [locationFilter, attractionFilter, openNow]);

  useEffect(() => {
    if (mapMode && !mapRef.current && mapContainerRef.current) {
      const map = L.map(mapContainerRef.current).setView([36.1699, -115.1398], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
    } else if (!mapMode && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      if (mapContainerRef.current) {
        mapContainerRef.current.removeAttribute("style");
      }
    }
  }, [mapMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && mapMode) {
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) map.removeLayer(layer);
      });
      currentAttractions.forEach((attraction) => {
        if (attraction.gps && attraction.gps !== "varies" && attraction.gps !== "N/A") {
          const [lat, lon] = attraction.gps.split(",").map(parseFloat);
          if (!isNaN(lat) && !isNaN(lon)) {
            L.marker([lat, lon])
              .addTo(map)
              .bindPopup(`<b>${attraction.venue}</b><br>${attraction.deal_details}`);
          }
        }
      });
      map.invalidateSize();
    }
  }, [currentAttractions, mapMode]);

  const filterAttractions = () => {
    const now = new Date();
    const currentDay = now.toLocaleDateString("en-US", { weekday: "short" });
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const validAttractions = attractionsData.filter((attraction) => {
      const locationMatch = locationFilter.some((filter) =>
        attraction.location.toLowerCase().includes(filter)
      );
      const tagMatch =
        attractionFilter.length === 0 ||
        (Array.isArray(attraction.tags) &&
          attraction.tags.some((tag) => attractionFilter.includes(tag.toLowerCase())));
      let timeMatch = true;
      if (openNow && attraction.time_windows) {
        timeMatch = attraction.time_windows.some((window) => {
          const days = window.days || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
          if (!days.includes(currentDay)) return false;
          const parseTimeToMinutes = (timeStr: string | undefined): number | null => {
            if (!timeStr || timeStr === "varies" || timeStr === "seasonal") return null;
            if (timeStr === "close") return 24 * 60;
            const [hours, minutes] = timeStr.split(":").map(Number);
            return hours * 60 + minutes;
          };
          const startMinutes = parseTimeToMinutes(window.start_time);
          const endMinutes = parseTimeToMinutes(window.end_time);
          return (
            startMinutes !== null &&
            startMinutes <= nowMinutes &&
            (endMinutes === null || endMinutes > nowMinutes || window.end_time === "close")
          );
        });
      }
      return locationMatch && tagMatch && timeMatch;
    });

    const sortedAttractions: SortedAttraction[] = validAttractions
      .map((attraction) => ({
        ...attraction,
        currentWindow:
          attraction.time_windows?.find((window) => {
            const days = window.days || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            if (!days.includes(currentDay)) return false;
            const parseTimeToMinutes = (timeStr: string | undefined): number | null => {
              if (!timeStr || timeStr === "varies" || timeStr === "seasonal") return null;
              if (timeStr === "close") return 24 * 60;
              const [hours, minutes] = timeStr.split(":").map(Number);
              return hours * 60 + minutes;
            };
            const startMinutes = parseTimeToMinutes(window.start_time);
            const endMinutes = parseTimeToMinutes(window.end_time);
            return (
              startMinutes !== null &&
              startMinutes <= nowMinutes &&
              (endMinutes === null || endMinutes > nowMinutes || window.end_time === "close")
            );
          }) || attraction.time_windows?.[0]
      }))
      .sort((a, b) => {
        const aTime =
          a.currentWindow?.end_time === "close"
            ? 9999
            : parseInt(a.currentWindow?.end_time?.replace(":", "") || "9999");
        const bTime =
          b.currentWindow?.end_time === "close"
            ? 9999
            : parseInt(b.currentWindow?.end_time?.replace(":", "") || "9999");
        return aTime - bTime;
      });

    setCurrentAttractions(sortedAttractions);
  };

  const toggleLocation = (location: string) => {
    setLocationFilter((prev) =>
      prev.includes(location) ? prev.filter((l) => l !== location) : [...prev, location]
    );
  };

  const toggleAttraction = (tag: string) => {
    setAttractionFilter((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <>
      <div className="flex flex-col h-screen overflow-y-auto">
      <Header title={"Attractions"} />
        <div className="p-4 shrink-0" data-section-id="attractions-filters">
          <div className="flex space-x-2 overflow-x-auto">
            <Button onClick={() => setMapMode((prev) => !prev)} variant={mapMode ? "default" : "secondary"}>
              📍 Map
            </Button>
            <Button
              onClick={() => toggleLocation("strip")}
              variant={locationFilter.includes("strip") ? "default" : "secondary"}
            >
              💰 Strip
            </Button>
            <Button
              onClick={() => toggleLocation("fremont")}
              variant={locationFilter.includes("fremont") ? "default" : "secondary"}
            >
              🎰 Fremont
            </Button>
            <Button
              onClick={() => toggleAttraction("free")}
              variant={attractionFilter.includes("free") ? "default" : "secondary"}
            >
              💸 Free
            </Button>
          </div>
        </div>
        {mapMode && (
          <div ref={mapContainerRef} id="map" style={{ height: "100%", width: "100%", zIndex: 1 }}></div>
        )}
        {!mapMode && currentAttractions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-44 p-4" data-section-id="attractions-list">
            {currentAttractions.map((attraction, index) => (
              <Card key={index} style={{ paddingTop: 0 }}>

                  {venueImageSrc(attraction.image) && (
                  <img
                    src={venueImageSrc(attraction.image) ?? undefined}
                    alt={attraction.venue}
                    style={{
                      width: "100%",
                      height: "auto",
                      maxHeight: "15rem",
                      objectFit: "cover",
                      borderTopLeftRadius: "inherit",
                      borderTopRightRadius: "inherit",
                      display: "block",
                      marginTop: 0
                    }}
                  />
                  )}

                <CardHeader>
                  {!venueImageSrc(attraction.image) && <div className="mb-4"></div>}
                  <CardTitle className="mb-2 text-xl">{attraction.venue}</CardTitle>
                  <CardDescription>
                    <div className="flex flex-wrap gap-2 capitalize">
                      {attraction.time_windows?.some(
                        (window) =>
                          window.start_time === "00:00" &&
                          (window.end_time === "23:59" || window.end_time === "close")
                      ) ? (
                        <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          ALL-DAY
                        </p>
                      ) : (
                        attraction.time_windows && (
                          <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {`${formatTime(attraction.time_windows[0].start_time)} - ${
                              attraction.time_windows[0].end_time === "close"
                                ? "close"
                                : formatTime(attraction.time_windows[0].end_time)
                            }`}
                          </p>
                        )
                      )}
                      {(attraction.tags || []).map((tag, idx) => (
                        <p
                          key={idx}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </p>
                      ))}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="capitalize">
                  {attraction.price && <p>{attraction.price}</p>}
                  {attraction.deal_details
                    .split(/[,;]| and /)
                    .map((detail) => detail.trim())
                    .filter((detail) => detail.length > 0)
                    .map((detail, idx) => (
                      <p key={idx}>{detail}</p>
                    ))}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${attraction.venue} las vegas`
                        )}`
                      )
                    }
                    variant="outline"
                  >
                    Directions
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
        {!mapMode && currentAttractions.length === 0 && (
          <p>No attractions available at the moment.</p>
        )}
      </div>
    </>
  );
}
