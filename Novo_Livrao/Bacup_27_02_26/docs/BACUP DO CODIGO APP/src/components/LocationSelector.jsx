import React, { useState, useEffect, useMemo } from 'react';
import { Country, State, City } from 'country-state-city';
import { RefreshCcw } from 'lucide-react';

export const LocationSelector = ({ data, updateData, labels = {} }) => {
    // Keys in formData (keep hardcoded or dynamic? logic uses these specific keys for country-state-city)
    // Actually, AccountSettings expects `reAddress` object with these keys?
    // AccountSettings passes `updateData` that merges into `reAddress`.
    // So the keys `paisNascimento` are just keys inside that object. 
    // It is fine to keep the keys OR map them.
    // User complaint was mostly about LABELS.

    // Labels Defaults
    const L = {
        country: labels.country || 'País de Nascimento',
        state: labels.state || 'Estado / Província de Nascimento',
        city: labels.city || 'Cidade de Nascimento',
        cityPlaceholder: labels.cityPlaceholder || 'Digite o nome da cidade / shtetl...',
        ...labels
    };

    const KEY_COUNTRY = 'paisNascimento';
    const KEY_STATE = 'estadoNascimento';
    const KEY_CITY = 'cidadeNascimento';

    // Current Values
    const selectedCountryName = data[KEY_COUNTRY] || '';
    const selectedStateName = data[KEY_STATE] || '';
    const selectedCityName = data[KEY_CITY] || '';

    // --- 1. Country Logic ---
    // Memoize country list for performance
    const allCountries = useMemo(() => Country.getAllCountries(), []);

    // Check if the current value corresponds to a valid modern country
    const validCountry = allCountries.find(c => c.name === selectedCountryName);

    // Manual Mode State: 
    // If we have a value but it's NOT in the list, it's implicitly manual (historical).
    // Or if the user explicitly clicked "Other".
    const [isCountryManual, setIsCountryManual] = useState(false);

    // Sync manual state with data on mount/change
    useEffect(() => {
        if (selectedCountryName && !validCountry) {
            setIsCountryManual(true);
        } else if (selectedCountryName && validCountry) {
            setIsCountryManual(false);
        }
        // Update isEstrangeiro flag based on selected country
        const lower = selectedCountryName?.toLowerCase();
        const isForeign = lower && lower !== 'brasil' && lower !== 'brazil';
        updateData('isEstrangeiro', isForeign ?? false);
    }, [selectedCountryName, validCountry]);


    // --- 2. State Logic ---
    const allStates = useMemo(() => {
        if (validCountry) {
            return State.getStatesOfCountry(validCountry.isoCode);
        }
        return [];
    }, [validCountry]);

    const validState = allStates.find(s => s.name === selectedStateName);
    const [isStateManual, setIsStateManual] = useState(false);

    useEffect(() => {
        if (selectedStateName && !validState && validCountry) {
            // If we have a country but the state isn't in its list, it's manual
            setIsStateManual(true);
        } else if (selectedStateName && validState) {
            setIsStateManual(false);
        } else if (!validCountry) {
            // If country is manual, state MUST be manual input
            setIsStateManual(true);
        }
    }, [selectedStateName, validState, validCountry]);


    // --- 3. City Logic ---
    const allCities = useMemo(() => {
        if (validCountry && validState) {
            return City.getCitiesOfState(validCountry.isoCode, validState.isoCode);
        }
        return [];
    }, [validCountry, validState]);

    const validCity = allCities.find(c => c.name === selectedCityName);
    const [isCityManual, setIsCityManual] = useState(false);

    useEffect(() => {
        if (selectedCityName && !validCity && validState) {
            setIsCityManual(true);
        } else if (selectedCityName && validCity) {
            setIsCityManual(false);
        } else if (!validCountry || !validState) {
            // If country or state are manual, city MUST be manual
            setIsCityManual(true);
        }
    }, [selectedCityName, validCity, validState, validCountry]);


    // --- Handlers ---

    const handleCountryChange = (e) => {
        const val = e.target.value;
        if (val === 'OTHER') {
            setIsCountryManual(true);
            updateData(KEY_COUNTRY, ''); // Clear to let user type
            updateData(KEY_STATE, '');
            updateData(KEY_CITY, '');
            updateData('isEstrangeiro', true); // Manual entry implies foreign
        } else {
            setIsCountryManual(false);
            updateData(KEY_COUNTRY, val);
            updateData(KEY_STATE, '');
            // Set foreign flag if selected country is not Brazil/Brasil
            const lower = val?.toLowerCase();
            const isForeign = lower && lower !== 'brasil' && lower !== 'brazil';
            updateData('isEstrangeiro', isForeign);
            updateData(KEY_CITY, '');
        }
    };

    const handleStateChange = (e) => {
        const val = e.target.value;
        if (val === 'OTHER') {
            setIsStateManual(true);
            updateData(KEY_STATE, '');
            updateData(KEY_CITY, '');
        } else {
            setIsStateManual(false);
            updateData(KEY_STATE, val);
            updateData(KEY_CITY, ''); // Reset child
        }
    };

    const handleCityChange = (e) => {
        const val = e.target.value;
        if (val === 'OTHER') {
            setIsCityManual(true);
            updateData(KEY_CITY, '');
        } else {
            setIsCityManual(false);
            updateData(KEY_CITY, val);
        }
    };

    const revertToSelect = (level) => {
        if (level === 'country') {
            setIsCountryManual(false);
            updateData(KEY_COUNTRY, '');
            updateData(KEY_STATE, '');
            updateData(KEY_CITY, '');
            updateData('isEstrangeiro', false); // Reset foreign flag when clearing country
        }
        if (level === 'state') {
            setIsStateManual(false);
            updateData(KEY_STATE, '');
            updateData(KEY_CITY, '');
        }
        if (level === 'city') {
            setIsCityManual(false);
            updateData(KEY_CITY, '');
        }
    };

    // Shared Styles
    const labelClass = "text-sm font-semibold text-history-green";
    const selectClass = "w-full p-2 border border-stone-300 rounded-md bg-stone-50 focus:ring-2 focus:ring-gold-accent outline-none shadow-sm";
    const inputClass = "w-full p-2 border border-stone-300 rounded-md bg-white focus:ring-2 focus:ring-gold-accent outline-none shadow-sm";
    const linkClass = "text-xs text-gold-accent hover:underline cursor-pointer flex items-center gap-1 mt-1";

    return (
        <div className="flex flex-col gap-4">

            {/* --- COUNTRY --- */}
            <div className="flex flex-col gap-1">
                <label className={labelClass}>{L.country}</label>
                {!isCountryManual ? (
                    <select value={selectedCountryName} onChange={handleCountryChange} className={selectClass}>
                        <option value="">Selecione o País...</option>
                        {allCountries.map((c) => (
                            <option key={c.isoCode} value={c.name}>{c.name}</option>
                        ))}
                        <option value="OTHER" className="font-bold bg-stone-100">Other / Não encontrei (Nome Histórico)</option>
                    </select>
                ) : (
                    <div>
                        <input
                            type="text"
                            value={selectedCountryName}
                            onChange={(e) => updateData(KEY_COUNTRY, e.target.value)}
                            placeholder="Digite o nome do país (ex: Bessarábia, Império Russo)..."
                            className={inputClass}
                            autoFocus
                        />
                        <div onClick={() => revertToSelect('country')} className={linkClass}>
                            <RefreshCcw size={12} /> Voltar para lista de países
                        </div>
                    </div>
                )}
            </div>

            {/* --- STATE --- */}
            <div className="flex flex-col gap-1">
                <label className={labelClass}>{L.state}</label>

                {/* Logic: If Country is standard -> Show Select (with Other). If Country is Manual -> Force Input */}
                {!isCountryManual && !isStateManual ? (
                    <select value={selectedStateName} onChange={handleStateChange} className={selectClass} disabled={!selectedCountryName}>
                        <option value="">{selectedCountryName ? "Selecione o Estado..." : "Selecione o país primeiro"}</option>
                        {allStates.map((s) => (
                            <option key={s.isoCode} value={s.name}>{s.name}</option>
                        ))}
                        {selectedCountryName && (
                            <option value="OTHER" className="font-bold bg-stone-100">Other / Não encontrei (Nome Histórico)</option>
                        )}
                    </select>
                ) : (
                    <div>
                        <input
                            type="text"
                            value={selectedStateName}
                            onChange={(e) => updateData(KEY_STATE, e.target.value)}
                            placeholder="Digite o estado/província..."
                            className={inputClass}
                        />
                        {/* Only show "Back to list" if the parent (Country) WAS standard, otherwise list is impossible */}
                        {!isCountryManual && (
                            <div onClick={() => revertToSelect('state')} className={linkClass}>
                                <RefreshCcw size={12} /> Voltar para lista de estados
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- CITY --- */}
            <div className="flex flex-col gap-1">
                <label className={labelClass}>{L.city}</label>

                {!isCountryManual && !isStateManual && !isCityManual ? (
                    <select value={selectedCityName} onChange={handleCityChange} className={selectClass} disabled={!selectedStateName}>
                        <option value="">{selectedStateName ? "Selecione a Cidade..." : "Selecione o estado primeiro"}</option>
                        {allCities.map((c) => (
                            <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                        {selectedStateName && (
                            <option value="OTHER" className="font-bold bg-stone-100">Other / Não encontrei (Nome Histórico)</option>
                        )}
                    </select>
                ) : (
                    <div>
                        <input
                            type="text"
                            value={selectedCityName}
                            onChange={(e) => updateData(KEY_CITY, e.target.value)}
                            placeholder={L.cityPlaceholder}
                            className={inputClass}
                        />
                        {!isCountryManual && !isStateManual && (
                            <div onClick={() => revertToSelect('city')} className={linkClass}>
                                <RefreshCcw size={12} /> Voltar para lista de cidades
                            </div>
                        )}
                    </div>
                )}
            </div>

        </div>
    );
};
