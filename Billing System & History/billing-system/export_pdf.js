// Global Export utility for Order History (PDF and CSV)
(function() {
    'use strict';
    
    // Function to generate WhatsApp message
    function generateWhatsAppMessage(order) {
        if (!order) return '';
        
        const date = new Date(order.date || new Date());
        const formattedDate = date.toLocaleDateString('en-GB');
        const formattedTime = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).toUpperCase();
        
        // Format the amount with Indian Rupee symbol and proper formatting
        const formattedAmount = `₹${(order.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
        // Get payment method, default to CARD if not specified
        const paymentMethod = order.paymentMethod || 'CARD';
        
        return `Hi ${order.customerName || 'Customer'}, thank you for dining with us at our restaurant!  
We appreciate your visit and hope you had a wonderful experience.

Please find your bill details below:

*Total Amount Paid: ${formattedAmount}*  
*Payment Mode: ${paymentMethod}*  
*Date & Time: ${formattedDate} at ${formattedTime}*

If you have any feedback, feel free to reply—we'd love to hear from you!
Looking forward to serving you again soon.

Powered by Ailexity Tech Pvt Ltd  
– Team our restaurant`;
    }

    // Export to PDF function
    async function exportToPDF() {
        try {
            // Ensure jsPDF is loaded
            if (!window.jspdf?.jsPDF) {
                console.log('jsPDF not loaded, attempting to load...');
                await loadJsPDF();
            }
            if (!window.jspdf?.jsPDF) {
                throw new Error('Failed to load PDF library');
            }
            console.log('Exporting PDF...');
            console.log('window.jspdf exists:', !!window.jspdf);
            console.log('filteredOrders:', typeof filteredOrders, Array.isArray(filteredOrders) ? filteredOrders.length : 'N/A');
            console.log('allOrders:', typeof allOrders, Array.isArray(allOrders) ? allOrders.length : 'N/A');
            const orders = (typeof filteredOrders !== 'undefined' && Array.isArray(filteredOrders) && filteredOrders.length)
                ? filteredOrders
                : (typeof allOrders !== 'undefined' ? allOrders : []);
            if (!orders || orders.length === 0) {
                alert('No orders to export');
                return;
            }
            console.log('Global jsPDF:', window.jspdf || 'Not found');
            
            // The UMD bundle from CDN makes jsPDF available as window.jspdf.jsPDF
            const jsPDF = window.jspdf?.jsPDF || window.jspdf || window.jsPDF;
            
            if (!jsPDF) {
                console.error('jsPDF not found. Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('jspdf') || k === 'jsPDF'));
                throw new Error('PDF library not loaded. Check console for details.');
            }
            
            console.log('Using jsPDF constructor from:', 
                window.jspdf?.jsPDF ? 'window.jspdf.jsPDF' : 
                window.jspdf ? 'window.jspdf' : 
                'window.jsPDF');
                
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // Set document properties
            doc.setProperties({
                title: 'Order History Report',
                subject: 'Restaurant Order History',
                author: 'Restaurant Management System',
                creator: 'Restaurant Management System'
            });

            // Set margins and page dimensions
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            const leftX = margin;
            const rightX = pageWidth - margin;
            let y = 15;

            // Calculate summary data
            const totalOrders = orders.length;
            const totalRevenue = orders.reduce((sum, order) => 
                sum + parseFloat(order.totalAmount || order.total || 0), 0);
            const paidOrders = orders.filter(order => 
                order.paymentStatus === 'paid' || order.paymentStatus === 'completed').length;
            const pendingOrders = totalOrders - paidOrders;

            // Header with dark background
            doc.setFillColor(44, 62, 80);
            doc.rect(0, 0, pageWidth, 70, 'F');
            
            // Add title
            doc.setFontSize(24);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text('ORDER HISTORY REPORT', pageWidth / 2, 30, { align: 'center' });
            
            // Add generated date
            doc.setFontSize(12);
            doc.setTextColor(200, 200, 200);
            const now = new Date();
            const generatedOn = now.toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            doc.text(`Generated on: ${generatedOn}`, pageWidth / 2, 40, { align: 'center' });
            
            y = 60; // Reset y position after header
            
            // Add summary section
            doc.setFontSize(20);
            doc.setTextColor(44, 62, 80);
            doc.setFont(undefined, 'bold');
            doc.text('Summary', pageWidth / 2, y + 10, { align: 'center' });
            y += 20;
            
            // Summary cards
            const cardWidth = (pageWidth - 2 * margin - 30) / 4;
            const cardHeight = 60;
            
            // Card 1: Total Orders
            addRoundedRect(doc, leftX, y, cardWidth, cardHeight, 10, '#f8f9fa');
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text('TOTAL ORDERS', leftX + 10, y + 15);
            doc.setFontSize(22);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(44, 62, 80);
            doc.text(totalOrders.toString(), leftX + 10, y + 35);
            
            // Card 2: Total Revenue
            doc.setFillColor(40, 167, 69);
            doc.roundedRect(leftX + cardWidth + 10, y, cardWidth, cardHeight, 10, 10, 'F');
            doc.setFontSize(12);
            doc.setTextColor(255, 255, 255);
            doc.text('TOTAL REVENUE', leftX + cardWidth + 20, y + 15);
            doc.setFontSize(22);
            doc.setFont(undefined, 'bold');
            doc.text(`₹${totalRevenue.toFixed(2)}`, leftX + cardWidth + 20, y + 35);
            
            // Card 3: Paid Orders
            doc.setFillColor(0, 123, 255);
            doc.roundedRect(leftX + (cardWidth + 10) * 2, y, cardWidth, cardHeight, 10, 10, 'F');
            doc.setFontSize(12);
            doc.text('PAID ORDERS', leftX + (cardWidth + 10) * 2 + 10, y + 15);
            doc.setFontSize(22);
            doc.setFont(undefined, 'bold');
            doc.text(paidOrders.toString(), leftX + (cardWidth + 10) * 2 + 10, y + 35);
            
            // Card 4: Pending Orders
            doc.setFillColor(255, 193, 7);
            doc.roundedRect(leftX + (cardWidth + 10) * 3, y, cardWidth, cardHeight, 10, 10, 'F');
            doc.setFontSize(12);
            doc.text('PENDING ORDERS', leftX + (cardWidth + 10) * 3 + 10, y + 15);
            doc.setFontSize(22);
            doc.setFont(undefined, 'bold');
            doc.text(pendingOrders.toString(), leftX + (cardWidth + 10) * 3 + 10, y + 35);
            
            y += cardHeight + 20;
            
            // Add order details title
            doc.setFontSize(20);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(44, 62, 80);
            doc.text('Order Details', pageWidth / 2, y, { align: 'center' });
            y += 15;
            
            // Define table headers and column widths
            const colWidths = [30, 25, 30, 20, 50, 20, 20];
            const headers = [
                { text: 'Bill #', align: 'left' },
                { text: 'Date', align: 'center' },
                { text: 'Customer', align: 'left' },
                { text: 'Table', align: 'center' },
                { text: 'Items', align: 'left' },
                { text: 'Amount', align: 'right' },
                { text: 'Status', align: 'center' }
            ];
            
            const BILL_NUMBER_FONT_SIZE = 9;
            const NORMAL_FONT_SIZE = 9;
            
            // Add logo if available
            const addLogo = async () => {
                try {
                    // Replace with your logo URL or base64 string
                    const logoUrl = '/images/logo.png';
                    const logoWidth = 50;
                    const logoX = (pageWidth - logoWidth) / 2;
                    const logoY = y;
                    
                    // Add logo image if available
                    await doc.addImage(logoUrl, 'PNG', logoX, logoY, logoWidth, 15);
                    y += 25; // Adjust spacing after logo
                } catch (e) {
                    console.log('Logo not found, continuing without it');
                }
            };
            
            // Add watermark function
            const addWatermark = () => {
                doc.setFontSize(60);
                doc.setTextColor(230, 230, 230);
                doc.setGState(new GState({opacity: 0.1}));
                doc.text('SAMPLE', pageWidth / 2, pageHeight / 2, {angle: 45, align: 'center', baseline: 'middle'});
                doc.setGState(new GState({opacity: 1}));
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(10);
            };
            
            // Add logo and watermark
            await addLogo();
            
            // Draw table header
            doc.setFillColor(73, 80, 87);
            doc.roundedRect(leftX, y - 5, pageWidth - margin * 2, 10, 3, 3, 'F');
            doc.setFont(undefined, 'bold');
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            
            // Add watermark (subtle background text)
            addWatermark();
            
            // Draw each header cell with proper alignment
            let x = leftX;
            headers.forEach((header, i) => {
                doc.text(header.text, x + (header.align === 'center' ? colWidths[i]/2 : 
                    (header.align === 'right' ? colWidths[i] - 2 : 0)), 
                    y, { align: header.align });
                x += colWidths[i];
            });
            
            // Reset text color for data rows
            doc.setTextColor(0, 0, 0);
            doc.setDrawColor(220, 220, 220);
            doc.line(leftX, y + 2, pageWidth - margin, y + 2);
            y += 10;
            
            // Process each order
            orders.forEach((order, orderIndex) => {
                if (y > pageHeight - 30) {
                    doc.addPage();
                    y = margin;
                    
                    // Redraw header on new page
                    doc.setFillColor(47, 62, 77);
                    doc.rect(0, 0, pageWidth, 15, 'F');
                    doc.setFontSize(16);
                    doc.setTextColor(255, 255, 255);
                    doc.setFont(undefined, 'bold');
                    doc.text('ORDER HISTORY REPORT (CONTINUED)', pageWidth / 2, 10, { align: 'center' });
                    doc.setFontSize(10);
                    y = margin + 10;
                }
                
                // Alternate row colors
                const bgColor = orderIndex % 2 === 0 ? [255, 255, 255] : [248, 248, 248];
                doc.setFillColor(...bgColor);
                doc.rect(leftX, y - 2, pageWidth - margin * 2, 8, 'F');
                
                // Format Bill # - ensure full visibility
                const billNumber = order.billNumber || order.id?.substring(0, 12) || 'N/A';
                
                // Format date as DD/MM/YYYY
                const orderDate = order.date || order.billDate;
                let formattedDate = 'N/A';
                try {
                    if (orderDate) {
                        const d = new Date(orderDate);
                        const day = String(d.getDate()).padStart(2, '0');
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const year = d.getFullYear();
                        formattedDate = `${day}/${month}/${year}`;
                    }
                } catch (e) {
                    console.error('Error formatting date:', e);
                }
                
                // Format items list
                const itemsText = order.items
                    .map(item => {
                        const name = item.menuItem?.name || item.name || 'Item';
                        const qty = item.quantity || 1;
                        return `${name} (x${qty})`;
                    })
                    .join(', ');
                
                // Format amount with configurable currency symbol
                const CURRENCY_SYMBOL = '₹'; // Can be changed to $, €, etc.
                const totalAmount = parseFloat(order.totalAmount || order.total || 0);
                const formattedAmount = `${CURRENCY_SYMBOL}${totalAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
                
                // Status with color
                const isPaid = order.paymentStatus === 'paid' || order.paymentStatus === 'completed';
                const statusColor = isPaid ? [0, 150, 0] : [200, 0, 0];
                
                // Draw row data with proper alignment and formatting
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                
                // Calculate positions
                const positions = [
                    leftX,  // Bill #
                    leftX + colWidths[0] + 2,  // Date
                    leftX + colWidths[0] + colWidths[1] + 4,  // Customer
                    leftX + colWidths[0] + colWidths[1] + colWidths[2] + 4,  // Table
                    leftX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 6,  // Items
                    rightX  // Amount
                ];
                
                // Draw each cell with proper alignment and formatting
                doc.setTextColor(0, 0, 0);
                
                // Bill # - monospace font
                doc.setFont('courier');
                doc.setFontSize(BILL_NUMBER_FONT_SIZE);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(73, 80, 87);
                doc.text(billNumber, positions[0], y, {
                    maxWidth: colWidths[0] - 2,
                    align: 'left'
                });
                doc.setFont('helvetica');
                doc.setFontSize(NORMAL_FONT_SIZE);
                doc.setFont(undefined, 'normal');
                
                // Date - centered
                doc.text(formattedDate, positions[1] + (colWidths[1] / 2), y, {
                    align: 'center'
                });
                
                // Customer - capitalized
                const customerName = (order.customerName || 'Walk-in').toLowerCase()
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                doc.setTextColor(44, 62, 80);
                doc.setFont(undefined, 'bold');
                doc.text(customerName, positions[2], y, {
                    maxWidth: colWidths[2] - 2,
                    align: 'left'
                });
                doc.setFont(undefined, 'normal');
                
                // Table - centered
                const tableNum = order.tableNumber?.toString() || 'N/A';
                doc.text(tableNum, positions[3] + colWidths[3]/2, y, { align: 'center' });
                
                // Items - left aligned with word break
                doc.text(itemsText, positions[4], y, {
                    maxWidth: colWidths[4] - 2,
                    align: 'left'
                });
                
                // Amount - right aligned with color
                doc.setFont(undefined, 'bold');
                doc.setFontSize(9);
                doc.setTextColor(40, 167, 69); // Green color for amount
                doc.text(formattedAmount, positions[5] - 2, y, {
                    align: 'right',
                    maxWidth: colWidths[5] - 2
                });
                doc.setFontSize(NORMAL_FONT_SIZE);
                
                // Status indicator
                const statusText = isPaid ? 'Paid' : 'Unpaid';
                doc.setFont(undefined, 'bold');
                doc.setTextColor(isPaid ? 40 : 255, isPaid ? 167 : 193, isPaid ? 69 : 7);
                doc.text(statusText, positions[6] + colWidths[6]/2, y, { align: 'center' });
                doc.setFont(undefined, 'normal');
                doc.setTextColor(0, 0, 0);
                
                y += 6;
                
                // Add separator line
                if (orderIndex < orders.length - 1) {
                    doc.setDrawColor(240, 240, 240);
                    doc.line(leftX, y, pageWidth - margin, y);
                    y += 2;
                }
            });
            
            // Add total summary at the bottom with proper formatting
            y += 8;
            doc.setDrawColor(200, 200, 200);
            doc.line(leftX, y, pageWidth - margin, y);
            y += 5;
            
            // Calculate grand total with proper number handling
            const grandTotal = orders.reduce((sum, order) => {
                return sum + parseFloat(order.totalAmount || order.total || 0);
            }, 0);
            
            // Format total with proper currency formatting
            const formattedTotal = `₹${grandTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
            
            // Draw total row with proper styling
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            
            // Background for total row
            doc.setFillColor(245, 245, 245);
            doc.rect(leftX, y - 2, pageWidth - margin * 2, 10, 'F');
            
            // Draw total label and value
            doc.text('Grand Total:', leftX + 10, y + 2);
            doc.text(formattedTotal, rightX, y + 2, { align: 'right' });
            
            // Add top border for total row
            doc.setDrawColor(220, 220, 220);
            doc.line(leftX, y - 2, pageWidth - margin, y - 2);
            y += 10;
            
            // Add footer
            doc.setFontSize(10);
            doc.setTextColor(108, 117, 125);
            doc.text('© Restaurant Management System', 
                pageWidth / 2, 
                pageHeight - 10, 
                { align: 'center' }
            );
            
            // Add page numbers if multiple pages
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text(
                    `Page ${i} of ${pageCount}`,
                    pageWidth - margin - 10,
                    pageHeight - margin + 5,
                    { align: 'right' }
                );
            }
            
            // Generate filename with timestamp
            const fname = now.toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).replace(/\//g, '').replace(/, /g, '_').replace(/:/g, '');
            
            // Save the PDF with appropriate name
            doc.save(`Order_History_${fname}.pdf`);
            
            // Generate and return the WhatsApp message
            if (orders.length === 1) {
                const whatsappMessage = generateWhatsAppMessage(orders[0]);
                console.log('WhatsApp Message:', whatsappMessage);
                // You can use this message to send via WhatsApp or display to the user
                return whatsappMessage;
            }
        }catch(e){
            console.error('PDF Export Error:', e);
            console.error('Error details:', {
                message: e.message,
                name: e.name,
                stack: e.stack
            });
            alert('Error generating PDF: ' + (e.message || 'Unknown error'));
        }
    };
    // Single click handler setup to prevent duplicates
    function setupExportButton() {
        const pdfBtn = document.getElementById('exportPdfBtn') || document.querySelector('[data-action="export-pdf"]');
        if (!pdfBtn) {
            console.warn('Export PDF button not found');
            return;
        }

        // Remove any existing click handlers to prevent duplicates
        const newBtn = pdfBtn.cloneNode(true);
        pdfBtn.parentNode.replaceChild(newBtn, pdfBtn);
        
        newBtn.addEventListener('click', async function exportHandler(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Prevent multiple clicks
            if (this.getAttribute('data-exporting') === 'true') return;
            this.setAttribute('data-exporting', 'true');
            
            const originalText = this.innerHTML;
            this.innerHTML = '<span class="spinner">🔄</span> Exporting...';
            this.disabled = true;
            
            try {
                const whatsappMessage = await exportToPDF();
                if (whatsappMessage) {
                    try {
                        await navigator.clipboard.writeText(whatsappMessage);
                        alert('Order details copied to clipboard! You can now paste it into WhatsApp.');
                    } catch (err) {
                        console.warn('Failed to copy to clipboard:', err);
                        // Show the message in a dialog if clipboard fails
                        const shouldCopy = confirm('Order exported successfully!\n\n' + 
                            'Here\'s the WhatsApp message:\n\n' + 
                            whatsappMessage + 
                            '\n\nPress OK to copy to clipboard');
                        
                        if (shouldCopy) {
                            const textarea = document.createElement('textarea');
                            textarea.value = whatsappMessage;
                            document.body.appendChild(textarea);
                            textarea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textarea);
                            alert('Message copied to clipboard!');
                        }
                    }
                }
            } catch (error) {
                console.error('PDF export failed:', error);
            } finally {
                this.disabled = false;
                this.innerHTML = originalText;
                this.removeAttribute('data-exporting');
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupExportButton);
    } else {
        setupExportButton();
    }
})();
