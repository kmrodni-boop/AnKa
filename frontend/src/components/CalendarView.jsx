import React from 'react';

export default function CalendarView({ role }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchCalendar = async () => {
      try {
        const res = await fetch(`/api/calendar?role=${role}`);
        const data = await res.json();
        setItems(data);
      } catch (error) {
        console.error('Error fetching calendar:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCalendar();
  }, [role]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#520000] mx-auto"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="text-2xl mb-2">📅</div>
        <p>Ingen bookinger funnet</p>
      </div>
    );
  }

  // Group by date
  const groupedByDate = items.reduce((acc, item) => {
    const date = new Date(item.start_time).toLocaleDateString('nb-NO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4 max-h-[400px] overflow-auto">
      {Object.entries(groupedByDate).map(([date, dateItems]) => (
        <div key={date} className="bg-white border rounded-xl p-4 shadow-sm">
          <div className="font-semibold text-[#520000] mb-3 border-b border-[#520000]/20 pb-2">{date}</div>
          <div className="space-y-2">
            {dateItems.map((item) => (
              <div 
                key={item.booking_id}
                className={`p-3 rounded-lg text-sm transition-colors ${
                  item.masked 
                    ? 'bg-gray-100 border border-gray-200' 
                    : 'bg-red-50 border border-[#520000]/20'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-900 flex items-center gap-1">
                      {item.masked ? (
                        <span className="text-orange-600">🔒 {item.display_name}</span>
                      ) : (
                        <span className="text-[#520000]">{item.display_name}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.technician_name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#520000]">
                      {formatTime(item.start_time)} − {formatTime(item.end_time)}
                    </div>
                  </div>
                </div>
                
                {item.masked && role !== 'manager' && role !== 'admin' && (
                  <div className="text-xs text-orange-500 mt-1">
                    Krever høyere klarering for full visning
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
