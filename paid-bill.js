// Standalone view of an invoice (?id=) or payment receipt (?receipt=), ready to print or save.
import { boot, api, $, toast } from './admin-ui.js';
import { renderInvoice, renderReceipt, savePdf, pdfName, fitInvoice } from './invoice-render.js';

const params = new URLSearchParams(location.search);
await boot({
  page: 'invoices', title: params.get('receipt') ? 'Payment receipt' : 'Document',
  actions: '<button class="btn" id="print"><i class="hgi-stroke hgi-printer"></i>Print</button><button class="btn primary" id="pdf"><i class="hgi-stroke hgi-download-04"></i>Download PDF</button>',
});
await document.fonts?.ready;
const main = $('main.ad-main');
main.innerHTML = '<div class="stage" id="stage"><div class="stage-inner" id="sheet"></div></div>';

let fileName = 'Bahadur-document.pdf';
try {
  if (params.get('receipt')) {
    const { payment, invoice, settings } = await api(`admin?type=receipt&id=${encodeURIComponent(params.get('receipt'))}`);
    $('#sheet').innerHTML = renderReceipt(payment, invoice, settings);
    fileName = pdfName({ invoice_number: payment.receipt_no, customer_name: invoice.customer_name });
  } else {
    const { invoice, payments, settings } = await api(`admin?type=invoice&id=${encodeURIComponent(params.get('id') || '')}`);
    $('#sheet').innerHTML = renderInvoice(invoice, settings, payments);
    fileName = pdfName(invoice);
  }
} catch (e) {
  main.innerHTML = `<div class="empty"><i class="hgi-stroke hgi-alert-02"></i>${e.message}</div>`;
}

function fit() {
  const stage = $('#stage'), inner = $('#sheet');
  if (!stage) return;
  stage.style.maxWidth = '860px';
  stage.style.margin = '0 auto';
  fitInvoice(inner);
  const scale = Math.min(1, (stage.clientWidth - 32) / 794);
  inner.style.transform = `scale(${scale})`;
  stage.style.height = Math.ceil(inner.offsetHeight * scale + 34) + 'px';
}
fit();
window.addEventListener('resize', fit);
$('#print').onclick = () => window.print();
$('#pdf').onclick = async () => {
  try { await savePdf($('#sheet .inv'), fileName); toast('PDF saved', 'good'); } catch (e) { toast(e.message, 'bad'); }
};
