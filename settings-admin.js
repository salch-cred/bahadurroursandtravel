import { boot, api, $, $$, toast } from './admin-ui.js';

await boot({
  page: 'settings', title: 'Business settings', subtitle: 'These details print on every invoice and receipt',
  actions: '<button class="btn primary" id="save"><i class="hgi-stroke hgi-tick-02"></i>Save settings</button>',
});

const field = (name, label, attrs = '') => `<label class="field"><span>${label}</span><input name="${name}" ${attrs}></label>`;
$('main.ad-main').innerHTML = `<form id="f" class="grid g-2">
  <section class="card"><div class="card-head"><h3>Company</h3></div><div class="card-body form-grid">
    <div class="full">${field('company_name', 'Business name', 'required')}</div>
    <div class="full">${field('address_line1', 'Address line 1')}</div>
    <div class="full">${field('address_line2', 'Address line 2')}</div>
    ${field('phone', 'Phone')}${field('email', 'Email', 'type="email"')}
    ${field('website', 'Website')}${field('signatory', 'Signature line')}
  </div></section>
  <section class="card"><div class="card-head"><h3>Tax</h3></div><div class="card-body form-grid">
    ${field('gstin', 'GSTIN', 'maxlength="15"')}${field('pan', 'PAN', 'maxlength="10"')}
    ${field('state', 'State')}${field('state_code', 'State code')}
    ${field('default_sac', 'Default SAC code')}
    <label class="field"><span>Default tax</span><select name="default_tax_mode"><option value="none">No tax</option><option value="cgst_sgst">CGST + SGST</option><option value="igst">IGST</option></select></label>
    ${field('default_tax_rate', 'Default GST rate %', 'type="number" min="0" step="0.01"')}
    <p class="full" style="margin:0;color:var(--muted);font-size:12.5px">Add your GSTIN to print documents as “Tax invoice”. Check the right rate for your business with your accountant.</p>
  </div></section>
  <section class="card"><div class="card-head"><h3>Getting paid</h3><small>Shown under “Pay to”</small></div><div class="card-body form-grid">
    ${field('bank_name', 'Bank')}${field('bank_account_name', 'Account name')}
    ${field('bank_account', 'Account number')}${field('bank_ifsc', 'IFSC')}
    ${field('bank_branch', 'Branch')}${field('upi_id', 'UPI ID', 'placeholder="name@bank"')}
    <p class="full" style="margin:0;color:var(--muted);font-size:12.5px">With a UPI ID set, each invoice shows a QR code for its exact balance.</p>
  </div></section>
  <section class="card"><div class="card-head"><h3>Document defaults</h3></div><div class="card-body form-grid">
    ${field('invoice_prefix', 'Invoice prefix')}${field('quote_prefix', 'Quotation prefix')}
    ${field('receipt_prefix', 'Receipt prefix')}${field('due_days', 'Days until due', 'type="number" min="0"')}
    <label class="field full"><span>Default invoice note</span><textarea name="default_note" rows="2"></textarea></label>
    <label class="field full"><span>Booking conditions (one per line)</span><textarea name="terms" rows="4"></textarea></label>
  </div></section>
</form>`;

const { settings } = await api('admin?type=settings');
$$('#f [name]').forEach((el) => { el.value = settings[el.name] ?? ''; });
$('#save').onclick = async () => {
  const f = $('#f');
  if (!f.reportValidity()) return;
  try {
    await api('admin', { method: 'PUT', body: { type: 'settings', settings: Object.fromEntries(new FormData(f)) } });
    toast('Settings saved', 'good');
  } catch (e) { toast(e.message, 'bad'); }
};
