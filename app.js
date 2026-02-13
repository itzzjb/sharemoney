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
const currencyToggle = document.getElementById('currency-toggle');
const splitCheckboxes = document.getElementById('split-checkboxes');
const selectAllToggle = document.getElementById('select-all-toggle');
const payersList = document.getElementById('payers-list');
const splitPaymentBtn = document.getElementById('split-payment-btn');
const amountInput = document.getElementById('amount');

// Currency toggle handler
if (currencyToggle) {
    currencyToggle.addEventListener('change', function() {
        currency = this.value;
        if (currency === 'LKR') currencySymbol = '₨.';
        else if (currency === 'USD') currencySymbol = '$';
        else if (currency === 'EUR') currencySymbol = '€';
        renderEntries();
        renderParticipants();
        if (resultsList.children.length > 0) calculateBtn.click();
    });
}

// === Payers UI (multiple payers with amounts) ===

function renderPayersCheckboxes(container, selectedPayers, refAmountInput) {
    container.innerHTML = '';
    const names = Array.from(participants);
    if (names.length === 0) {
        container.innerHTML = '<span style="color:#888;font-size:0.88rem;">Add participants first</span>';
        return;
    }
    const amtRef = refAmountInput || amountInput;
    names.forEach(name => {
        const row = document.createElement('div');
        row.className = 'payer-row';

        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = name;
        cb.name = 'payer-cb';
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + name));

        const inp = document.createElement('input');
        inp.type = 'number';
        inp.placeholder = 'Amount';
        inp.min = '0.01';
        inp.step = '0.01';
        inp.className = 'payer-amount-input';
        inp.disabled = true;

        if (Array.isArray(selectedPayers)) {
            const match = selectedPayers.find(p => p.name === name);
            if (match) {
                cb.checked = true;
                inp.disabled = false;
                inp.value = match.amount;
            }
        }

        cb.addEventListener('change', function() {
            inp.disabled = !this.checked;
            if (!this.checked) inp.value = '';
            updatePayersTotal(container, amtRef);
        });
        inp.addEventListener('input', function() {
            updatePayersTotal(container, amtRef);
        });

        row.appendChild(label);
        row.appendChild(inp);
        container.appendChild(row);
    });

    const totalDiv = document.createElement('div');
    totalDiv.className = 'payers-total';
    container.appendChild(totalDiv);
    updatePayersTotal(container, amtRef);
}

function updatePayersTotal(container, amtRef) {
    const amounts = container.querySelectorAll('.payer-amount-input');
    let sum = 0;
    amounts.forEach(inp => {
        if (!inp.disabled && inp.value) sum += parseFloat(inp.value) || 0;
    });
    const totalDiv = container.querySelector('.payers-total');
    if (!totalDiv) return;
    const expenseAmt = parseFloat(amtRef ? amtRef.value : 0) || 0;
    const diff = +(expenseAmt - sum).toFixed(2);
    if (expenseAmt > 0 && Math.abs(diff) > 0.01) {
        totalDiv.className = 'payers-total error';
        totalDiv.textContent = `Payer total: ${currencySymbol}${sum.toFixed(2)} (${diff > 0 ? currencySymbol + diff.toFixed(2) + ' remaining' : currencySymbol + Math.abs(diff).toFixed(2) + ' over'})`;
    } else {
        totalDiv.className = 'payers-total';
        totalDiv.textContent = sum > 0 ? `Payer total: ${currencySymbol}${sum.toFixed(2)}` : '';
    }
}

function getSelectedPayers(container) {
    const rows = container.querySelectorAll('.payer-row');
    const payers = [];
    rows.forEach(row => {
        const cb = row.querySelector('input[type="checkbox"]');
        const amt = row.querySelector('.payer-amount-input');
        if (cb && cb.checked && amt && parseFloat(amt.value) > 0) {
            payers.push({ name: cb.value, amount: parseFloat(amt.value) });
        }
    });
    return payers;
}

function splitPaymentEqually(container, amtRef) {
    const total = parseFloat(amtRef.value) || 0;
    if (total <= 0) { alert('Enter the total amount first.'); return; }
    const rows = container.querySelectorAll('.payer-row');
    const checked = [];
    rows.forEach(r => {
        if (r.querySelector('input[type="checkbox"]').checked) checked.push(r);
    });
    if (checked.length === 0) { alert('Check at least one payer first.'); return; }
    const each = +(total / checked.length).toFixed(2);
    let remainder = +(total - each * checked.length).toFixed(2);
    checked.forEach((r, i) => {
        const a = r.querySelector('.payer-amount-input');
        a.value = (i === checked.length - 1) ? (each + remainder).toFixed(2) : each.toFixed(2);
    });
    updatePayersTotal(container, amtRef);
}

function updatePayersUI() {
    renderPayersCheckboxes(payersList, [], amountInput);
}

// Split payment equally button (main form)
if (splitPaymentBtn) {
    splitPaymentBtn.addEventListener('click', function() {
        splitPaymentEqually(payersList, amountInput);
    });
}

// Update payers total when expense amount changes
if (amountInput) {
    amountInput.addEventListener('input', function() {
        updatePayersTotal(payersList, amountInput);
    });
}

// === Split-among checkboxes ===

function renderSplitCheckboxes(container, selectedNames) {
    container.innerHTML = '';
    const names = Array.from(participants);
    if (names.length === 0) {
        container.innerHTML = '<span style="color:#888;font-size:0.88rem;">Add participants first</span>';
        return;
    }
    names.forEach(name => {
        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = name;
        cb.name = 'split-among';
        if (selectedNames === 'all' || (Array.isArray(selectedNames) && selectedNames.includes(name))) {
            cb.checked = true;
        }
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + name));
        container.appendChild(label);
    });
}

function updateSplitCheckboxesUI() {
    renderSplitCheckboxes(splitCheckboxes, 'all');
}

if (selectAllToggle) {
    selectAllToggle.addEventListener('click', function() {
        const boxes = splitCheckboxes.querySelectorAll('input[type="checkbox"]');
        const allChecked = Array.from(boxes).every(cb => cb.checked);
        boxes.forEach(cb => cb.checked = !allChecked);
        selectAllToggle.textContent = allChecked ? 'Select All' : 'Deselect All';
    });
}

function getSelectedSplit() {
    const boxes = splitCheckboxes.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(boxes).map(cb => cb.value);
}

// === Add entry ===

entryForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const description = document.getElementById('description').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const payers = getSelectedPayers(payersList);
    const splitAmong = getSelectedSplit();

    if (!description || !amount) return;
    if (payers.length === 0) {
        alert('Please select at least one payer and enter their amount.');
        return;
    }
    const payerTotal = payers.reduce((s, p) => s + p.amount, 0);
    if (Math.abs(payerTotal - amount) > 0.01) {
        alert(`Payer amounts (${currencySymbol}${payerTotal.toFixed(2)}) must equal the total (${currencySymbol}${amount.toFixed(2)}).`);
        return;
    }
    if (splitAmong.length === 0) {
        alert('Please select at least one person to split among.');
        return;
    }

    entries.push({ description, amount, payers, splitAmong });
    renderEntries();
    entryForm.reset();
    updatePayersUI();
    updateSplitCheckboxesUI();
});

// === Render entries ===

function renderEntries() {
    entriesList.innerHTML = '';
    entries.forEach((entry, idx) => {
        const li = document.createElement('li');
        // Normalize legacy entries (single payer string)
        const payers = entry.payers || [{ name: entry.payer, amount: entry.amount }];

        if (entry._editing) {
            li.innerHTML = `
                <input type="text" class="edit-entry-desc" value="${escHtml(entry.description)}">
                <input type="number" class="edit-entry-amount" value="${entry.amount}" min="0.01" step="0.01">
                <div class="payers-group edit-payers-group">
                    <div class="split-label">
                        <span>Paid by:</span>
                        <span class="select-all-link edit-split-pay-btn">Split equally</span>
                    </div>
                    <div class="payers-list edit-payers-list"></div>
                </div>
                <div class="split-among-group edit-split-group">
                    <div class="split-label">
                        <span>Split among:</span>
                        <span class="select-all-link edit-select-all">Select All</span>
                    </div>
                    <div class="split-checkboxes edit-split-checkboxes"></div>
                </div>
                <span class="icon-btn save-entry-edit" title="Save">&#10003;</span>
                <span class="icon-btn cancel-entry-edit" title="Cancel">&#10005;</span>
            `;

            const editAmtInput = li.querySelector('.edit-entry-amount');
            const editPayersContainer = li.querySelector('.edit-payers-list');

            // Render payers checkboxes with edit amount as reference
            renderPayersCheckboxes(editPayersContainer, payers, editAmtInput);

            // Wire amount change to update payers total
            editAmtInput.addEventListener('input', function() {
                updatePayersTotal(editPayersContainer, editAmtInput);
            });

            // Split equally button for edit
            const editSplitPayBtn = li.querySelector('.edit-split-pay-btn');
            if (editSplitPayBtn) {
                editSplitPayBtn.addEventListener('click', function() {
                    splitPaymentEqually(editPayersContainer, editAmtInput);
                });
            }

            // Split-among checkboxes
            const editSplitContainer = li.querySelector('.edit-split-checkboxes');
            renderSplitCheckboxes(editSplitContainer, entry.splitAmong || Array.from(participants));
            const editSelectAll = li.querySelector('.edit-select-all');
            if (editSelectAll) {
                editSelectAll.addEventListener('click', function() {
                    const boxes = editSplitContainer.querySelectorAll('input[type="checkbox"]');
                    const allChecked = Array.from(boxes).every(cb => cb.checked);
                    boxes.forEach(cb => cb.checked = !allChecked);
                    editSelectAll.textContent = allChecked ? 'Select All' : 'Deselect All';
                });
            }

            // Save
            li.querySelector('.save-entry-edit').addEventListener('click', function() {
                const newDesc = li.querySelector('.edit-entry-desc').value.trim();
                const newAmt = parseFloat(editAmtInput.value);
                const newPayers = getSelectedPayers(editPayersContainer);
                const newSplit = Array.from(editSplitContainer.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
                if (!newDesc || !newAmt || newPayers.length === 0 || newSplit.length === 0) return;
                const payerTotal = newPayers.reduce((s, p) => s + p.amount, 0);
                if (Math.abs(payerTotal - newAmt) > 0.01) {
                    alert('Payer amounts must equal the total.');
                    return;
                }
                entries[idx] = { description: newDesc, amount: newAmt, payers: newPayers, splitAmong: newSplit };
                renderEntries();
            });
            // Cancel
            li.querySelector('.cancel-entry-edit').addEventListener('click', function() {
                delete entries[idx]._editing;
                renderEntries();
            });

        } else {
            const splitNames = entry.splitAmong || Array.from(participants);
            const allParticipants = Array.from(participants);
            const isSplitAll = splitNames.length === allParticipants.length && allParticipants.every(n => splitNames.includes(n));
            const splitText = isSplitAll ? 'everyone' : splitNames.join(', ');

            let payerText;
            if (payers.length === 1) {
                payerText = `<strong>${escHtml(payers[0].name)}</strong> paid ${currencySymbol}${entry.amount.toFixed(2)}`;
            } else {
                const parts = payers.map(p => `${escHtml(p.name)}: ${currencySymbol}${p.amount.toFixed(2)}`);
                payerText = `Paid ${currencySymbol}${entry.amount.toFixed(2)} by ${parts.join(', ')}`;
            }

            li.innerHTML = `
                <span class="entry-text">
                    ${payerText} for <em>${escHtml(entry.description)}</em>
                    <span class="entry-meta">Split among: ${escHtml(splitText)}</span>
                </span>
                <span class="icon-btn edit-entry" title="Edit" data-idx="${idx}">&#9998;</span>
                <span class="icon-btn delete-entry" title="Delete" data-idx="${idx}">&#128465;</span>
            `;
        }
        entriesList.appendChild(li);
    });

    entriesList.querySelectorAll('.delete-entry').forEach(btn => {
        btn.addEventListener('click', function() {
            entries.splice(parseInt(this.getAttribute('data-idx')), 1);
            renderEntries();
        });
    });
    entriesList.querySelectorAll('.edit-entry').forEach(btn => {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.getAttribute('data-idx'));
            entries.forEach(e => delete e._editing);
            entries[idx]._editing = true;
            renderEntries();
        });
    });
}

function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// === Participants ===

participantsForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('participant-name').value.trim();
    if (!name || participants.has(name)) return;
    participants.add(name);
    renderParticipants();
    updateSplitCheckboxesUI();
    updatePayersUI();
    participantsForm.reset();
});

function renderParticipants() {
    participantsList.innerHTML = '';
    const editingName = participants._editingName;
    Array.from(participants).forEach(name => {
        const li = document.createElement('li');
        if (editingName === name) {
            li.innerHTML = `
                <input type="text" class="edit-participant-input" value="${escHtml(name)}">
                <span class="icon-btn save-participant-edit" title="Save">&#10003;</span>
                <span class="icon-btn cancel-participant-edit" title="Cancel">&#10005;</span>
            `;
        } else {
            li.innerHTML = `
                <span class="participant-name" data-name="${escHtml(name)}">${escHtml(name)}</span>
                <span class="icon-btn edit-participant" title="Edit" data-name="${escHtml(name)}">&#9998;</span>
                <span class="icon-btn delete-participant" title="Delete" data-name="${escHtml(name)}">&#128465;</span>
            `;
        }
        participantsList.appendChild(li);
    });

    // Delete participant
    participantsList.querySelectorAll('.delete-participant').forEach(btn => {
        btn.addEventListener('click', function() {
            const name = this.getAttribute('data-name');
            participants.delete(name);
            for (let i = entries.length - 1; i >= 0; i--) {
                const e = entries[i];
                if (e.payers) {
                    e.payers = e.payers.filter(p => p.name !== name);
                    if (e.payers.length === 0) { entries.splice(i, 1); continue; }
                    e.amount = e.payers.reduce((s, p) => s + p.amount, 0);
                } else if (e.payer === name) {
                    entries.splice(i, 1); continue;
                }
                if (e.splitAmong) {
                    e.splitAmong = e.splitAmong.filter(n => n !== name);
                }
            }
            renderParticipants();
            renderEntries();
            updateSplitCheckboxesUI();
            updatePayersUI();
        });
    });

    // Edit participant
    participantsList.querySelectorAll('.edit-participant').forEach(btn => {
        btn.addEventListener('click', function() {
            participants._editingName = this.getAttribute('data-name');
            renderParticipants();
        });
    });

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
                    if (entry.payers) {
                        entry.payers.forEach(p => { if (p.name === oldName) p.name = newName; });
                    }
                    if (entry.splitAmong) {
                        entry.splitAmong = entry.splitAmong.map(n => n === oldName ? newName : n);
                    }
                });
            }
            delete participants._editingName;
            renderParticipants();
            renderEntries();
            updateSplitCheckboxesUI();
            updatePayersUI();
        }
        if (saveBtn) saveBtn.addEventListener('click', saveEdit);
        if (cancelBtn) cancelBtn.addEventListener('click', function() {
            delete participants._editingName;
            renderParticipants();
        });
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') saveEdit();
            else if (e.key === 'Escape') { delete participants._editingName; renderParticipants(); }
        });
    }
}

// === Calculate balances (multi-payer + per-entry split) ===

let chartInstance = null;
calculateBtn.addEventListener('click', function() {
    resultsList.innerHTML = '';
    const summarySection = document.getElementById('summary-section');
    summarySection.innerHTML = '';
    if (participants.size === 0 || entries.length === 0) return;

    const paid = {};
    const owes = {};
    Array.from(participants).forEach(name => {
        paid[name] = 0;
        owes[name] = 0;
    });

    let totalSpent = 0;
    entries.forEach(entry => {
        const splitAmong = entry.splitAmong && entry.splitAmong.length > 0
            ? entry.splitAmong
            : Array.from(participants);
        const perPerson = entry.amount / splitAmong.length;

        // Handle multiple payers
        const payers = entry.payers || [{ name: entry.payer, amount: entry.amount }];
        payers.forEach(p => {
            if (paid.hasOwnProperty(p.name)) {
                paid[p.name] += p.amount;
            }
        });
        totalSpent += entry.amount;

        splitAmong.forEach(name => {
            if (owes.hasOwnProperty(name)) {
                owes[name] += perPerson;
            }
        });
    });

    const balances = {};
    Array.from(participants).forEach(name => {
        balances[name] = +(paid[name] - owes[name]).toFixed(2);
    });

    // Fix rounding: ensure balances sum to exactly 0
    const balanceSum = +Object.values(balances).reduce((a, b) => a + b, 0).toFixed(2);
    if (Math.abs(balanceSum) > 0.001 && Math.abs(balanceSum) < 1) {
        // Find the person with the largest absolute balance and adjust
        let maxName = null, maxAbs = 0;
        for (const [name, bal] of Object.entries(balances)) {
            if (Math.abs(bal) > maxAbs) { maxAbs = Math.abs(bal); maxName = name; }
        }
        if (maxName) {
            balances[maxName] = +(balances[maxName] - balanceSum).toFixed(2);
        }
    }

    const creditors = [];
    const debtors = [];
    Object.entries(balances).forEach(([name, balance]) => {
        if (balance > 0.01) creditors.push({ name, amount: balance });
        else if (balance < -0.01) debtors.push({ name, amount: -balance });
    });

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

    const avgShare = totalSpent / participants.size;
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'summary-box';
    summaryDiv.innerHTML = `
        <h3>Summary</h3>
        <p><strong>Total spent:</strong> ${currencySymbol}${totalSpent.toFixed(2)}</p>
        <p><strong>Average share:</strong> ${currencySymbol}${avgShare.toFixed(2)}</p>
        <ul>
            ${Object.keys(balances).map(name => {
                let status = '';
                if (balances[name] > 0.01) status = `is owed ${currencySymbol}${balances[name].toFixed(2)}`;
                else if (balances[name] < -0.01) status = `owes ${currencySymbol}${(-balances[name]).toFixed(2)}`;
                else status = 'is settled up';
                return `<li><strong>${escHtml(name)}</strong> ${status}</li>`;
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
            responsive: true,
            maintainAspectRatio: true,
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
