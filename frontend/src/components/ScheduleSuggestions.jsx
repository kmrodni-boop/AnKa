import React from 'react';

const ScheduleSuggestions = ({ suggestions, onSelect, loading, onClose }) => {
  if (loading) {
    return (
      <div className="p-6 bg-white rounded-2xl shadow border">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#520000]"></div>
          <span className="ml-3 text-gray-600">Finner ledige tidspunkter...</span>
        </div>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="p-6 bg-white rounded-2xl shadow border text-center">
        <div className="text-4xl mb-2">🔍</div>
        <p className="text-gray-500">Ingen ledige tidspunkter funnet.</p>
        <p className="text-sm text-gray-400 mt-1">Prøv å endre datoer eller velg en annen tekniker.</p>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-500 text-white';
    if (score >= 60) return 'bg-yellow-500 text-white';
    return 'bg-[#520000] text-white';
  };

  const getScoreBackground = (score) => {
    if (score >= 80) return 'bg-green-50';
    if (score >= 60) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-2xl shadow border overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-[#520000] to-[#3a0000]">
        <h3 className="font-semibold text-lg text-white">
          <span className="text-red-100">📅</span> Ledige tidspunkter ({suggestions.length} forslag)
        </h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-white hover:text-red-100 text-2xl leading-none transition-colors"
          >
            ×
          </button>
        )}
      </div>

      <div className="divide-y">
        {suggestions.map((suggestion, index) => {
          const score = suggestion.score || 0;
          const isBest = index === 0;
          
          return (
            <div 
              key={index} 
              className={`p-6 hover:bg-gray-50 transition-colors ${getScoreBackground(score)} ${isBest ? 'ring-2 ring-[#520000]' : ''}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-xl">👷</div>
                    <div className="font-semibold text-xl text-gray-900">
                      {suggestion.technician?.name}
                    </div>
                  </div>
                  
                  <div className="text-gray-600 mt-1">
                    <span className="font-medium">{formatShortDate(suggestion.start)}</span>
                    {' − '}
                    <span className="text-[#520000]">
                      {formatTime(suggestion.start)} − {formatTime(suggestion.end)}
                    </span>
                  </div>
                </div>

                <div className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm ${getScoreColor(score)}`}>
                  {score}%
                  {isBest && (
                    <span className="ml-2 text-xs">✨ Beste valget</span>
                  )}
                </div>
              </div>

              <div className="text-gray-700 mb-4 text-[15px] bg-white p-3 rounded-lg border border-gray-100">
                <span className="text-green-600 font-medium">✓ </span>
                {suggestion.reason}
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">⏱️</span>
                  <span>Reisetid: ~{suggestion.travelTimeMinutes} min</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">📍</span>
                  <span>Avstand: ~{suggestion.travelDistanceKm} km</span>
                </div>
              </div>

              <button
                onClick={() => onSelect(suggestion)}
                className="w-full bg-[#520000] hover:bg-[#3a0000] active:bg-[#250000] transition-all text-white font-semibold py-3 rounded-xl text-base shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
              >
                Velg dette tidspunktet
              </button>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {suggestions.length > 1 && (
        <div className="px-6 py-4 bg-gray-50 border-t text-center text-sm text-gray-500">
          <span>💡 </span>
          {suggestions.length} forslag funnet. Det beste valget er markert med ✨
        </div>
      )}
    </div>
  );
};

export default ScheduleSuggestions;
