import React from 'react'

export default function Checklist({ orderId }){
  const [items, setItems] = React.useState([])
  const [text, setText] = React.useState('')
  const [review, setReview] = React.useState(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(()=>{
    if (!orderId) return
    fetch(`/api/orders/${orderId}/checklist`).then(r=>r.json()).then(data=>{
      setItems(data)
      setReview(null)
    })
  },[orderId])

  const add = async (e)=>{
    e.preventDefault()
    if (!text) return
    const res = await fetch(`/api/orders/${orderId}/checklist`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: text }) })
    const data = await res.json()
    if (data.id) {
      setItems([...items, { id: data.id, order_id: orderId, description: text, completed: 0 }])
      setText('')
    }
  }

  const toggleItem = async (itemId, nextCompleted) => {
    await fetch(`/api/checklist/${itemId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed: nextCompleted }) })
    setItems(items.map(item => item.id === itemId ? { ...item, completed: nextCompleted ? 1 : 0 } : item))
  }

  const runReview = async () => {
    setLoading(true)
    const res = await fetch(`/api/orders/${orderId}/review`)
    const data = await res.json()
    setReview(data.review)
    setLoading(false)
  }

  return (
    React.createElement('div', { style: { border: '1px solid #ddd', padding: 10, borderRadius: 6 } },
      React.createElement('h4', null, 'Checklist'),
      React.createElement('ul', null, items.map(it => React.createElement('li', { key: it.id },
        React.createElement('label', null,
          React.createElement('input', { type: 'checkbox', checked: Boolean(it.completed), onChange: e => toggleItem(it.id, e.target.checked), style: { marginRight: 8 } }),
          it.description,
          it.completed ? ' ✅' : ''
        )
      ))),
      React.createElement('form', { onSubmit: add, style: { marginTop: 8 } },
        React.createElement('input', { value: text, onChange: e=>setText(e.target.value), placeholder: 'Add checklist item' }),
        React.createElement('button', { type: 'submit' }, 'Add')
      ),
      React.createElement('div', { style: { marginTop: 10 } },
        React.createElement('button', { type: 'button', onClick: runReview, disabled: loading }, loading ? 'Reviewing...' : 'Run AI review')
      ),
      review && React.createElement('div', { style: { marginTop: 12, whiteSpace: 'pre-wrap', borderTop: '1px solid #eee', paddingTop: 10 } },
        review.map((item, index) => React.createElement('div', { key: index }, item.content))
      )
    )
  )
}
