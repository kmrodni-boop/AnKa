import React from 'react'
import Checklist from './Checklist'

export default function TechnicianView({ tech, onClose }){
  const [bookings, setBookings] = React.useState([])
  const [myOrders, setMyOrders] = React.useState([])
  const [activeOrder, setActiveOrder] = React.useState(null)

  React.useEffect(()=>{
    if (!tech) return
    fetch(`/api/technicians/${tech.id}/bookings`).then(r=>r.json()).then(setBookings)
    fetch('/api/orders').then(r=>r.json()).then(list=>setMyOrders(list.filter(o=>o.assigned_tech_id===tech.id)))
  },[tech])

  const startOrder = async (orderId) => {
    await fetch(`/api/orders/${orderId}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'in_progress' }) })
    setMyOrders(myOrders.map(o=>o.id===orderId?{...o,status:'in_progress'}:o))
  }

  const completeOrder = async (orderId) => {
    await fetch(`/api/orders/${orderId}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'done' }) })
    setMyOrders(myOrders.map(o=>o.id===orderId?{...o,status:'done'}:o))
  }

  if (!tech) return null

  return (
    React.createElement('div', { style: { border: '1px solid #ccc', padding: 12, borderRadius: 6 } },
      React.createElement('h3', null, `Technician: ${tech.name}`),
      React.createElement('button', { onClick: onClose }, 'Close'),
      React.createElement('h4', null, 'Bookings'),
      React.createElement('ul', null, bookings.map(b => React.createElement('li', { key: b.id }, `${b.start.toString()} → ${b.end.toString()} (order ${b.order_id})`))),
      React.createElement('h4', { style: { marginTop: 10 } }, 'My Orders'),
      React.createElement('ul', null, myOrders.map(o => React.createElement('li', { key: o.id },
        `${o.type} — ${o.status} `,
        React.createElement('button', { onClick: ()=>setActiveOrder(o) }, 'Open'),
        React.createElement('button', { onClick: ()=>startOrder(o.id), style: { marginLeft: 8 } }, 'Start'),
        React.createElement('button', { onClick: ()=>completeOrder(o.id), style: { marginLeft: 8 } }, 'Complete')
      ))),
      activeOrder && React.createElement('div', { style: { marginTop: 10 } }, React.createElement('h4', null, `Order ${activeOrder.id}`), React.createElement(Checklist, { orderId: activeOrder.id }))
    )
  )
}
