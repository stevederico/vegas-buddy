import { useEffect, useState, useRef } from "react";
import happyHours from "@/assets/happy.json";
import Header from '@stevederico/skateboard-ui/Header';
import { Button } from "@stevederico/skateboard-ui/shadcn/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@stevederico/skateboard-ui/shadcn/ui/card";
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { applyLeafletIcons } from '@/utils/leafletIcons';
import { venueImageSrc } from '@/utils/venueImage';

/** A scheduled window during which a venue's deal is active. */
interface TimeWindow {
  days?: string[];
  start_time: string;
  end_time: string;
}

/** A happy-hour venue entry from happy.json. */
interface HappyHour {
  venue: string;
  image?: string | null;
  deal_details: string;
  time_windows: TimeWindow[];
  location: string;
  gps?: string;
  tags?: string[];
}

/** A happy-hour entry annotated with the currently-active window for sorting. */
interface SortedHappyHour extends HappyHour {
  currentWindow?: TimeWindow;
}

function isHappyHour(v: unknown): v is HappyHour {
  if (typeof v !== 'object' || v === null) return false;
  return typeof Reflect.get(v, 'venue') === 'string'
    && typeof Reflect.get(v, 'location') === 'string';
}
const rawHappyHours: unknown[] = Array.isArray(happyHours) ? happyHours : [];
const happyHoursData: HappyHour[] = rawHappyHours.filter(isHappyHour);

applyLeafletIcons(L.Icon.Default);

/**
 * Happy Hours view.
 *
 * Lists Las Vegas happy-hour deals filtered by location, drink type, and an
 * optional "open now" toggle. Supports a list view (cards) and a Leaflet map
 * view with a marker per venue.
 *
 * @returns Happy Hours screen
 */
export default function HomeView() {
  const [currentHappyHours, setCurrentHappyHours] = useState<SortedHappyHour[]>([]);
  const [locationFilter, setLocationFilter] = useState<string[]>(['strip', 'fremont']);
  const [drinkFilter, setDrinkFilter] = useState<string[]>(['cocktails', 'beer', 'wine']);
  const [openNow, setOpenNow] = useState(true);
  const [mapMode, setMapMode] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const formatTime = (timeStr: string | undefined): string => {
    if (!timeStr || timeStr === 'close') return timeStr || 'N/A';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}${minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : ''} ${period}`;
  };

  useEffect(() => {
    filterHappyHours();
    const intervalId = setInterval(() => filterHappyHours(), 60000);
    return () => clearInterval(intervalId);
  }, [locationFilter, drinkFilter, openNow]);

  useEffect(() => {
    if (mapMode && !mapRef.current && mapContainerRef.current) {
      const map = L.map(mapContainerRef.current).setView([36.1699, -115.1398], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
    } else if (!mapMode && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      // Explicitly reset styles here
      if (mapContainerRef.current) {
        mapContainerRef.current.removeAttribute('style');
      }
    }
  }, [mapMode]);


  useEffect(() => {
    const map = mapRef.current;
    if (map && mapMode) {
      map.eachLayer(layer => {
        if (layer instanceof L.Marker) map.removeLayer(layer);
      });
      currentHappyHours.forEach(hour => {
        if (hour.gps) {
          const [lat, lon] = hour.gps.split(',').map(parseFloat);
          if (lat && lon) {
            L.marker([lat, lon]).addTo(map)
              .bindPopup(`<b>${hour.venue}</b><br>${hour.deal_details}`);
          }
        }
      });
      map.invalidateSize();
    }
  }, [currentHappyHours, mapMode]);

  const filterHappyHours = () => {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'short' });
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const validHappyHours = happyHoursData.filter(hour => {
      if (!locationFilter.some(filter => hour.location.toLowerCase().includes(filter))) return false;
      if (!Array.isArray(hour.tags) || !hour.tags.some(tag => drinkFilter.includes(tag.toLowerCase()))) return false;
      if (openNow) {
        return hour.time_windows.some(window => {
          const days = window.days || ['Mon', 'Tue', 'Wed', "Thu", "Fri", "Sat", "Sun"];
          if (!days.includes(currentDay)) return false;
          const parseTimeToMinutes = (timeStr: string | undefined): number | null => {
            if (!timeStr) return null;
            if (timeStr === 'close') return 24 * 60;
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
          };
          const startMinutes = parseTimeToMinutes(window.start_time);
          const endMinutes = parseTimeToMinutes(window.end_time);
          return startMinutes !== null && startMinutes <= nowMinutes && (endMinutes === null || endMinutes > nowMinutes || window.end_time === 'close');
        });
      }
      return true;
    });

    const sortedHappyHours: SortedHappyHour[] = validHappyHours.map(hour => ({
      ...hour,
      currentWindow: hour.time_windows.find(window => {
        const days = window.days || ['Mon', 'Tue', 'Wed', "Thu", "Fri", "Sat", "Sun"];
        if (!days.includes(currentDay)) return false;
        const parseTimeToMinutes = (timeStr: string | undefined): number | null => {
          if (!timeStr) return null;
          if (timeStr === 'close') return 24 * 60;
          const [hours, minutes] = timeStr.split(':').map(Number);
          return hours * 60 + minutes;
        };
        const startMinutes = parseTimeToMinutes(window.start_time);
        const endMinutes = parseTimeToMinutes(window.end_time);
        return startMinutes !== null && startMinutes <= nowMinutes && (endMinutes === null || endMinutes > nowMinutes || window.end_time === 'close');
      }) || hour.time_windows[0]
    })).sort((a, b) => {
      const aTime = a.currentWindow?.end_time === 'close' ? 9999 : parseInt(a.currentWindow?.end_time?.replace(':', '') || '9999');
      const bTime = b.currentWindow?.end_time === 'close' ? 9999 : parseInt(b.currentWindow?.end_time?.replace(':', '') || '9999');
      return aTime - bTime;
    });

    setCurrentHappyHours(sortedHappyHours);
  };

  const toggleLocation = (location: string) => {
    setLocationFilter(prev => prev.includes(location) ? prev.filter(l => l !== location) : [...prev, location]);
  };

  const toggleDrink = (drink: string) => {
    setDrinkFilter(prev => prev.includes(drink) ? prev.filter(d => d !== drink) : [...prev, drink]);
  };

  return (
    <>

      <div className="flex flex-col h-screen overflow-y-auto">
      <Header title={'Happy Hours'}></Header>
        <div className="p-4 shrink-0" data-section-id="drinks-filters">
          <div className="flex space-x-2 overflow-x-auto">
          <Button onClick={() => setMapMode(prev => !prev)} variant={mapMode ? "default" : "secondary"}>📍 Map</Button>
            <Button onClick={() => setOpenNow(prev => !prev)} variant={openNow ? "default" : "secondary"}>⚡️ Now</Button>
            <Button onClick={() => toggleLocation('strip')} variant={locationFilter.includes('strip') ? "default" : "secondary"}>💰 Strip</Button>
            <Button onClick={() => toggleLocation('fremont')} variant={locationFilter.includes('fremont') ? "default" : "secondary"}>🎰 Fremont</Button>
            <Button onClick={() => toggleDrink('cocktails')} variant={drinkFilter.includes('cocktails') ? "default" : "secondary"}>🍹 Cocktails</Button>
            <Button onClick={() => toggleDrink('beer')} variant={drinkFilter.includes('beer') ? "default" : "secondary"}>🍺 Beer</Button>
            <Button onClick={() => toggleDrink('wine')} variant={drinkFilter.includes('wine') ? "default" : "secondary"}>🍷 Wine</Button>
          </div>
        </div>

          {mapMode && (
            <div ref={mapContainerRef} id="map" style={{ height: '100%', width: '100%', zIndex: 1 }}></div>
          )}
          {!mapMode && currentHappyHours.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-44 p-4" data-section-id="drinks-list">
              {currentHappyHours.map((hour, index) => (
                <Card key={index} style={{ paddingTop: 0 }}>
                  {venueImageSrc(hour.image) ? (
                    <img src={venueImageSrc(hour.image) ?? undefined} alt={hour.venue} style={{ width: '100%', height: 'auto', maxHeight: '15rem', objectFit: 'cover', borderTopLeftRadius: 'inherit', borderTopRightRadius: 'inherit', display: 'block', marginTop: 0 }} />
                  ) : (
                    <div className="mb-4"></div>
                  )}
                  <CardHeader>
                    <CardTitle className="mb-2 text-xl">{hour.venue}</CardTitle>
                    <CardDescription>
                      <div className="flex flex-wrap gap-2 capitalize">
                        {hour.time_windows.some(window => window.start_time === '00:00' && (window.end_time === '23:59' || window.end_time === 'close')) ? (
                          <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">ALL-DAY</p>
                        ) : (
                          <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{`${formatTime(hour.time_windows[0].start_time)} - ${hour.time_windows[0].end_time === 'close' ? 'close' : formatTime(hour.time_windows[0].end_time)}`}</p>
                        )}
                        {(hour.tags ?? []).map((tag, idx) => (
                          <p key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{tag}</p>
                        ))}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="capitalize">
                    {hour.deal_details.split(/[,;]| and /).map(detail => detail.trim()).filter(detail => detail.length > 0).map((detail, idx) => (
                      <p key={idx}>{detail}</p>
                    ))}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hour.venue} las vegas`)}`)} variant="outline">Directions</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
          {!mapMode && currentHappyHours.length === 0 && (
            <p>No happy hours available at the moment.</p>
          )}

      </div>
    </>
  );
}
