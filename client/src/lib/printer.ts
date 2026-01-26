
export const printThermalTicket = (ticket: any, organizationName: string = "IkHODE") => {
    const width = 80; // mm assumed, can be styled via CSS

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const date = new Date().toLocaleString('es-MX');
    const total = (ticket.amount / 100).toFixed(2);
    const rate = (ticket.unitPrice / 100).toFixed(2);

    doc.open();
    doc.write(`
        <html>
        <head>
            <style>
                @page { margin: 0; size: 80mm auto; }
                body { 
                    font-family: 'Courier New', monospace; 
                    width: 76mm; 
                    margin: 2mm; 
                    font-size: 12px;
                    line-height: 1.2;
                    color: black;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .bold { font-weight: bold; }
                .divider { border-top: 1px dashed black; margin: 5px 0; }
                .header { margin-bottom: 10px; }
                .footer { margin-top: 15px; font-size: 10px; }
                .big-total { font-size: 16px; margin: 5px 0; }
            </style>
        </head>
        <body>
            <div class="header text-center">
                <div class="bold" style="font-size: 14px;">${organizationName}</div>
                <div>TICKET DE DESTAJO</div>
                <div>${date}</div>
            </div>
            
            <div class="divider"></div>
            
            <div><span class="bold">Empleado:</span> ${ticket.employeeName || 'Trabajador'}</div>
            <div><span class="bold">Lote:</span> ${ticket.batchId?.substring(0, 8) || 'N/A'}</div>
            <div><span class="bold">Proceso:</span> ${ticket.concept || 'Producción'}</div>
            
            <div class="divider"></div>
            
            <table style="width: 100%">
                <tr>
                    <td class="text-left">${ticket.quantity} ${ticket.unit || 'pza'} x $${rate}</td>
                    <td class="text-right">$${total}</td>
                </tr>
            </table>
            
            <div class="divider"></div>
            
            <div class="text-right big-total">
                <span class="bold">TOTAL: $${total}</span>
            </div>
            
            <div class="footer text-center">
                <div>Folio: #${ticket.id.toString().substring(0, 6)}</div>
                <div>Firma del Supervisor</div>
                <br/><br/>
                <div class="divider"></div>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { 
                        // window.close() is not needed for iframe, just remove it
                        // parent.document.body.removeChild(window.frameElement);
                    }, 1000);
                }
            </script>
        </body>
        </html>
    `);
    doc.close();

    // Trigger print from the iframe
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    // Clean up after a delay
    setTimeout(() => {
        document.body.removeChild(iframe);
    }, 2000);
};
