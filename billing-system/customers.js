// customers.js
// Load customers derived from saved bills in localStorage
// Requirements:
// 1. Each customer has id, name, contact (mobile)
// 2. Customer id does not exist in bills, so generate automatically.
//    We generate deterministic id based on contact number to keep it constant across reloads.
// 3. Avoid duplicates – uniqueness by contact.

(function(){
    function getModalElements(){
        const overlay = document.getElementById('modalOverlay');
        const win = overlay ? overlay.querySelector('.modal-window') : null;
        return {overlay, win};
    }
    function showModal(innerHTML){
        const {overlay, win} = getModalElements();
        if(!overlay||!win) return alert('Modal container missing');
        win.innerHTML = innerHTML;
        overlay.style.display = 'flex';
        overlay.classList.remove('hidden');
    }
    function hideModal(){
        const {overlay} = getModalElements();
        if(overlay){ overlay.style.display='none'; }
    }
    window.__custModal__ = {show:showModal, hide:hideModal};
    'use strict';

    let customers = [];

    // Utility: Generate deterministic customer ID from phone
    function generateCustomerId(phone){
        if(!phone) return 'CUST-UNKNOWN';
        // Remove non-digits
        const digits = phone.replace(/\D/g,'');
        // Use last 4 digits + simple hash for stability
        const hash = Array.from(digits).reduce((acc,ch)=> (acc + ch.charCodeAt(0)) % 997, 0);
        return `CUST-${digits.slice(-4)}-${hash}`;
    }

    function loadBills(){
        try{
            return JSON.parse(localStorage.getItem('bills') || '[]');
        }catch(e){
            console.error('Unable to parse bills from localStorage',e);
            return [];
        }
    }

    function buildCustomers(){
        const bills = loadBills();
        const seenContacts = new Set();
        customers = [];
        bills.forEach(bill => {
            const phone = bill.mobile || bill.mobileNumber || bill.contact || '';
            if(!phone) return; // skip if no phone
            if(seenContacts.has(phone)) return; // duplicate
            seenContacts.add(phone);
            const id = generateCustomerId(phone);
            // check if existing customer encountered earlier in loop to capture earliest timestamp
            const existing = customers.find(c=>c.contact===phone);
            const firstTs = bill.timestamp || bill.date || Date.now();
            if(existing){
                // maybe update earliest timestamp
                if(existing.firstTimestamp > firstTs) existing.firstTimestamp = firstTs;
            }else{
                customers.push({
                    id,
                    name: bill.customerName || 'Walk-in Customer',
                    contact: phone,
                    firstTimestamp: firstTs
                });
            }
        });
        // Persist customers to localStorage for quick future access / manual add
        localStorage.setItem('customers', JSON.stringify(customers));
    }

    function renderStats(){
        document.getElementById('totalCustomers').innerText = customers.length;
        // New customers (last 7 days) based on first bill timestamp
        const now = Date.now();
        const sevenDaysMs = 7*24*60*60*1000;
        let newCount = 0;
        let monthCount = 0;
        const curMonth = new Date().getMonth();
        customers.forEach(c=>{
            if(c.firstTimestamp && (now - c.firstTimestamp) <= sevenDaysMs){ newCount++; }
            if(c.firstTimestamp && new Date(c.firstTimestamp).getMonth() === curMonth){ monthCount++; }
        });
        document.getElementById('newCustomers').innerText = newCount;
        document.getElementById('monthCustomers').innerText = monthCount;
    }

    function renderTable(filterText=''){
        const tbody = document.querySelector('#customersTable tbody');
        tbody.innerHTML = '';
        let data = customers;
        if(filterText){
            const ft = filterText.toLowerCase();
            data = customers.filter(c => (c.name||'').toLowerCase().includes(ft) || (c.contact||'').includes(ft) || (c.id||'').toLowerCase().includes(ft));
        }
        if(data.length === 0){
            const tr = document.createElement('tr');
            tr.id = 'noData';
            tr.innerHTML = '<td colspan="4">No customers found</td>';
            tbody.appendChild(tr);
            return;
        }
        data.forEach(cust => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${cust.id}</td><td>${cust.name}</td><td>${cust.contact}</td><td>
                <button class="action-btn view" data-id="${cust.id}"><i class="fas fa-eye"></i></button>
                <button class="action-btn edit" data-id="${cust.id}"><i class="fas fa-pen"></i></button>
                <button class="action-btn delete" data-id="${cust.id}"><i class="fas fa-trash"></i></button>
            </td>`;
            tbody.appendChild(tr);
        });
        attachActionHandlers();
    }

    // View customer details - modal
function viewCustomer(id){
    const cust = customers.find(c=>c.id===id);
    if(!cust) return;
    window.__custModal__.show(`
        <div class="modal-header">Customer Details <button class="modal-close" onclick="__custModal__.hide()">&times;</button></div>
        <div>
            <p><strong>ID:</strong> ${cust.id}</p>
            <p><strong>Name:</strong> ${cust.name}</p>
            <p><strong>Contact:</strong> ${cust.contact}</p>
        </div>
        <div class="modal-actions">
            <button class="btn secondary" onclick="__custModal__.hide()">Close</button>
        </div>
    `);
}

// Edit customer via modal form
function editCustomer(id){
    const idx = customers.findIndex(c=>c.id===id);
    if(idx===-1) return;
    const cust = {...customers[idx]};
    window.__custModal__.show(`
        <div class="modal-header">Edit Customer <button class="modal-close" onclick="__custModal__.hide()">&times;</button></div>
        <div>
            <div style="margin-bottom:.8rem;">
                <label style="display:block;font-weight:600;font-size:.85rem;margin-bottom:.3rem;">Name</label>
                <input id="editName" type="text" value="${cust.name}" style="width:100%;padding:.6rem;border:1px solid #ccc;border-radius:6px;">
            </div>
            <div>
                <label style="display:block;font-weight:600;font-size:.85rem;margin-bottom:.3rem;">Contact</label>
                <input id="editContact" type="text" value="${cust.contact}" style="width:100%;padding:.6rem;border:1px solid #ccc;border-radius:6px;">
            </div>
        </div>
        <div class="modal-actions">
            <button class="btn secondary" onclick="__custModal__.hide()">Cancel</button>
            <button class="btn primary" id="saveCustBtn">Save</button>
        </div>
    `);
    document.getElementById('saveCustBtn').onclick = () => {
        const newName = document.getElementById('editName').value.trim();
        const newContact = document.getElementById('editContact').value.trim();
        if(!newName || !newContact){ alert('Name and Contact are required'); return; }
        if(customers.some(c=>c.contact===newContact && c.id!==id)){
            alert('A customer with this contact already exists.');
            return;
        }
        const oldContact = customers[idx].contact;
        customers[idx].name = newName;
        customers[idx].contact = newContact;
        if(oldContact !== newContact){
            customers[idx].id = generateCustomerId(newContact);
        }
        localStorage.setItem('customers', JSON.stringify(customers));
        renderStats();
        renderTable(document.getElementById('searchInput').value);
        __custModal__.hide();
    };
}

// Delete customer with confirmation modal
function deleteCustomer(id){
    const cust = customers.find(c=>c.id===id);
    if(!cust) return;
    window.__custModal__.show(`
        <div class="modal-header">Delete Customer <button class="modal-close" onclick="__custModal__.hide()">&times;</button></div>
        <p>Are you sure you want to delete <strong>${cust.name}</strong>?</p>
        <div class="modal-actions">
            <button class="btn secondary" onclick="__custModal__.hide()">Cancel</button>
            <button class="btn danger" id="confirmDeleteBtn">Delete</button>
        </div>
    `);
    document.getElementById('confirmDeleteBtn').onclick = () => {
        customers = customers.filter(c=>c.id!==id);
        localStorage.setItem('customers', JSON.stringify(customers));
        renderStats();
        renderTable(document.getElementById('searchInput').value);
        __custModal__.hide();
    };
}

function attachActionHandlers(){
    document.querySelectorAll('.action-btn.view').forEach(btn=>{
        btn.onclick = ()=> viewCustomer(btn.dataset.id);
    });
    document.querySelectorAll('.action-btn.edit').forEach(btn=>{
        btn.onclick = ()=> editCustomer(btn.dataset.id);
    });
    document.querySelectorAll('.action-btn.delete').forEach(btn=>{
        btn.onclick = ()=> deleteCustomer(btn.dataset.id);
    });
}

function exportCustomersCsv(){
        if(!customers || customers.length===0){ alert('No customers to export'); return; }
        const headers=['ID','Name','Contact'];
        const rows=customers.map(c=>[c.id,c.name,c.contact]);
        const csv=[headers.join(','),...rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
        const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
        const url=URL.createObjectURL(blob);
        const link=document.createElement('a');
        link.href=url;
        link.download=`customers_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    async function loadJsPDF(){
        if(window.jspdf?.jsPDF) return;
        return new Promise((res,rej)=>{
            const s=document.createElement('script');
            s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            s.onload=()=>res();
            s.onerror=()=>rej(new Error('Failed to load jsPDF'));
            document.head.appendChild(s);
        });
    }

    async function exportCustomersPdf(){
        if(!customers || customers.length===0){ alert('No customers to export'); return; }
        // Ensure jsPDF
        if(!window.jspdf?.jsPDF){
            try{ await loadJsPDF(); }catch(e){ alert('Failed to load PDF library'); return; }
        }
        const {jsPDF}=window.jspdf;
        // Ensure AutoTable plugin
        if(!jsPDF.API.autoTable){
            await new Promise((res,rej)=>{
                const s=document.createElement('script');
                s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
                s.onload=()=>res();
                s.onerror=()=>rej(new Error('Failed to load autoTable'));
                document.head.appendChild(s);
            });
            if(!jsPDF.API.autoTable){ alert('Failed to load table plugin'); return; }
        }

        // Prepare data
        const rows = customers.map(c=>[c.id,c.name,c.contact]);

        const doc = new jsPDF('p','pt');
        const margin = 40;
        // Title
        doc.setFontSize(16);
        doc.text('Customer List', doc.internal.pageSize.getWidth()/2, margin, {align:'center'});
        doc.setFontSize(10);
        doc.text(`Exported: ${new Date().toLocaleString()}`, margin, margin+15);
        doc.text(`Total customers: ${customers.length}`, doc.internal.pageSize.getWidth()-margin, margin+15, {align:'right'});

        // Table
        doc.autoTable({
            head:[['ID','Name','Contact']],
            body: rows,
            startY: margin+30,
            theme:'grid',
            styles:{fontSize:9,cellPadding:4},
            headStyles:{fillColor:[63,81,181], halign:'center',textColor:255},
            columnStyles:{0:{cellWidth:100},1:{cellWidth:200},2:{cellWidth:140}}
        });

        doc.save(`customers_${new Date().toISOString().replace(/[:.]/g,'-')}.pdf`);
    }


    function init(){
        // attach export listeners (ensure buttons are present)
        document.getElementById('exportCustCsv')?.addEventListener('click', exportCustomersCsv);
        document.getElementById('exportCustPdf')?.addEventListener('click', exportCustomersPdf);

        buildCustomers();
        renderStats();
        renderTable();

        // Search listener
        document.getElementById('searchInput').addEventListener('input', e=>{
            renderTable(e.target.value);
        });
    }

    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', init);
    }else{
                init();
    }
})();
