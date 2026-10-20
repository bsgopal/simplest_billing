import React, { useRef } from 'react';
import { Printer, Share2, PlusCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ThermalReceiptModal({ bill, onClose, onNewBill }) {
  const { shop } = useAuth();
  const receiptRef = useRef(null);

  if (!bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const phone = bill.customer?.phone?.replace(/[^0-9]/g, '');
    let msg = `*${shop?.shopName || 'Shop Receipt'}*\n`;
    msg += `Bill No: ${bill.billNo}\n`;
    msg += `Date: ${new Date(bill.date).toLocaleString()}\n`;
    msg += `Customer: ${bill.customer?.name || 'Walk-in'}\n\n`;
    msg += `*Items:*\n`;
    bill.items.forEach((it, idx) => {
      msg += `${idx + 1}. ${it.name} - ${it.qty} ${it.unit} @ ₹${it.rate} = ₹${it.amount.toFixed(2)}\n`;
    });
    msg += `\n*Grand Total: ₹${bill.grandTotal.toFixed(2)}*\n`;
    if (bill.payments?.credit > 0) {
      msg += `Payment Mode: Credit (Udhar) ₹${bill.payments.credit.toFixed(2)}\n`;
    } else {
      msg += `Paid via: ${bill.payments?.cash > 0 ? 'Cash ' : ''}${bill.payments?.upi > 0 ? 'UPI ' : ''}${bill.payments?.card > 0 ? 'Card ' : ''}\n`;
    }
    msg += `\nThank you for shopping with us! Visit again!`;

    const url = phone ? `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl border border-slate-200 my-auto animate-in zoom-in-95 duration-150">
        {/* Top Controls */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">Bill Saved ✓</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Receipt Visual Container */}
        <div 
          id="thermal-receipt-area" 
          ref={receiptRef} 
          className="my-3 p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl font-mono text-[12px] leading-tight text-slate-900"
        >
          {/* Shop Header */}
          <div className="text-center pb-2 border-b border-dashed border-slate-300">
            {/* Bill Format Title Badge */}
            <div className={`text-[10px] font-black uppercase tracking-wider mb-1 px-2 py-0.5 rounded-full inline-block ${
              bill.isGstBill === false || bill.billType === 'NON_GST'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
            }`}>
              {bill.isGstBill === false || bill.billType === 'NON_GST'
                ? (bill.billTitle || 'ESTIMATE / CASH MEMO')
                : (shop?.chargeGst || bill.taxAmount > 0 ? 'TAX INVOICE' : 'RETAIL INVOICE')}
            </div>

            <h2 className="text-sm font-black uppercase tracking-tight text-slate-900">{shop?.shopName || 'Retail Store'}</h2>
            <p className="text-[11px] text-slate-600">{shop?.address || 'Main Road'}</p>
            <p className="text-[11px] text-slate-600">Ph: {shop?.phone || ''}</p>
            {bill.isGstBill !== false && bill.billType !== 'NON_GST' && (shop?.chargeGst || bill.taxAmount > 0) && shop?.gstin && (
              <p className="text-[10px] text-slate-700 font-bold">GSTIN: {shop.gstin}</p>
            )}
          </div>

          {/* Bill Meta */}
          <div className="py-2 border-b border-dashed border-slate-300 flex justify-between text-[11px]">
            <div>
              <p className="font-bold">Bill: #{bill.billNo}</p>
              <p className="text-slate-500">Cust: {bill.customer?.name || 'Walk-in'}</p>
            </div>
            <div className="text-right">
              <p>{new Date(bill.date).toLocaleDateString()}</p>
              <p>{new Date(bill.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full my-2 text-[11px]">
            <thead>
              <tr className="border-b border-dashed border-slate-300 text-slate-600 text-left">
                <th className="py-1">Item</th>
                <th className="py-1 text-center">Qty</th>
                <th className="py-1 text-right">Rate</th>
                <th className="py-1 text-right">Amt</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((it, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="py-1 font-semibold">
                    <div>{it.name}</div>
                    {bill.isGstBill !== false && bill.billType !== 'NON_GST' && (it.gstPercent > 0 || it.hsn) && (
                      <div className="text-[9px] text-slate-500 font-normal">
                        {it.hsn ? `HSN:${it.hsn} ` : ''}{it.gstPercent ? `(${it.gstPercent}% GST)` : ''}
                      </div>
                    )}
                  </td>
                  <td className="py-1 text-center">{it.qty} {it.unit}</td>
                  <td className="py-1 text-right">{it.rate.toFixed(2)}</td>
                  <td className="py-1 text-right font-bold">{it.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary Totals */}
          <div className="pt-2 border-t border-dashed border-slate-300 space-y-0.5 text-[11px]">
            <div className="flex justify-between">
              <span>Sub Total:</span>
              <span>₹{(bill.subTotal || 0).toFixed(2)}</span>
            </div>
            {bill.billDiscount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount:</span>
                <span>-₹{bill.billDiscount.toFixed(2)}</span>
              </div>
            )}
            {bill.isGstBill !== false && bill.billType !== 'NON_GST' && bill.taxAmount > 0 && (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>CGST:</span>
                  <span>₹{((bill.cgstAmount !== undefined ? bill.cgstAmount : (bill.taxAmount / 2)) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST:</span>
                  <span>₹{((bill.sgstAmount !== undefined ? bill.sgstAmount : (bill.taxAmount / 2)) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Total GST:</span>
                  <span>₹{bill.taxAmount.toFixed(2)}</span>
                </div>
              </>
            )}
            {bill.roundOff !== 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Round Off:</span>
                <span>{bill.roundOff > 0 ? `+₹${bill.roundOff.toFixed(2)}` : `-₹${Math.abs(bill.roundOff).toFixed(2)}`}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black border-t border-dashed border-slate-300 pt-1 text-slate-900">
              <span>GRAND TOTAL:</span>
              <span>₹{bill.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="mt-2 pt-2 border-t border-dashed border-slate-300 text-[10px] space-y-0.5 text-slate-600">
            {bill.payments?.cash > 0 && <div className="flex justify-between"><span>Paid (Cash):</span><span>₹{bill.payments.cash.toFixed(2)}</span></div>}
            {bill.payments?.upi > 0 && <div className="flex justify-between"><span>Paid (UPI):</span><span>₹{bill.payments.upi.toFixed(2)}</span></div>}
            {bill.payments?.card > 0 && <div className="flex justify-between"><span>Paid (Card):</span><span>₹{bill.payments.card.toFixed(2)}</span></div>}
            {bill.payments?.credit > 0 && <div className="flex justify-between font-bold text-amber-800"><span>Credit (Udhar):</span><span>₹{bill.payments.credit.toFixed(2)}</span></div>}
            {bill.changeReturned > 0 && <div className="flex justify-between font-bold text-emerald-800"><span>Change Returned:</span><span>₹{bill.changeReturned.toFixed(2)}</span></div>}
          </div>

          {/* Footer Note */}
          <div className="text-center mt-3 pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-500">
            <p>{shop?.footerMessage || 'Thank you! Visit again!'}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Thermal</span>
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition shadow-xs"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>
        </div>

        {onNewBill && (
          <button
            onClick={onNewBill}
            className="w-full mt-2 py-2.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition print:hidden"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Start Next Bill</span>
          </button>
        )}
      </div>
    </div>
  );
}
