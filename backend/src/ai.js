const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

function simpleHeuristicReview(order, checklist) {
  const unassessed = checklist.filter(item => !item.status);
  const rejected = checklist.filter(item => item.status === 'ikke_godkjent');
  const approved = checklist.filter(item => item.status === 'godkjent');
  const lines = [];
  lines.push(`Order ${order.id} review for type '${order.type}'.`);
  lines.push(`Customer ${order.customer_id}. ${approved.length} godkjent, ${rejected.length} ikke godkjent, ${unassessed.length} ikke vurdert.`);
  if (!checklist.length) {
    lines.push('No checklist items found. Add safety and quality controls first.');
  }
  if (rejected.length > 0) {
    lines.push(`Ikke godkjent: ${rejected.map(item => item.comment ? `${item.description} (${item.comment})` : item.description).join('; ')}.`);
  }
  if (unassessed.length > 0) {
    lines.push(`Ikke vurdert enda: ${unassessed.map(item => item.description).join('; ')}.`);
  }
  if (order.type.toLowerCase().includes('service') && !checklist.some(i => /pressure|safety|leak|trykk|sikkerhet|lekk/i.test(i.description))) {
    lines.push('Consider adding a pressure or leak check for service orders.');
  }
  return [{ role: 'assistant', content: lines.join(' ') }];
}

async function reviewChecklist(order, checklist) {
  if (!checklist || checklist.length === 0) {
    return [{ role: 'assistant', content: 'Checklist is empty. Add items first.' }];
  }

  const statusLabel = { godkjent: 'godkjent', irrelevant: 'irrelevant', ikke_godkjent: 'IKKE GODKJENT' };
  const instruction = `Review the checklist for order ${order.id} and provide a concise summary of issues, missing tasks, or potential risks.`;
  const itemText = checklist.map(item => {
    const status = statusLabel[item.status] || 'ikke vurdert';
    const comment = item.comment ? ` — kommentar: ${item.comment}` : '';
    return `- [${status}] ${item.description}${comment}`;
  }).join('\n');
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
