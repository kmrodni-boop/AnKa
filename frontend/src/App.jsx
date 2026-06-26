import React from 'react'
import ScheduleSuggestions from './components/ScheduleSuggestions'
import OrderForm from './components/OrderForm'
import TechnicianView from './components/TechnicianView'
import CalendarView from './components/CalendarView'

export default function App(){
  const [customers, setCustomers] = React.useState([])
  const [orders, setOrders] = React.useState([])
  const [selectedOrder, setSelectedOrder] = React.useState(null)
  const [technicians, setTechnicians] = React.useState([])
  const [activeTech, setActiveTech] = React.useState(null)
  const [role, setRole] = React.useState('technician')

  React.useEffect(()=>{
    fetch('/api/customers').then(r=>r.json()).then(setCustomers)
    fetch('/api/orders').then(r=>r.json()).then(setOrders)
    fetch('/api/technicians').then(r=>r.json()).then(setTechnicians)
  },[])

  const refreshOrders = () => fetch('/api/orders').then(r=>r.json()).then(setOrders)

  return (
    React.createElement('div', { style: { fontFamily: 'sans-serif', padding: 20 } },
      React.createElement('h1', null, 'Nortronik Demo'),
      React.createElement('div', { style: { display: 'flex', gap: 40, alignItems: 'flex-start' } },
        React.createElement('section', null,
          React.createElement('h2', null, 'Customers'),
          React.createElement('ul', null, customers.map(c => React.createElement('li', { key: c.id }, `${c.name} — ${c.address}`)))
        ),
        React.createElement('section', null,
          React.createElement('h2', null, 'Orders'),
          React.createElement('ul', null, orders.map(o => React.createElement('li', { key: o.id },
            `${o.type} for customer ${o.customer_id} — est ${o.estimated_hours}h `,
            React.createElement('button', { onClick: ()=>setSelectedOrder(o) }, 'Suggest time')
          ))),
          React.createElement('div', { style: { marginTop: 12 } }, React.createElement(OrderForm, { customers: customers, onCreated: () => refreshOrders() }))
        ),
        React.createElement('section', null,
          React.createElement('h2', null, 'Technicians'),
          React.createElement('ul', null, technicians.map(t => React.createElement('li', { key: t.id },
            `${t.name} `,
            React.createElement('button', { onClick: ()=>setActiveTech(t) }, 'Open technician view')
          )))
        )
      ),
      React.createElement('div', { style: { marginTop: 20 } },
        React.createElement('label', null,
          'Calendar role: ',
          React.createElement('select', { value: role, onChange: e => setRole(e.target.value) },
            ['technician','manager','admin'].map(r => React.createElement('option', { key: r, value: r }, r))
          )
        )
      ),
      React.createElement(CalendarView, { role }),
      selectedOrder && React.createElement('div', { style: { marginTop: 20 } }, React.createElement(ScheduleSuggestions, { order: selectedOrder })),
      activeTech && React.createElement('div', { style: { marginTop: 20 } }, React.createElement(TechnicianView, { tech: activeTech, onClose: ()=>setActiveTech(null) }))
    )
  )
}
