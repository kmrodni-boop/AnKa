import React from 'react';

const ScheduleSuggestions = ({ suggestions, onSelect, loading, onClose }) => {
  if (loading) {
    return (
      <div className="p-6 bg-white rounded-2xl shadow border">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Finner ledige tidspunkter...</span>
        </div>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="p-6 bg-white rounded-2xl shadow border text-center">
        <p className="text-gray-500">Ingen ledige tidspunkter funnet.</p>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-700 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-orange-100 text-orange-700 border-orange-200';
  };

  return (
    <div className="bg-white rounded-2xl shadow border overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
        <h3 className="font-semibold text-lg">Forslag til ledig tid</h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        )}
      </div>

      <div className="divide-y">
        {suggestions.map((suggestion, index) => (
          <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-semibold text-xl text-gray-900">
                  {suggestion.technician?.name}
                </div>
                <div className="text-gray-600 mt-1">
                  {new Date(suggestion.start).toLocaleDateString('nb-NO', {
                    weekday: 'long', day: 'numeric', month: 'long'
                  })}
                  {' '}•{' '}
                  {new Date(suggestion.start).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
                  {' - '}
                  {new Date(suggestion.end).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div className={`px-4 py-1.5 rounded-full text-sm font-bold border ${getScoreColor(suggestion.score)}`}>
                {suggestion.score}%
              </div>
            </div>

            <div className="text-gray-700 mb-4 text-[15px]">
              {suggestion.reason}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <div className="flex items-center gap-1.5">
                <span>Reisetid:</span> 
                <span className="font-medium text-gray-700">~{suggestion.travelTimeMinutes} min</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>Avstand:</span> 
                <span className="font-medium text-gray-700">~{suggestion.travelDistanceKm} km</span>
              </div>
            </div>

            <button
              onClick={() => onSelect(suggestion)}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all text-white font-semibold py-3 rounded-xl text-base shadow-sm"
            >
              Velg dette tidspunktet
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScheduleSuggestions;