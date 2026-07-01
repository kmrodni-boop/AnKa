const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

function simpleHeuristicReview(order, checklist) {
  const openItems = checklist.filter(item => !item.completed);
  const completedItems = checklist.filter(item => item.completed);
  const lines = [];
  lines.push(`Order ${order.id} review for type '${order.type}'.`);
  lines.push(`Customer ${order.customer_id}. ${completedItems.length} items completed, ${openItems.length} open.`);
  if (!checklist.length) {
    lines.push('No checklist items found. Add safety and quality controls first.');
  }
  if (openItems.length > 0) {
    lines.push(`Open tasks: ${openItems.map(item => item.description).join('; ')}.`);
  }
  if (order.type.toLowerCase().includes('service') && !checklist.some(i => /pressure|safety|leak/i.test(i.description))) {
    lines.push('Consider adding a pressure or leak check for service orders.');
  }
  return [{ role: 'assistant', content: lines.join(' ') }];
}

async function reviewChecklist(order, checklist) {
  if (!checklist || checklist.length === 0) {
    return [{ role: 'assistant', content: 'Checklist is empty. Add items first.' }];
  }

  const instruction = `Review the checklist for order ${order.id} and provide a concise summary of issues, missing tasks, or potential risks.`;
  const itemText = checklist.map(item => `- [${item.completed ? 'x' : ' '}] ${item.description}`).join('\n');
  const prompt = `${instruction}\nOrder type: ${order.type}\nCustomer: ${order.customer_id}\nChecklist:\n${itemText}`;

  if (!process.env.OLLAMA_URL) {
    return simpleHeuristicReview(order, checklist);
  }

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false })
    });
    if (!response.ok) {
      return simpleHeuristicReview(order, checklist);
    }
    const body = await response.json();
    if (body.response) {
      return [{ role: 'assistant', content: String(body.response).trim() }];
    }
    return simpleHeuristicReview(order, checklist);
  } catch (error) {
    return simpleHeuristicReview(order, checklist);
  }
}

module.exports = { reviewChecklist };
