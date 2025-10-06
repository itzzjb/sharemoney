// Data storage
const entries = [];
const participants = new Set();

// DOM elements
const entryForm = document.getElementById('entry-form');
const entriesList = document.getElementById('entries-list');
const participantsForm = document.getElementById('participants-form');
const participantsList = document.getElementById('participants-list');
const calculateBtn = document.getElementById('calculate-btn');
const resultsList = document.getElementById('results-list');
const payerSelect = document.getElementById('payer');

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
        li.textContent = `${entry.payer} paid $${entry.amount.toFixed(2)} for ${entry.description}`;
        entriesList.appendChild(li);
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
    Array.from(participants).forEach(name => {
        const li = document.createElement('li');
        li.textContent = name;
        participantsList.appendChild(li);
    });
    updatePayerDropdown();
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
            li.textContent = `${tx.from} pays ${tx.to}: $${tx.amount.toFixed(2)}`;
            resultsList.appendChild(li);
        });
    }

    // Add summary
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'summary-box';
    summaryDiv.innerHTML = `
        <h3>Summary</h3>
        <p><strong>Total spent:</strong> $${totalSpent.toFixed(2)}</p>
        <p><strong>Each should pay:</strong> $${share.toFixed(2)}</p>
        <ul>
            ${Object.keys(balances).map(name => {
                let status = '';
                if (balances[name] > 0.01) status = `has owed $${balances[name].toFixed(2)}`;
                else if (balances[name] < -0.01) status = `owes $${(-balances[name]).toFixed(2)}`;
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
                label: 'Net Balance ($)',
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
                            return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#e3f0ff' },
                    title: { display: true, text: 'Net Balance ($)' }
                },
                x: {
                    grid: { color: '#f6fbff' }
                }
            }
        }
    });
});
