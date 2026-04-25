import React, { useState, useEffect, useRef } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyCRzi_fSUJbDoUFqcUCJTvFsZTXPhgtdH8";

setOptions({
    key: GOOGLE_API_KEY,
    v: "weekly"
});

export const AutoLocationSelector = ({ value, onChange, label, helpText }) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (value && typeof value === 'object' && value.cidade) {
            const parts = [value.cidade, value.estado, value.pais];
            const display = parts.filter(p => p && p.trim() !== '').join(', ');
            if (display && !display.includes('[object Object]')) {
                setInputValue(display);
            }
        } else if (!value || !value.cidade) {
             setInputValue('');
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSuggestions = async (input) => {
        if (!input) {
            setSuggestions([]);
            return;
        }

        try {
            const { AutocompleteSuggestion } = await importLibrary("places");
            
            // New 2026 API Usage
            const request = {
                input: input,
                includedRegionCodes: ['br', 'pt', 'il', 'ma'],
                language: 'pt-BR',
            };
            
            const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
            if (response && response.suggestions) {
                setSuggestions(response.suggestions);
            }
        } catch (error) {
            console.error("Erro no AutocompleteSuggestion:", error);
        }
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputValue(val);
        
        if (val) {
            setIsOpen(true);
            fetchSuggestions(val);
        } else {
            setSuggestions([]);
            setIsOpen(false);
            onChange(null);
        }
    };

    const handleSelect = async (suggestion) => {
        setInputValue(suggestion.placePrediction.text.text);
        setIsOpen(false);
        
        try {
            const { Place } = await importLibrary("places");
            const place = new Place({
                id: suggestion.placePrediction.placeId,
                requestedLanguage: 'pt-BR',
            });
            await place.fetchFields({ fields: ['addressComponents', 'displayName'] });
            
            if (place.addressComponents) {
                let cidade = '';
                let estado = '';
                let pais = '';

                place.addressComponents.forEach(component => {
                    const types = component.types;
                    if (types.includes('locality') || types.includes('administrative_area_level_2')) {
                        cidade = component.longText;
                    }
                    if (types.includes('administrative_area_level_1')) {
                        estado = component.shortText; 
                    }
                    if (types.includes('country')) {
                        pais = component.longText; 
                    }
                });

                if (!cidade) {
                    const sub = place.addressComponents.find(c => c.types.includes('sublocality') || c.types.includes('administrative_area_level_2'));
                    if (sub) cidade = sub.longText;
                }

                onChange({
                    cidade,
                    estado,
                    pais,
                    fullAddress: suggestion.placePrediction.text.text
                });
            }
        } catch (err) {
            console.error("Erro ao obter metadados do lugar:", err);
        }
    };

    return (
        <div className="w-full" ref={wrapperRef}>
            <label className="block text-xs font-bold text-history-gold uppercase tracking-wider mb-1.5 ml-1">
                {label}
            </label>
            <div className="relative text-stone-800">
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder="Digite a cidade (Ex: São Paulo)..."
                    className="w-full px-3 py-2 bg-white/90 border border-white/20 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-history-gold/30 text-[#44403c]"
                />
                
                {isOpen && suggestions.length > 0 && (
                    <ul className="absolute z-[9999] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {suggestions.map((sg, index) => (
                            <li 
                                key={index} 
                                onClick={() => handleSelect(sg)}
                                className="px-3 py-2 cursor-pointer hover:bg-stone-100 text-stone-800 text-sm"
                            >
                                {sg.placePrediction.text.text}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {helpText && <p className="text-[10px] text-white/50 mt-1 ml-1">{helpText}</p>}
        </div>
    );
};
