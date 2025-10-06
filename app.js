// Data storage
const entries = [];
const participants = new Set();
let currency = 'LKR';
let currencySymbol = '₨.';

// DOM elements
const entryForm = document.getElementById('entry-form');
const entriesList = document.getElementById('entries-list');
const participantsForm = document.getElementById('participants-form');
const participantsList = document.getElementById('participants-list');
const calculateBtn = document.getElementById('calculate-btn');
const resultsList = document.getElementById('results-list');
const payerSelect = document.getElementById('payer');
const currencyToggle = document.getElementById('currency-toggle');

// Currency toggle handler
if (currencyToggle) {
    currencyToggle.addEventListener('change', function() {
        currency = this.value;
        if (currency === 'LKR') currencySymbol = '₨.';
        else if (currency === 'USD') currencySymbol = '$';
        else if (currency === 'EUR') currencySymbol = '€';
        renderEntries();
        renderParticipants();
        // If results are visible, re-calculate
        if (resultsList.children.length > 0) calculateBtn.click();
    });
}

// Add entry

entryForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const description = document.getElementById('description').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const payer = payerSelect.value;
    if (!description || !amount || !payer) return;
    entries.push({ description, amount, payer });
    renderEntries();
    entryForm.reset();
    updatePayerDropdown(); // Reset dropdown to default
});

function renderEntries() {
    entriesList.innerHTML = '';
    entries.forEach((entry, idx) => {
        const li = document.createElement('li');
        if (entry._editing) {
            // Inline edit mode
            li.innerHTML = `
                <input type="text" class="edit-entry-desc" value="${entry.description}" style="width:90px;"> 
                <input type="number" class="edit-entry-amount" value="${entry.amount}" min="0.01" step="0.01" style="width:60px;"> 
                <select class="edit-entry-payer" style="width:auto;"></select>
                <span class="icon-btn save-entry-edit" title="Save">&#10003;</span>
                <span class="icon-btn cancel-entry-edit" title="Cancel">&#10005;</span>
            `;
            // Populate payer dropdown
            const select = li.querySelector('.edit-entry-payer');
            Array.from(participants).forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                if (name === entry.payer) opt.selected = true;
                select.appendChild(opt);
            });
            // Save handler
            li.querySelector('.save-entry-edit').addEventListener('click', function() {
                const newDesc = li.querySelector('.edit-entry-desc').value.trim();
                const newAmt = parseFloat(li.querySelector('.edit-entry-amount').value);
                const newPayer = li.querySelector('.edit-entry-payer').value;
                if (newDesc && newAmt && newPayer) {
                    entries[idx] = { description: newDesc, amount: newAmt, payer: newPayer };
                }
                delete entries[idx]._editing;
                renderEntries();
            });
            // Cancel handler
            li.querySelector('.cancel-entry-edit').addEventListener('click', function() {
                delete entries[idx]._editing;
                renderEntries();
            });
        } else {
            li.innerHTML = `
                <span>${entry.payer} paid ${currencySymbol}${entry.amount.toFixed(2)} for ${entry.description}</span>
                <span class="icon-btn edit-entry" title="Edit" data-idx="${idx}">&#9998;</span>
                <span class="icon-btn delete-entry" title="Delete" data-idx="${idx}">&#128465;</span>
            `;
        }
        entriesList.appendChild(li);
    });

    // Attach event listeners for delete
    entriesList.querySelectorAll('.delete-entry').forEach(btn => {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.getAttribute('data-idx'));
            entries.splice(idx, 1);
            renderEntries();
        });
    });
    // Attach event listeners for edit
    entriesList.querySelectorAll('.edit-entry').forEach(btn => {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.getAttribute('data-idx'));
            // Mark this entry as editing
            entries.forEach(e => delete e._editing);
            entries[idx]._editing = true;
            renderEntries();
        });
    });
}

// Add participant
participantsForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('participant-name').value.trim();
    if (!name || participants.has(name)) return;
    participants.add(name);
    renderParticipants();
    participantsForm.reset();
});


function renderParticipants() {
    participantsList.innerHTML = '';
    // Only one participant can be in edit mode at a time
    const editingName = participants._editingName;
    Array.from(participants).forEach(name => {
        const li = document.createElement('li');
        if (editingName === name) {
            // Inline edit mode
            li.innerHTML = `
                <input type="text" class="edit-participant-input" value="${name}">
                <span class="icon-btn save-participant-edit" title="Save">&#10003;</span>
                <span class="icon-btn cancel-participant-edit" title="Cancel">&#10005;</span>
            `;
        } else {
            li.innerHTML = `
                <span class="participant-name" data-name="${name}">${name}</span>
                <span class="icon-btn edit-participant" title="Edit" data-name="${name}">&#9998;</span>
                <span class="icon-btn delete-participant" title="Delete" data-name="${name}">&#128465;</span>
            `;
        }
        participantsList.appendChild(li);
    });
    updatePayerDropdown();

    // Attach event listeners for delete
    participantsList.querySelectorAll('.delete-participant').forEach(btn => {
        btn.addEventListener('click', function() {
            const name = this.getAttribute('data-name');
            participants.delete(name);
            // Remove entries for this participant
            for (let i = entries.length - 1; i >= 0; i--) {
                if (entries[i].payer === name) entries.splice(i, 1);
            }
            renderParticipants();
            renderEntries();
        });
    });

    // Inline edit for participant
    participantsList.querySelectorAll('.edit-participant').forEach(btn => {
        btn.addEventListener('click', function() {
            const oldName = this.getAttribute('data-name');
            participants._editingName = oldName;
            renderParticipants();
        });
    });
    // Save/cancel handlers for inline edit
    const saveBtn = participantsList.querySelector('.save-participant-edit');
    const cancelBtn = participantsList.querySelector('.cancel-participant-edit');
    const input = participantsList.querySelector('.edit-participant-input');
    if (input) {
        input.focus();
        function saveEdit() {
            const oldName = participants._editingName;
            const newName = input.value.trim();
            if (newName && newName !== oldName && !participants.has(newName)) {
                participants.delete(oldName);
                participants.add(newName);
                entries.forEach(entry => {
                    if (entry.payer === oldName) entry.payer = newName;
                });
            }
            delete participants._editingName;
            renderParticipants();
            renderEntries();
        }
        if (saveBtn) saveBtn.addEventListener('click', saveEdit);
        if (cancelBtn) cancelBtn.addEventListener('click', function() {
            delete participants._editingName;
            renderParticipants();
        });
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                saveEdit();
            } else if (e.key === 'Escape') {
                delete participants._editingName;
                renderParticipants();
            }
        });
    }
}

function updatePayerDropdown() {
    payerSelect.innerHTML = '<option value="" disabled selected>Select payer</option>';
    Array.from(participants).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        payerSelect.appendChild(option);
    });
}

// Calculate balances

let chartInstance = null;
calculateBtn.addEventListener('click', function() {
    resultsList.innerHTML = '';
    const summarySection = document.getElementById('summary-section');
    summarySection.innerHTML = '';
    if (participants.size === 0 || entries.length === 0) return;
    const totals = {};
    Array.from(participants).forEach(name => totals[name] = 0);
    let totalSpent = 0;
    entries.forEach(entry => {
        if (totals.hasOwnProperty(entry.payer)) {
            totals[entry.payer] += entry.amount;
            totalSpent += entry.amount;
        }
    });
    const share = totalSpent / participants.size;
    const balances = {};
    Object.keys(totals).forEach(name => {
        balances[name] = +(totals[name] - share).toFixed(2); // round to cents
    });

    // Prepare creditors and debtors
    const creditors = [];
    const debtors = [];
    Object.entries(balances).forEach(([name, balance]) => {
        if (balance > 0.01) creditors.push({ name, amount: balance });
        else if (balance < -0.01) debtors.push({ name, amount: -balance });
    });

    // Greedy settlement
    let i = 0, j = 0;
    const transactions = [];
    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];
        const payAmount = Math.min(debtor.amount, creditor.amount);
        transactions.push({ from: debtor.name, to: creditor.name, amount: payAmount });
        debtor.amount -= payAmount;
        creditor.amount -= payAmount;
        if (Math.abs(debtor.amount) < 0.01) i++;
        if (Math.abs(creditor.amount) < 0.01) j++;
    }

    if (transactions.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Everyone is settled up!';
        resultsList.appendChild(li);
    } else {
        transactions.forEach(tx => {
            const li = document.createElement('li');
            li.textContent = `${tx.from} needs to pay ${tx.to}: ${currencySymbol}${tx.amount.toFixed(2)}`;
            resultsList.appendChild(li);
        });
    }

    // Add summary
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'summary-box';
    summaryDiv.innerHTML = `
        <h3>Summary</h3>
        <p><strong>Total spent:</strong> ${currencySymbol}${totalSpent.toFixed(2)}</p>
        <p><strong>Each should pay:</strong> ${currencySymbol}${share.toFixed(2)}</p>
        <ul>
            ${Object.keys(balances).map(name => {
                let status = '';
                if (balances[name] > 0.01) status = `has owed ${currencySymbol}${balances[name].toFixed(2)}`;
                else if (balances[name] < -0.01) status = `owes ${currencySymbol}${(-balances[name]).toFixed(2)}`;
                else status = 'is settled up';
                return `<li><strong>${name}</strong> ${status}</li>`;
            }).join('')}
        </ul>
    `;
    summarySection.appendChild(summaryDiv);

    // Draw chart
    const ctx = document.getElementById('balancesChart').getContext('2d');
    const labels = Object.keys(balances);
    const data = Object.values(balances);
    const backgroundColors = data.map(v => v >= 0 ? 'rgba(33, 118, 174, 0.7)' : 'rgba(255, 99, 132, 0.7)');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Net Balance (${currencySymbol})`,
                data: data,
                backgroundColor: backgroundColors,
                borderRadius: 6,
            }]
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${currencySymbol}${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#e3f0ff' },
                    title: { display: true, text: `Net Balance (${currencySymbol})` }
                },
                x: {
                    grid: { color: '#f6fbff' }
                }
            }
        }
    });
});
