const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/v1/models/llama2/outputs';

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
      body: JSON.stringify({ input: prompt })
    });
    const body = await response.json();
    if (body.output && Array.isArray(body.output)) {
      return body.output.map(item => ({ role: 'assistant', content: item.content || item }));
    }
    if (body.result) {
      return [{ role: 'assistant', content: String(body.result) }];
    }
    return [{ role: 'assistant', content: 'AI review responded with unexpected format.' }];
  } catch (error) {
    return [{ role: 'assistant', content: `AI review failed: ${error.message}.` }];
  }
}

module.exports = { reviewChecklist };
