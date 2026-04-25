import React, { useState, useEffect } from 'react';
import GooglePlacesAutocomplete, { geocodeByPlaceId } from 'react-google-places-autocomplete';

// NOTA: Assegure-se de que a API Key tenha "Places API" e "Geocoding API" ativadas no Google Console
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyCRzi_fSUJbDoUFqcUCJTvFsZTXPhgtdH8";

export const AutoLocationSelector = ({ value, onChange, label, helpText }) => {
    // DEBUG: Verificando o que está chegando
    // console.log("AutoLocationSelector Init:", label, value);

    const [selectedPlace, setSelectedPlace] = useState(null);



    // Se o valor vier preenchido (edição), tentamos reconstruir o label para exibir
    useEffect(() => {
        // Se vier dados válidos de fora, monte o display
        if (value && typeof value === 'object' && value.cidade) {
            const parts = [value.cidade, value.estado, value.pais];
            const display = parts.filter(p => p && p.trim() !== '').join(', ');

            // Evitar loop infinito: só atualiza se for diferente visualmente
            if (!selectedPlace || selectedPlace.label !== display) {
                // Ignore bad data legacy
                if (display.includes('[object Object]')) return;

                setSelectedPlace({
                    label: display,
                    value: { place_id: 'PRELOADED' }
                });
            }
        }
        // Se o valor externo for anulado/limpo, limpe o interno também
        else if ((!value || !value.cidade) && selectedPlace?.value?.place_id === 'PRELOADED') {
            setSelectedPlace(null);
        }
    }, [value, selectedPlace]);

    const handleSelect = async (val) => {
        setSelectedPlace(val);

        if (!val) {
            onChange(null); // Limpar
            return;
        }

        try {
            const results = await geocodeByPlaceId(val.value.place_id);
            if (results && results.length > 0) {
                const addressComponents = results[0].address_components;

                let cidade = '';
                let estado = '';
                let pais = '';

                addressComponents.forEach(component => {
                    const types = component.types;
                    if (types.includes('locality') || types.includes('administrative_area_level_2')) {
                        cidade = component.long_name;
                    }
                    if (types.includes('administrative_area_level_1')) {
                        estado = component.short_name; // SP, RJ...
                    }
                    if (types.includes('country')) {
                        pais = component.long_name; // Brasil
                    }
                });

                // Fallback: as vezes cidade vem em 'sublocality' ou 'neighborhood' se for impreciso
                if (!cidade) {
                    const sub = addressComponents.find(c => c.types.includes('sublocality') || c.types.includes('administrative_area_level_2'));
                    if (sub) cidade = sub.long_name;
                }

                // Retorna no formato antigo para manter compatibilidade
                onChange({
                    cidade,
                    estado,
                    pais,
                    fullAddress: val.label
                });
            }
        } catch (error) {
            console.error("Erro ao geocodificar lugar:", error);
        }
    };

    return (
        <div className="w-full">
            <label className="block text-xs font-bold text-history-gold uppercase tracking-wider mb-1.5 ml-1">
                {label}
            </label>
            <div className="relative text-stone-800">
                <GooglePlacesAutocomplete
                    apiKey={GOOGLE_API_KEY}
                    autocompletionRequest={{
                        componentRestrictions: { country: ['br', 'pt', 'il', 'ma'] },
                        language: 'pt-BR',
                    }}
                    selectProps={{
                        value: selectedPlace,
                        onChange: handleSelect,
                        placeholder: "Digite a cidade (Ex: São Paulo)...",
                        isClearable: true,
                        styles: {
                            control: (provided, state) => ({
                                ...provided,
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '0.5rem',
                                padding: '2px',
                                boxShadow: state.isFocused ? '0 0 0 2px rgba(255, 215, 0, 0.3)' : 'none',
                                '&:hover': {
                                    borderColor: 'rgba(255, 215, 0, 0.5)'
                                }
                            }),
                            input: (provided) => ({
                                ...provided,
                                color: '#44403c', // stone-700
                            }),
                            singleValue: (provided) => ({
                                ...provided,
                                color: '#44403c',
                            }),
                            option: (provided, state) => ({
                                ...provided,
                                backgroundColor: state.isFocused ? '#f5f5f4' : 'white',
                                color: '#44403c',
                                cursor: 'pointer'
                            }),
                            menu: (provided) => ({
                                ...provided,
                                zIndex: 9999, // Ficar acima de tudo
                                borderRadius: '0.5rem',
                                overflow: 'hidden'
                            })
                        },
                        // Restringir a cidades se quiser: types: ['(cities)']
                    }}

                />
            </div>
            {helpText && <p className="text-[10px] text-white/50 mt-1 ml-1">{helpText}</p>}


        </div>
    );
};
