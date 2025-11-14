import { useEffect, useRef } from 'react';
import { GeocoderAutocomplete } from '@geoapify/geocoder-autocomplete';
import '@geoapify/geocoder-autocomplete/styles/minimal.css';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<GeocoderAutocomplete | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!containerRef.current || isInitialized.current || disabled) return;

    const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
    
    if (!apiKey) {
      console.error('VITE_GEOAPIFY_API_KEY is not set');
      return;
    }

    // Clear the container
    containerRef.current.innerHTML = '';

    // Initialize Geoapify autocomplete
    const autocomplete = new GeocoderAutocomplete(
      containerRef.current,
      apiKey,
      {
        type: 'street',
        filter: {
          countrycodes: ['rs'], // Serbia only
        },
        lang: 'sr', // Serbian language
        debounceDelay: 300, // 300ms debounce
        placeholder,
      }
    );

    autocompleteRef.current = autocomplete;
    isInitialized.current = true;

    // Listen for location selection
    autocomplete.on('select', (location: any) => {
      if (location) {
        const address = location.properties?.formatted || '';
        const lat = location.properties?.lat;
        const lon = location.properties?.lon;
        const city = location.properties?.city || location.properties?.county;

        // Update the input value
        onChange(address);

        // Notify parent component with full location data
        if (onLocationSelect && lat && lon) {
          onLocationSelect({
            address,
            latitude: lat,
            longitude: lon,
            city: city || undefined,
          });
        }
      }
    });

    // Listen for input changes (manual typing)
    autocomplete.on('input', (value: string) => {
      onChange(value);
    });

    return () => {
      if (autocompleteRef.current) {
        autocompleteRef.current.off('select');
        autocompleteRef.current.off('input');
      }
      isInitialized.current = false;
    };
  }, [disabled]);

  // Update input value when controlled value changes
  useEffect(() => {
    if (autocompleteRef.current && value !== undefined) {
      const inputElement = containerRef.current?.querySelector('input');
      if (inputElement && inputElement.value !== value) {
        inputElement.value = value;
      }
    }
  }, [value]);

  return (
    <div 
      ref={containerRef} 
      className="geoapify-autocomplete-container"
      data-testid="autocomplete-address"
    />
  );
}
