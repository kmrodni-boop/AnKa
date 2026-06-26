import React from 'react'

export default function CalendarView({ role }){
  const [items, setItems] = React.useState([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(()=>{
    setLoading(true)
    fetch(`/api/calendar?role=${encodeURIComponent(role)}`)
      .then(r=>r.json())
      .then(data=>{
        setItems(data)
        setLoading(false)
      })
  },[role])

  const grouped = items.reduce((acc, item) => {
    const date = item.start_time ? item.start_time.slice(0,10) : 'Unscheduled'
    if (!acc[date]) acc[date] = []
    acc[date].push(item)
    return acc
  }, {})

  return (
    React.createElement('div', { style: { border: '1px solid #ccc', padding: 12, borderRadius: 6, marginTop: 20 } },
      React.createElement('h3', null, 'Calendar View'),
      React.createElement('p', { style: { margin: '6px 0 12px' } }, `Role: ${role}`),
      loading ? React.createElement('div', null, 'Loading calendar...') :
      Object.keys(grouped).sort().map(date =>
        React.createElement('div', { key: date, style: { marginBottom: 12 } },
          React.createElement('strong', null, date),
          React.createElement('ul', null, grouped[date].map(item => React.createElement('li', { key: item.booking_id || item.order_id },
            React.createElement('div', null, React.createElement('strong', null, item.display_name)),
            React.createElement('div', null, `${item.start_time || 'unscheduled'} → ${item.end_time || 'n/a'}`),
            React.createElement('div', null, `Tech ${item.technician_id || 'unassigned'} • status ${item.status}`)
          )))
        )
      )
    )
  )
}
