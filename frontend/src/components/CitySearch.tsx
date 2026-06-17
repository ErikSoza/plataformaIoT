import React, { useState, useRef, useEffect } from 'react';

interface CitySearchProps {
  onLocationSelect: (coordinates: [number, number], cityName: string) => void;
  onClear?: () => void;
  isSearching?: boolean;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
  type?: string;
  importance?: number;
}

const CitySearch: React.FC<CitySearchProps> = ({
  onLocationSelect,
  onClear,
  isSearching = false
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // API de geocodificación usando OpenStreetMap Nominatim (gratuita)
  const searchLocation = async (searchQuery: string) => {
    if (searchQuery.trim().length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      // Usar la API de Nominatim de OpenStreetMap (gratuita)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` + 
        new URLSearchParams({
          q: searchQuery,
          format: 'json',
          addressdetails: '1',
          limit: '8',
          countrycodes: 'cl,ar,pe,bo,br', // Países de Sudamérica principalmente
          'accept-language': 'es'
        })
      );

      if (response.ok) {
        const data: SearchResult[] = await response.json();
        
        // Filtrar y ordenar resultados por relevancia
        const filteredResults = data
          .filter(result => result.display_name)
          .sort((a, b) => {
            // Priorizar ciudades de Chile
            const aIsChile = a.display_name.toLowerCase().includes('chile');
            const bIsChile = b.display_name.toLowerCase().includes('chile');
            if (aIsChile && !bIsChile) return -1;
            if (!aIsChile && bIsChile) return 1;
            
            // Priorizar por importancia si está disponible
            if (a.importance && b.importance) {
              return b.importance - a.importance;
            }
            
            return 0;
          })
          .slice(0, 6); // Limitar a 6 resultados
        
        setResults(filteredResults);
        setShowResults(filteredResults.length > 0);
      } else {
        console.warn('Error en búsqueda de ubicación:', response.statusText);
        setResults([]);
        setShowResults(false);
      }
    } catch (error) {
      console.error('Error buscando ubicación:', error);
      setResults([]);
      setShowResults(false);
    } finally {
      setLoading(false);
    }
  };

  // Debounce para la búsqueda
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchLocation(query);
    }, 500); // Esperar 500ms después de que el usuario deje de escribir

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  // Manejar teclas de navegación
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          selectLocation(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Seleccionar ubicación
  const selectLocation = (result: SearchResult) => {
    const coordinates: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)];
    const cityName = result.display_name.split(',')[0]; // Tomar solo el primer parte del nombre
    
    setQuery(cityName);
    setShowResults(false);
    setSelectedIndex(-1);
    
    onLocationSelect(coordinates, cityName);
  };

  // Limpiar búsqueda
  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
    if (onClear) {
      onClear();
    }
    inputRef.current?.focus();
  };

  // Ocultar resultados al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Formatear el nombre de la ubicación para mostrar
  const formatLocationName = (displayName: string) => {
    const parts = displayName.split(',');
    if (parts.length > 3) {
      return `${parts[0]}, ${parts[1]}, ${parts[parts.length - 1]}`;
    }
    return displayName;
  };

  const getLocationIcon = (result: SearchResult) => {
    const name = result.display_name.toLowerCase();
    if (name.includes('chile')) return '🇨🇱';
    if (name.includes('argentina')) return '🇦🇷';
    if (name.includes('peru') || name.includes('perú')) return '🇵🇪';
    if (name.includes('bolivia')) return '🇧🇴';
    if (name.includes('brasil') || name.includes('brazil')) return '🇧🇷';
    return '📍';
  };

  return (
    <div style={styles.container}>
      <div style={styles.searchInputContainer}>
        <div style={styles.searchIcon}>🔍</div>
        <input
          ref={inputRef}
          id="city-search-input"
          type="text"
          aria-label="Buscar ciudad"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar ciudad (ej: Santiago, Talca, Buenos Aires...)"
          style={styles.input}
          disabled={isSearching}
        />
        {query && (
          <button
            onClick={clearSearch}
            style={styles.clearButton}
            title="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
        {loading && (
          <div style={styles.loadingSpinner}>⏳</div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div ref={resultsRef} style={styles.resultsContainer}>
          {results.map((result, index) => (
            <div
              key={result.place_id}
              onClick={() => selectLocation(result)}
              style={{
                ...styles.resultItem,
                ...(index === selectedIndex ? styles.selectedResult : {}),
                backgroundColor: index === selectedIndex ? '#e3f2fd' : 
                                index === hoveredIndex ? '#f8f9fa' : 'transparent'
              }}
              onMouseEnter={() => {
                setHoveredIndex(index);
              }}
              onMouseLeave={() => {
                setHoveredIndex(-1);
              }}
            >
              <div style={styles.resultIcon}>
                {getLocationIcon(result)}
              </div>
              <div style={styles.resultContent}>
                <div style={styles.resultName}>
                  {formatLocationName(result.display_name)}
                </div>
                <div style={styles.resultCoords}>
                  {parseFloat(result.lat).toFixed(4)}, {parseFloat(result.lon).toFixed(4)}
                </div>
              </div>
            </div>
          ))}
          
          <div style={styles.footer}>
            <span style={styles.footerText}>
              💡 Usa las flechas ↑↓ y Enter para navegar
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    position: 'relative' as const,
    width: '100%',
    maxWidth: '400px',
  },

  searchInputContainer: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },

  searchIcon: {
    position: 'absolute' as const,
    left: '12px',
    zIndex: 1,
    fontSize: '1.1rem',
    color: '#495057',
  },

  input: {
    width: '100%',
    padding: '12px 16px 12px 45px',
    border: '2px solid #e9ecef',
    borderRadius: '25px',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
    backgroundColor: 'white',
    boxSizing: 'border-box' as const,
  },

  clearButton: {
    position: 'absolute' as const,
    right: '12px',
    background: 'none',
    border: 'none',
    fontSize: '1.2rem',
    color: '#495057',
    cursor: 'pointer',
    padding: '2px',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
  } as React.CSSProperties,

  loadingSpinner: {
    position: 'absolute' as const,
    right: '45px',
    fontSize: '1rem',
  },

  resultsContainer: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    background: 'white',
    border: '2px solid #00BCD4',
    borderTop: 'none',
    borderRadius: '0 0 15px 15px',
    boxShadow: '0 4px 20px rgba(0, 188, 212, 0.15)',
    zIndex: 1000,
    maxHeight: '300px',
    overflowY: 'auto',
  } as React.CSSProperties,

  resultItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #f1f3f4',
    transition: 'background-color 0.2s ease',
  } as React.CSSProperties,

  selectedResult: {
    backgroundColor: '#e3f2fd',
    borderLeft: '4px solid #00BCD4',
  },

  resultIcon: {
    fontSize: '1.3rem',
    marginRight: '12px',
    minWidth: '24px',
    textAlign: 'center' as const,
  },

  resultContent: {
    flex: 1,
    minWidth: 0,
  },

  resultName: {
    fontWeight: '600',
    color: '#2c3e50',
    fontSize: '0.95rem',
    marginBottom: '2px',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  resultCoords: {
    fontSize: '0.875rem',
    color: '#595959',
  },

  footer: {
    padding: '8px 16px',
    borderTop: '1px solid #e9ecef',
    backgroundColor: '#f8f9fa',
  },

  footerText: {
    fontSize: '0.875rem',
    color: '#495057',
    fontStyle: 'italic' as const,
  },
};

export default CitySearch;