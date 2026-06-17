import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, X, MapPin, Loader2 } from 'lucide-react';

interface LocationResult {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  city?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect?: (data: {
    address: string;
    latitude: number;
    longitude: number;
    city?: string;
  }) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AddressAutocomplete({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Unesite adresu...",
  disabled = false,
}: AddressAutocompleteProps) {
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (query: string) => {
    if (query.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    const token = import.meta.env.VITE_MAPBOX_TOKEN as string;
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=rs&language=sr&types=address,place,locality,neighborhood,poi&limit=6`
      );
      const data = await res.json();
      const features: LocationResult[] = (data.features || []).map((f: any) => ({
        id: f.id,
        address: f.place_name,
        latitude: f.center[1],
        longitude: f.center[0],
        city: f.context?.find((c: any) => c.id?.startsWith('place'))?.text,
      }));
      setResults(features);
      setIsOpen(features.length > 0);
      setActiveIndex(-1);
    } catch (e) {
      console.error('Geocoding error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (result: LocationResult) => {
    onChange(result.address);
    setIsOpen(false);
    setResults([]);
    onLocationSelect?.({
      address: result.address,
      latitude: result.latitude,
      longitude: result.longitude,
      city: result.city,
    });
  };

  const handleClear = () => {
    onChange('');
    setResults([]);
    setIsOpen(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full" data-testid="autocomplete-address">
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-9 pr-9 h-10 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-muted-foreground pointer-events-none" />
        )}
        {!isLoading && value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 flex items-center justify-center text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
          {results.map((result, index) => (
            <button
              key={result.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(result); }}
              className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover-elevate${index === activeIndex ? ' bg-accent' : ''}`}
            >
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span className="text-sm text-foreground leading-snug">{result.address}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
