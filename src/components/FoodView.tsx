import { useEffect, useState, useRef } from "react";
import foodDeals from "@/assets/food.json";
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

/** A scheduled window during which a venue's deal is active. */
interface TimeWindow {
  days?: string[];
  start_time: string;
  end_time: string;
}

/** A food-deal venue entry from food.json. */
interface FoodDeal {
  venue: string;
  image?: string | null;
  deal_details: string;
  time_windows: TimeWindow[];
  location: string;
  gps?: string;
  tags?: string[];
}

/** A food deal annotated with the currently-active window for sorting. */
interface SortedFoodDeal extends FoodDeal {
  currentWindow?: TimeWindow;
}

function isFoodDeal(v: unknown): v is FoodDeal {
  if (typeof v !== 'object' || v === null) return false;
  return typeof Reflect.get(v, 'venue') === 'string'
    && typeof Reflect.get(v, 'location') === 'string';
}
const rawFoodDeals: unknown[] = Array.isArray(foodDeals) ? foodDeals : [];
const foodDealsData: FoodDeal[] = rawFoodDeals.filter(isFoodDeal);

applyLeafletIcons(L.Icon.Default);

/**
 * Eats view.
 *
 * Lists Las Vegas food deals filtered by location, meal type, and an optional
 * "open now" toggle. Supports a list view (cards) and a Leaflet map view with
 * a marker per venue.
 *
 * @returns Eats screen
 */
export default function HomeView() {
  const [currentFoodDeals, setCurrentFoodDeals] = useState<SortedFoodDeal[]>([]);
  const [locationFilter, setLocationFilter] = useState<string[]>(["strip", "fremont"]);
  const [foodFilter, setFoodFilter] = useState<string[]>(["breakfast", "lunch", "dinner"]);
  const [openNow, setOpenNow] = useState(false);
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
    filterFoodDeals();
    const intervalId = setInterval(() => filterFoodDeals(), 60000);
    return () => clearInterval(intervalId);
  }, [locationFilter, foodFilter, openNow]);

  useEffect(() => {
    if (mapMode && !mapRef.current && mapContainerRef.current) {
      const map = L.map(mapContainerRef.current).setView([36.1699, -115.1398], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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
      currentFoodDeals.forEach((deal) => {
        if (deal.gps) {
          const [lat, lon] = deal.gps.split(",").map(parseFloat);
          if (lat && lon) {
            L.marker([lat, lon])
              .addTo(map)
              .bindPopup(`<b>${deal.venue}</b><br>${deal.deal_details}`);
          }
        }
      });
      map.invalidateSize();
    }
  }, [currentFoodDeals, mapMode]);

  const filterFoodDeals = () => {
    console.log("Filtering food deals", foodDealsData);
    const now = new Date();
    const currentDay = now.toLocaleDateString("en-US", { weekday: "short" });
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const validDeals = foodDealsData.filter((deal) => {
      const locationMatch = locationFilter.some((filter) =>
        deal.location.toLowerCase().includes(filter)
      );
      const tagMatch =
        Array.isArray(deal.tags) &&
        deal.tags.some((tag) => foodFilter.includes(tag.toLowerCase()));
      let timeMatch = true;
      if (openNow) {
        timeMatch = deal.time_windows.some((window) => {
          const days = window.days || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
          if (!days.includes(currentDay)) return false;
          const parseTimeToMinutes = (timeStr: string | undefined): number | null => {
            if (!timeStr) return null;
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
      console.log(
        `Deal: ${deal.venue} => locationMatch: ${locationMatch}, tagMatch: ${tagMatch}, timeMatch: ${timeMatch}`
      );
      return locationMatch && tagMatch && timeMatch;
    });

    console.log("Valid deals", validDeals);

    const sortedDeals: SortedFoodDeal[] = validDeals
      .map((deal) => ({
        ...deal,
        currentWindow:
          deal.time_windows.find((window) => {
            const days = window.days || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            if (!days.includes(currentDay)) return false;
            const parseTimeToMinutes = (timeStr: string | undefined): number | null => {
              if (!timeStr) return null;
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
          }) || deal.time_windows[0]
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

    console.log("Sorted deals", sortedDeals);
    setCurrentFoodDeals(sortedDeals);
  };

  const toggleLocation = (location: string) => {
    setLocationFilter((prev) =>
      prev.includes(location) ? prev.filter((l) => l !== location) : [...prev, location]
    );
  };

  const toggleFood = (foodTag: string) => {
    setFoodFilter((prev) =>
      prev.includes(foodTag) ? prev.filter((t) => t !== foodTag) : [...prev, foodTag]
    );
  };

  return (
    <>

      <div className="flex flex-col h-screen overflow-y-auto">
      <Header title={"Eats"} />
        <div className="p-4 shrink-0" data-section-id="food-filters">
          <div className="flex space-x-2 overflow-x-auto">
            <Button onClick={() => setMapMode((prev) => !prev)} variant={mapMode ? "default" : "secondary"}>
              📍 Map
            </Button>
            <Button onClick={() => setOpenNow((prev) => !prev)} variant={openNow ? "default" : "secondary"}>
              ⚡️ Now
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
              onClick={() => toggleFood("breakfast")}
              variant={foodFilter.includes("breakfast") ? "default" : "secondary"}
            >
              🍳 Breakfast
            </Button>
            <Button
              onClick={() => toggleFood("lunch")}
              variant={foodFilter.includes("lunch") ? "default" : "secondary"}
            >
              🥪 Lunch
            </Button>
            <Button
              onClick={() => toggleFood("dinner")}
              variant={foodFilter.includes("dinner") ? "default" : "secondary"}
            >
              🍽 Dinner
            </Button>
          </div>
        </div>

          {mapMode && (
            <div
              ref={mapContainerRef}
              id="map"
              style={{ height: "100%", width: "100%", zIndex: 1 }}
            ></div>
          )}
          {!mapMode && currentFoodDeals.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-44 p-4" data-section-id="food-list">
              {currentFoodDeals.map((deal, index) => (
                <Card key={index} style={{ paddingTop: 0 }}>

                    {venueImageSrc(deal.image) && (
                    <img
                      src={venueImageSrc(deal.image) ?? undefined}
                      alt={deal.venue}
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
                    {!venueImageSrc(deal.image) && <div className="mb-4"></div>}
                    <CardTitle className="mb-2 text-xl">{deal.venue}</CardTitle>
                    <CardDescription>
                      <div className="flex flex-wrap gap-2 capitalize">
                        {deal.time_windows.some(
                          (window) =>
                            window.start_time === "00:00" &&
                            (window.end_time === "23:59" || window.end_time === "close")
                        ) ? (
                          <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            ALL-DAY
                          </p>
                        ) : (
                          <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {`${formatTime(deal.time_windows[0].start_time)} - ${
                              deal.time_windows[0].end_time === "close"
                                ? "close"
                                : formatTime(deal.time_windows[0].end_time)
                            }`}
                          </p>
                        )}
                        {(deal.tags || []).map((tag, idx) => (
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
                    {deal.deal_details
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
                            `${deal.venue} las vegas`
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
          {!mapMode && currentFoodDeals.length === 0 && (
            <p>No food deals available at the moment.</p>
          )}

      </div>
    </>
  );
}
