function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nok(amount) {
  return (Math.round((amount || 0) * 100) / 100).toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Bevisst gammeldags stil - Tahoma, grå gradient, tykke kant-linjer, tabell-layout.
// Dette skal se ut som en fakturaapp fra tidlig 2000-tall, ikke et moderne produkt.
function layout(title, body, { activeNav = '' } = {}) {
  const navItem = (href, label, key) => `
    <a href="${href}" class="navlink${activeNav === key ? ' active' : ''}">${label}</a>`;

  return `<!DOCTYPE html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} - FakturaPro 2000</title>
<style>
  body {
    font-family: Tahoma, Geneva, Verdana, sans-serif;
    background: #c0c0c0 url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="%23c8c8c8"/></svg>');
    margin: 0;
    color: #222;
    font-size: 13px;
  }
  .titlebar {
    background: linear-gradient(to bottom, #4a6ea9, #2a4a80);
    color: #fff;
    padding: 6px 12px;
    font-weight: bold;
    font-size: 15px;
    border-bottom: 2px solid #1a2a50;
  }
  .navbar {
    background: #d4d0c8;
    border-bottom: 2px solid #808080;
    padding: 4px 10px;
  }
  .navlink {
    display: inline-block;
    padding: 4px 12px;
    margin-right: 4px;
    background: #ece9d8;
    border: 1px outset #fff;
    color: #000080;
    text-decoration: none;
    font-size: 12px;
  }
  .navlink:hover { background: #fff8dc; }
  .navlink.active { background: #b8c8e8; border: 1px inset #808080; font-weight: bold; }
  .content { padding: 16px; max-width: 900px; margin: 0 auto; }
  .panel {
    background: #ece9d8;
    border: 2px groove #fff;
    padding: 14px;
    margin-bottom: 14px;
  }
  h1 { font-size: 18px; color: #2a4a80; border-bottom: 1px solid #999; padding-bottom: 4px; }
  h2 { font-size: 14px; color: #2a4a80; }
  table.grid { border-collapse: collapse; width: 100%; background: #fff; }
  table.grid th, table.grid td { border: 1px solid #999; padding: 5px 8px; text-align: left; font-size: 12px; }
  table.grid th { background: #b8c8e8; }
  table.grid tr:nth-child(even) td { background: #f4f4f4; }
  .btn {
    background: #ece9d8;
    border: 2px outset #fff;
    padding: 5px 14px;
    font-family: Tahoma, sans-serif;
    font-size: 12px;
    cursor: pointer;
    color: #000;
  }
  .btn:active { border: 2px inset #808080; }
  .btn-primary { background: #b8c8e8; font-weight: bold; }
  label { display: block; font-weight: bold; margin: 8px 0 2px; font-size: 12px; }
  input[type=text], input[type=number], input[type=email], input[type=tel], textarea, select {
    width: 100%; box-sizing: border-box; padding: 4px; border: 1px inset #808080; font-family: Tahoma, sans-serif; font-size: 12px;
  }
  .footer { text-align: center; padding: 10px; color: #555; font-size: 11px; }
  .badge { display: inline-block; padding: 1px 6px; background: #ffe08a; border: 1px solid #c9a227; font-size: 11px; }
  .muted { color: #666; font-size: 11px; }
  a { color: #000080; }
</style>
</head>
<body>
  <div class="titlebar">🧾 FakturaPro 2000 <span style="font-weight:normal; font-size:11px;">- Enterprise Faktureringsløsning</span></div>
  <div class="navbar">
    ${navItem('/', 'Forsiden', 'home')}
    ${navItem('/kunder', 'Kunder', 'customers')}
    ${navItem('/varer', 'Varer/Tjenester', 'materials')}
    ${navItem('/mottatt', 'Mottatt fra AnKa', 'received')}
    ${navItem('/fakturaer', 'Fakturaer', 'invoices')}
  </div>
  <div class="content">
    <h1>${esc(title)}</h1>
    ${body}
  </div>
  <div class="footer">FakturaPro 2000 v1.0.3 &middot; Sist oppdatert 2003 &middot; Kun for demo/utviklingsformål</div>
</body>
</html>`;
}

module.exports = { esc, nok, layout };
