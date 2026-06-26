import React from 'react'

export default function OrderForm({ customers, onCreated }){
  const [customerId, setCustomerId] = React.useState(customers[0]?.id || '')
  const [type, setType] = React.useState('årskontroll')
  const [estimatedHours, setEstimatedHours] = React.useState(3)

  React.useEffect(()=>{
    if (customers.length && !customerId) setCustomerId(customers[0].id)
  },[customers])

  const submit = async (e) => {
    e.preventDefault()
    const payload = { customer_id: parseInt(customerId,10), type, estimated_hours: Number(estimatedHours) }
    const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json()
    if (data.id) {
      onCreated && onCreated(data.id)
    }
  }

  return (
    React.createElement('form', { onSubmit: submit, style: { border: '1px solid #ddd', padding: 12, borderRadius: 6 } },
      React.createElement('h3', null, 'Create Order'),
      React.createElement('label', null, 'Customer: '),
      React.createElement('select', { value: customerId, onChange: e=>setCustomerId(e.target.value) }, customers.map(c=>React.createElement('option',{key:c.id,value:c.id},c.name))),
      React.createElement('div', { style: { marginTop: 8 } },
        React.createElement('label', null, 'Type: '),
        React.createElement('input', { value: type, onChange: e=>setType(e.target.value) })
      ),
      React.createElement('div', { style: { marginTop: 8 } },
        React.createElement('label', null, 'Estimated hours: '),
        React.createElement('input', { type: 'number', value: estimatedHours, onChange: e=>setEstimatedHours(e.target.value), min: 0.5, step: 0.5 })
      ),
      React.createElement('div', { style: { marginTop: 10 } }, React.createElement('button', { type: 'submit' }, 'Create Order'))
    )
  )
}
