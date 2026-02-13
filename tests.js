/**
 * ShareMoney - Comprehensive Logic Tests
 * Run with: node tests.js
 */

// ============================================================
// Extract the pure calculation logic (same as app.js)
// ============================================================

function calculateBalances(participantNames, testEntries) {
    const paid = {};
    const owes = {};
    participantNames.forEach(name => {
        paid[name] = 0;
        owes[name] = 0;
    });

    let totalSpent = 0;
    testEntries.forEach(entry => {
        const splitAmong = entry.splitAmong && entry.splitAmong.length > 0
            ? entry.splitAmong
            : participantNames;
        const perPerson = entry.amount / splitAmong.length;

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
    participantNames.forEach(name => {
        balances[name] = +(paid[name] - owes[name]).toFixed(2);
    });

    // Fix rounding: ensure balances sum to exactly 0
    const balanceSum = +Object.values(balances).reduce((a, b) => a + b, 0).toFixed(2);
    if (Math.abs(balanceSum) > 0.001 && Math.abs(balanceSum) < 1) {
        let maxName = null, maxAbs = 0;
        for (const [name, bal] of Object.entries(balances)) {
            if (Math.abs(bal) > maxAbs) { maxAbs = Math.abs(bal); maxName = name; }
        }
        if (maxName) {
            balances[maxName] = +(balances[maxName] - balanceSum).toFixed(2);
        }
    }

    // Settlement
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
        transactions.push({ from: debtor.name, to: creditor.name, amount: +payAmount.toFixed(2) });
        debtor.amount -= payAmount;
        creditor.amount -= payAmount;
        if (Math.abs(debtor.amount) < 0.01) i++;
        if (Math.abs(creditor.amount) < 0.01) j++;
    }

    return { paid, owes, balances, transactions, totalSpent };
}

// ============================================================
// Test helpers
// ============================================================

let testCount = 0;
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    testCount++;
    if (condition) {
        passCount++;
        console.log(`  ✅ ${message}`);
    } else {
        failCount++;
        console.log(`  ❌ FAIL: ${message}`);
    }
}

function assertClose(actual, expected, message, tolerance = 0.02) {
    testCount++;
    if (Math.abs(actual - expected) <= tolerance) {
        passCount++;
        console.log(`  ✅ ${message} (got ${actual}, expected ${expected})`);
    } else {
        failCount++;
        console.log(`  ❌ FAIL: ${message} (got ${actual}, expected ${expected})`);
    }
}

function assertBalancesZero(balances, message) {
    const sum = Object.values(balances).reduce((a, b) => a + b, 0);
    testCount++;
    if (Math.abs(sum) <= 0.02) {
        passCount++;
        console.log(`  ✅ ${message} (sum=${sum.toFixed(4)})`);
    } else {
        failCount++;
        console.log(`  ❌ FAIL: ${message} (sum=${sum.toFixed(4)}, should be ~0)`);
    }
}

function assertSettlementBalanced(transactions, balances, message) {
    // Verify: total paid in settlements ≈ total owed
    const totalDebt = Object.values(balances).filter(v => v < -0.01).reduce((s, v) => s + Math.abs(v), 0);
    const totalSettled = transactions.reduce((s, t) => s + t.amount, 0);
    testCount++;
    if (Math.abs(totalDebt - totalSettled) <= 0.02) {
        passCount++;
        console.log(`  ✅ ${message} (settled=${totalSettled.toFixed(2)}, debts=${totalDebt.toFixed(2)})`);
    } else {
        failCount++;
        console.log(`  ❌ FAIL: ${message} (settled=${totalSettled.toFixed(2)}, debts=${totalDebt.toFixed(2)})`);
    }
}

// ============================================================
// TEST SCENARIOS
// ============================================================

console.log('\n========================================');
console.log('SCENARIO 1: Screenshot scenario');
console.log('Januda+Bethmin pay 100 for Food (split 4-way)');
console.log('Vinuki+Vinumi pay 200 for Drinks (split among Bethmin,Vinuki,Vinumi)');
console.log('========================================\n');
{
    const names = ['Januda', 'Bethmin', 'Vinuki', 'Vinumi'];
    const entries = [
        {
            description: 'Food', amount: 100,
            payers: [{ name: 'Januda', amount: 50 }, { name: 'Bethmin', amount: 50 }],
            splitAmong: ['Januda', 'Bethmin', 'Vinuki', 'Vinumi']
        },
        {
            description: 'Drinks', amount: 200,
            payers: [{ name: 'Vinuki', amount: 150 }, { name: 'Vinumi', amount: 50 }],
            splitAmong: ['Bethmin', 'Vinuki', 'Vinumi']
        }
    ];
    const r = calculateBalances(names, entries);
    console.log('Paid:', r.paid);
    console.log('Owes:', r.owes);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    // Manual calculation:
    // Entry 1: 100/4 = 25 per person. Januda paid 50, Bethmin paid 50
    //   Januda: +50-25 = +25, Bethmin: +50-25 = +25, Vinuki: 0-25 = -25, Vinumi: 0-25 = -25
    // Entry 2: 200/3 = 66.67 per person. Vinuki paid 150, Vinumi paid 50
    //   Bethmin: 0-66.67 = -66.67, Vinuki: 150-66.67 = +83.33, Vinumi: 50-66.67 = -16.67
    // Combined:
    //   Januda: +25, Bethmin: +25-66.67=-41.67, Vinuki: -25+83.33=+58.33, Vinumi: -25-16.67=-41.67

    assertClose(r.balances['Januda'], 25.00, 'Januda balance should be +25.00');
    assertClose(r.balances['Bethmin'], -41.67, 'Bethmin balance should be -41.67');
    assertClose(r.balances['Vinuki'], 58.33, 'Vinuki balance should be +58.33');
    assertClose(r.balances['Vinumi'], -41.67, 'Vinumi balance should be -41.67');
    assertBalancesZero(r.balances, 'Sum of balances should be ~0');
    assertSettlementBalanced(r.transactions, r.balances, 'Settlements should cover all debts');

    // Verify no one pays themselves or pays someone who owes
    r.transactions.forEach(t => {
        assert(t.from !== t.to, `No self-payment: ${t.from} → ${t.to}`);
        assert(r.balances[t.from] < -0.01, `${t.from} should be a debtor`);
        assert(r.balances[t.to] > 0.01, `${t.to} should be a creditor`);
    });
}

console.log('\n========================================');
console.log('SCENARIO 2: Simple equal split, single payer');
console.log('Alice pays 90 for dinner, split among Alice, Bob, Charlie');
console.log('========================================\n');
{
    const names = ['Alice', 'Bob', 'Charlie'];
    const entries = [
        {
            description: 'Dinner', amount: 90,
            payers: [{ name: 'Alice', amount: 90 }],
            splitAmong: ['Alice', 'Bob', 'Charlie']
        }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    assertClose(r.balances['Alice'], 60.00, 'Alice is owed 60');
    assertClose(r.balances['Bob'], -30.00, 'Bob owes 30');
    assertClose(r.balances['Charlie'], -30.00, 'Charlie owes 30');
    assertBalancesZero(r.balances, 'Balances sum to 0');
    assert(r.transactions.length === 2, 'Should have 2 transactions');
}

console.log('\n========================================');
console.log('SCENARIO 3: Two payers split payment, split among all');
console.log('Alice pays 60, Bob pays 40 for a 100 meal, split 3-way');
console.log('========================================\n');
{
    const names = ['Alice', 'Bob', 'Charlie'];
    const entries = [
        {
            description: 'Meal', amount: 100,
            payers: [{ name: 'Alice', amount: 60 }, { name: 'Bob', amount: 40 }],
            splitAmong: ['Alice', 'Bob', 'Charlie']
        }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    // Per person: 100/3 = 33.33
    // Alice: 60 - 33.33 = +26.67
    // Bob: 40 - 33.33 = +6.67
    // Charlie: 0 - 33.33 = -33.33
    assertClose(r.balances['Alice'], 26.67, 'Alice is owed 26.67');
    assertClose(r.balances['Bob'], 6.67, 'Bob is owed 6.67');
    assertClose(r.balances['Charlie'], -33.33, 'Charlie owes 33.33');
    assertBalancesZero(r.balances, 'Balances sum to 0');

    // Charlie should pay Alice 26.67 and Bob 6.67 (or similar)
    assertSettlementBalanced(r.transactions, r.balances, 'Settlement covers all debts');
}

console.log('\n========================================');
console.log('SCENARIO 4: Payer not in split');
console.log('Alice pays 100 for Bob and Charlie only (not herself)');
console.log('========================================\n');
{
    const names = ['Alice', 'Bob', 'Charlie'];
    const entries = [
        {
            description: 'Gift', amount: 100,
            payers: [{ name: 'Alice', amount: 100 }],
            splitAmong: ['Bob', 'Charlie']
        }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    // Alice paid 100, owes 0 → +100
    // Bob paid 0, owes 50 → -50
    // Charlie paid 0, owes 50 → -50
    assertClose(r.balances['Alice'], 100, 'Alice is owed 100');
    assertClose(r.balances['Bob'], -50, 'Bob owes 50');
    assertClose(r.balances['Charlie'], -50, 'Charlie owes 50');
    assertBalancesZero(r.balances, 'Balances sum to 0');
    assertSettlementBalanced(r.transactions, r.balances, 'Settlement covers all debts');
}

console.log('\n========================================');
console.log('SCENARIO 5: Everyone pays for themselves');
console.log('Each person pays their own share — should settle up');
console.log('========================================\n');
{
    const names = ['Alice', 'Bob'];
    const entries = [
        {
            description: 'Alice food', amount: 50,
            payers: [{ name: 'Alice', amount: 50 }],
            splitAmong: ['Alice']
        },
        {
            description: 'Bob food', amount: 50,
            payers: [{ name: 'Bob', amount: 50 }],
            splitAmong: ['Bob']
        }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    assertClose(r.balances['Alice'], 0, 'Alice is settled');
    assertClose(r.balances['Bob'], 0, 'Bob is settled');
    assert(r.transactions.length === 0, 'No transactions needed');
}

console.log('\n========================================');
console.log('SCENARIO 6: 3-way split with rounding (worst case)');
console.log('100 / 3 people = 33.33... each');
console.log('========================================\n');
{
    const names = ['A', 'B', 'C'];
    const entries = [
        {
            description: 'Test', amount: 100,
            payers: [{ name: 'A', amount: 100 }],
            splitAmong: ['A', 'B', 'C']
        }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    // 100/3 = 33.333...
    // A: 100 - 33.33 = +66.67
    // B: 0 - 33.33 = -33.33
    // C: 0 - 33.33 = -33.33
    assertClose(r.balances['A'], 66.67, 'A is owed ~66.67');
    assertClose(r.balances['B'], -33.33, 'B owes ~33.33');
    assertClose(r.balances['C'], -33.33, 'C owes ~33.33');
    assertBalancesZero(r.balances, 'Balances sum to ~0');
    assertSettlementBalanced(r.transactions, r.balances, 'Settlement covers all debts');
}

console.log('\n========================================');
console.log('SCENARIO 7: Multiple entries, multiple payers, partial splits');
console.log('Complex real-world scenario with 5 people');
console.log('========================================\n');
{
    const names = ['A', 'B', 'C', 'D', 'E'];
    const entries = [
        {
            description: 'Lunch', amount: 150,
            payers: [{ name: 'A', amount: 100 }, { name: 'B', amount: 50 }],
            splitAmong: ['A', 'B', 'C', 'D', 'E']  // 30 each
        },
        {
            description: 'Taxi', amount: 40,
            payers: [{ name: 'C', amount: 40 }],
            splitAmong: ['A', 'C']  // 20 each
        },
        {
            description: 'Movie', amount: 60,
            payers: [{ name: 'D', amount: 30 }, { name: 'E', amount: 30 }],
            splitAmong: ['B', 'C', 'D', 'E']  // 15 each
        }
    ];
    const r = calculateBalances(names, entries);
    console.log('Paid:', r.paid);
    console.log('Owes:', r.owes);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    // Manual:
    // Entry 1 (150, split 5): per=30. A paid 100, B paid 50
    //   A: +100-30=+70, B: +50-30=+20, C: -30, D: -30, E: -30
    // Entry 2 (40, split A,C): per=20. C paid 40
    //   A: -20, C: +40-20=+20
    // Entry 3 (60, split B,C,D,E): per=15. D paid 30, E paid 30
    //   B: -15, C: -15, D: +30-15=+15, E: +30-15=+15
    // Combined:
    //   A: 70-20 = +50
    //   B: 20-15 = +5
    //   C: -30+20-15 = -25
    //   D: -30+15 = -15
    //   E: -30+15 = -15

    assertClose(r.balances['A'], 50, 'A balance is +50');
    assertClose(r.balances['B'], 5, 'B balance is +5');
    assertClose(r.balances['C'], -25, 'C balance is -25');
    assertClose(r.balances['D'], -15, 'D balance is -15');
    assertClose(r.balances['E'], -15, 'E balance is -15');
    assertBalancesZero(r.balances, 'Balances sum to 0');
    assertSettlementBalanced(r.transactions, r.balances, 'Settlement covers all debts');
}

console.log('\n========================================');
console.log('SCENARIO 8: One person pays everything');
console.log('========================================\n');
{
    const names = ['Boss', 'Worker1', 'Worker2', 'Worker3'];
    const entries = [
        {
            description: 'Team lunch', amount: 400,
            payers: [{ name: 'Boss', amount: 400 }],
            splitAmong: ['Boss', 'Worker1', 'Worker2', 'Worker3']
        }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    assertClose(r.balances['Boss'], 300, 'Boss is owed 300');
    assertClose(r.balances['Worker1'], -100, 'Worker1 owes 100');
    assertClose(r.balances['Worker2'], -100, 'Worker2 owes 100');
    assertClose(r.balances['Worker3'], -100, 'Worker3 owes 100');
    assert(r.transactions.length === 3, '3 transactions');
    assertSettlementBalanced(r.transactions, r.balances, 'Settlement covers all debts');
}

console.log('\n========================================');
console.log('SCENARIO 9: Two people share equally, split equally');
console.log('========================================\n');
{
    const names = ['X', 'Y'];
    const entries = [
        {
            description: 'Coffee', amount: 10,
            payers: [{ name: 'X', amount: 5 }, { name: 'Y', amount: 5 }],
            splitAmong: ['X', 'Y']
        }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('');

    assertClose(r.balances['X'], 0, 'X is settled');
    assertClose(r.balances['Y'], 0, 'Y is settled');
    assert(r.transactions.length === 0, 'No transactions needed');
}

console.log('\n========================================');
console.log('SCENARIO 10: Uneven multi-payer, uneven split');
console.log('A pays 70, B pays 30 for 100. Split: A=40, B=30, C=30');
console.log('(custom split amounts not supported — even split only)');
console.log('========================================\n');
{
    // Since app only supports even split, 100/3 = 33.33 each
    const names = ['A', 'B', 'C'];
    const entries = [
        {
            description: 'Dinner', amount: 100,
            payers: [{ name: 'A', amount: 70 }, { name: 'B', amount: 30 }],
            splitAmong: ['A', 'B', 'C']
        }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    // 100/3 = 33.33 each
    // A: 70 - 33.33 = +36.67
    // B: 30 - 33.33 = -3.33
    // C: 0 - 33.33 = -33.33
    assertClose(r.balances['A'], 36.67, 'A is owed ~36.67');
    assertClose(r.balances['B'], -3.33, 'B owes ~3.33');
    assertClose(r.balances['C'], -33.33, 'C owes ~33.33');
    assertBalancesZero(r.balances, 'Balances sum to 0');
    assertSettlementBalanced(r.transactions, r.balances, 'Settlement covers all debts');
}

console.log('\n========================================');
console.log('SCENARIO 11: Multiple entries cancelling out');
console.log('A pays 50 for B, then B pays 50 for A');
console.log('========================================\n');
{
    const names = ['A', 'B'];
    const entries = [
        {
            description: 'E1', amount: 50,
            payers: [{ name: 'A', amount: 50 }],
            splitAmong: ['A', 'B']
        },
        {
            description: 'E2', amount: 50,
            payers: [{ name: 'B', amount: 50 }],
            splitAmong: ['A', 'B']
        }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('');

    assertClose(r.balances['A'], 0, 'A is settled');
    assertClose(r.balances['B'], 0, 'B is settled');
    assert(r.transactions.length === 0, 'No transactions needed');
}

console.log('\n========================================');
console.log('SCENARIO 12: Large group with 3-way rounding stress test');
console.log('7 people, amount 100 → 100/7 = 14.285714...');
console.log('========================================\n');
{
    const names = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
    const entries = [
        {
            description: 'Party', amount: 100,
            payers: [{ name: 'P1', amount: 100 }],
            splitAmong: names
        }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    // 100/7 = 14.2857... each
    // P1: 100 - 14.29 = +85.71, then rounding fix adjusts to 85.74
    // Others: 0 - 14.29 = -14.29 each
    assertClose(r.balances['P1'], 85.74, 'P1 is owed ~85.74 (rounding-adjusted)');
    assertBalancesZero(r.balances, 'Balances sum to ~0');
    assertSettlementBalanced(r.transactions, r.balances, 'Settlement covers all debts');
}

console.log('\n========================================');
console.log('SCENARIO 13: Three payers for one expense');
console.log('A pays 40, B pays 35, C pays 25 for 100. Split among A,B,C,D');
console.log('========================================\n');
{
    const names = ['A', 'B', 'C', 'D'];
    const entries = [
        {
            description: 'Hotel', amount: 100,
            payers: [
                { name: 'A', amount: 40 },
                { name: 'B', amount: 35 },
                { name: 'C', amount: 25 }
            ],
            splitAmong: ['A', 'B', 'C', 'D']
        }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    // 100/4 = 25 each
    // A: 40 - 25 = +15
    // B: 35 - 25 = +10
    // C: 25 - 25 = 0
    // D: 0 - 25 = -25
    assertClose(r.balances['A'], 15, 'A is owed 15');
    assertClose(r.balances['B'], 10, 'B is owed 10');
    assertClose(r.balances['C'], 0, 'C is settled');
    assertClose(r.balances['D'], -25, 'D owes 25');
    assertBalancesZero(r.balances, 'Balances sum to 0');
    // D should pay A 15 and B 10
    assertSettlementBalanced(r.transactions, r.balances, 'Settlement covers all debts');
}

console.log('\n========================================');
console.log('SCENARIO 14: Penny rounding stress — many 3-way splits');
console.log('========================================\n');
{
    const names = ['A', 'B', 'C'];
    const entries = [];
    // 10 entries of 10 each, 3-way split → 3.33 per person per entry
    for (let i = 0; i < 10; i++) {
        entries.push({
            description: `E${i}`, amount: 10,
            payers: [{ name: 'A', amount: 10 }],
            splitAmong: ['A', 'B', 'C']
        });
    }
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    // A paid 100, owes 100/3*10 = 33.33 per entry... total owes 33.33
    // Actually: A paid 100 total. Each entry 10/3 = 3.333... per person.
    // 10 entries: A owes 10 * 3.333... = 33.333...  → rounds to 33.33
    // B owes 33.33, C owes 33.33
    // A: 100 - 33.33 = +66.67
    // B: 0 - 33.33 = -33.33
    // C: 0 - 33.33 = -33.33
    assertClose(r.balances['A'], 66.67, 'A owed ~66.67');
    assertClose(r.balances['B'], -33.33, 'B owes ~33.33');
    assertClose(r.balances['C'], -33.33, 'C owes ~33.33');
    assertBalancesZero(r.balances, 'Balances sum to ~0');
    assertSettlementBalanced(r.transactions, r.balances, 'Settlement covers all debts');
}

console.log('\n========================================');
console.log('SCENARIO 15: Legacy single-payer format compatibility');
console.log('Entry with `payer` string instead of `payers` array');
console.log('========================================\n');
{
    const names = ['Alice', 'Bob'];
    const entries = [
        {
            description: 'Old format', amount: 80,
            payer: 'Alice',  // legacy format
            splitAmong: ['Alice', 'Bob']
        }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    assertClose(r.balances['Alice'], 40, 'Alice is owed 40');
    assertClose(r.balances['Bob'], -40, 'Bob owes 40');
    assert(r.transactions.length === 1, '1 transaction');
}

console.log('\n========================================');
console.log('SCENARIO 16: All payers pay but none in split');
console.log('A and B pay 100, split only among C and D');
console.log('========================================\n');
{
    const names = ['A', 'B', 'C', 'D'];
    const entries = [
        {
            description: 'Gift', amount: 100,
            payers: [{ name: 'A', amount: 60 }, { name: 'B', amount: 40 }],
            splitAmong: ['C', 'D']
        }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    // A: +60, B: +40, C: -50, D: -50
    assertClose(r.balances['A'], 60, 'A is owed 60');
    assertClose(r.balances['B'], 40, 'B is owed 40');
    assertClose(r.balances['C'], -50, 'C owes 50');
    assertClose(r.balances['D'], -50, 'D owes 50');
    assertBalancesZero(r.balances, 'Balances sum to 0');
    assertSettlementBalanced(r.transactions, r.balances, 'Settlement covers all debts');
}

// ============================================================
// ADDITIONAL EDGE-CASE SCENARIOS
// ============================================================

console.log('\n========================================');
console.log('SCENARIO 17: Single participant (self-expense)');
console.log('Only Alice, pays 50, split with herself');
console.log('========================================\n');
{
    const names = ['Alice'];
    const entries = [
        { description: 'Solo', amount: 50, payers: [{ name: 'Alice', amount: 50 }], splitAmong: ['Alice'] }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    assert(r.balances['Alice'] === 0, 'Alice owes nothing (paid = owed)');
    assert(r.transactions.length === 0, 'No transactions needed');
}

console.log('\n========================================');
console.log('SCENARIO 18: No entries at all');
console.log('3 participants, zero expenses');
console.log('========================================\n');
{
    const names = ['A', 'B', 'C'];
    const entries = [];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    assert(r.balances['A'] === 0, 'A balance is 0');
    assert(r.balances['B'] === 0, 'B balance is 0');
    assert(r.balances['C'] === 0, 'C balance is 0');
    assert(r.transactions.length === 0, 'No transactions');
    assert(r.totalSpent === 0, 'Total spent is 0');
}

console.log('\n========================================');
console.log('SCENARIO 19: Zero-amount expense');
console.log('A pays 0 for a free item, split among A and B');
console.log('========================================\n');
{
    const names = ['A', 'B'];
    const entries = [
        { description: 'Freebie', amount: 0, payers: [{ name: 'A', amount: 0 }], splitAmong: ['A', 'B'] }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    assert(r.balances['A'] === 0, 'A balance is 0');
    assert(r.balances['B'] === 0, 'B balance is 0');
    assert(r.transactions.length === 0, 'No transactions needed');
}

console.log('\n========================================');
console.log('SCENARIO 20: Very large amount (precision test)');
console.log('A pays 999999.99, split among 3');
console.log('========================================\n');
{
    const names = ['A', 'B', 'C'];
    const entries = [
        { description: 'Mansion', amount: 999999.99, payers: [{ name: 'A', amount: 999999.99 }], splitAmong: ['A', 'B', 'C'] }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    // 999999.99 / 3 = 333333.33
    // A: 999999.99 - 333333.33 = 666666.66
    assertClose(r.balances['A'], 666666.66, 'A is owed ~666666.66');
    assertClose(r.balances['B'], -333333.33, 'B owes ~333333.33');
    assertClose(r.balances['C'], -333333.33, 'C owes ~333333.33');
    assertBalancesZero(r.balances, 'Balances sum to ~0');
    assertSettlementBalanced(r.transactions, r.balances, 'Settlement covers all debts');
}

console.log('\n========================================');
console.log('SCENARIO 21: Payer overpays (payer total > entry amount)');
console.log('Entry is 100 but A says they paid 60, B says 60 = 120 total');
console.log('========================================\n');
{
    const names = ['A', 'B', 'C'];
    const entries = [
        {
            description: 'Overpay', amount: 100,
            payers: [{ name: 'A', amount: 60 }, { name: 'B', amount: 60 }],
            splitAmong: ['A', 'B', 'C']
        }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    // paid: A=60, B=60.  owes: 100/3 = 33.33 each
    // A: 60-33.33=26.67, B: 60-33.33=26.67, C: 0-33.33=-33.33
    // Sum of balances = 26.67+26.67-33.33 = 20.01 (non-zero because payers overpaid)
    // The logic still produces balances — this is a data integrity edge case
    // Verify it doesn't crash and produces some output
    assert(typeof r.balances['A'] === 'number', 'A has numeric balance');
    assert(typeof r.balances['B'] === 'number', 'B has numeric balance');
    assert(typeof r.balances['C'] === 'number', 'C has numeric balance');
    assert(r.balances['C'] < 0, 'C still owes money');
}

console.log('\n========================================');
console.log('SCENARIO 22: Circular debts that simplify');
console.log('A pays 90 split A,B,C; B pays 90 split A,B,C; C pays 90 split A,B,C');
console.log('========================================\n');
{
    const names = ['A', 'B', 'C'];
    const entries = [
        { description: 'Lunch', amount: 90, payers: [{ name: 'A', amount: 90 }], splitAmong: ['A', 'B', 'C'] },
        { description: 'Dinner', amount: 90, payers: [{ name: 'B', amount: 90 }], splitAmong: ['A', 'B', 'C'] },
        { description: 'Drinks', amount: 90, payers: [{ name: 'C', amount: 90 }], splitAmong: ['A', 'B', 'C'] }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    // Each paid 90, each owes 30*3 = 90 → all balanced
    assert(r.balances['A'] === 0, 'A is settled');
    assert(r.balances['B'] === 0, 'B is settled');
    assert(r.balances['C'] === 0, 'C is settled');
    assert(r.transactions.length === 0, 'No transactions needed');
}

console.log('\n========================================');
console.log('SCENARIO 23: Asymmetric circular debts');
console.log('A pays 60 for B; B pays 90 for C; C pays 30 for A');
console.log('========================================\n');
{
    const names = ['A', 'B', 'C'];
    const entries = [
        { description: 'Gift1', amount: 60, payers: [{ name: 'A', amount: 60 }], splitAmong: ['B'] },
        { description: 'Gift2', amount: 90, payers: [{ name: 'B', amount: 90 }], splitAmong: ['C'] },
        { description: 'Gift3', amount: 30, payers: [{ name: 'C', amount: 30 }], splitAmong: ['A'] }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    // paid: A=60, B=90, C=30.  owes: A=30, B=60, C=90
    // A: 60-30=30, B: 90-60=30, C: 30-90=-60
    assert(r.balances['A'] === 30, 'A is owed 30');
    assert(r.balances['B'] === 30, 'B is owed 30');
    assert(r.balances['C'] === -60, 'C owes 60');
    assertBalancesZero(r.balances, 'Balances sum to 0');
    assertSettlementBalanced(r.transactions, r.balances, 'Settlement covers all debts');
}

console.log('\n========================================');
console.log('SCENARIO 24: Pure gift — one payer, one beneficiary');
console.log('A pays 200, split only among B');
console.log('========================================\n');
{
    const names = ['A', 'B'];
    const entries = [
        { description: 'Gift', amount: 200, payers: [{ name: 'A', amount: 200 }], splitAmong: ['B'] }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    assert(r.balances['A'] === 200, 'A is owed 200');
    assert(r.balances['B'] === -200, 'B owes 200');
    assert(r.transactions.length === 1, '1 transaction');
    assert(r.transactions[0].from === 'B', 'B pays A');
    assert(r.transactions[0].to === 'A', 'B pays A');
    assert(r.transactions[0].amount === 200, 'Amount is 200');
}

console.log('\n========================================');
console.log('SCENARIO 25: Large group — 20 people, one payer');
console.log('Person1 pays 500, split among all 20');
console.log('========================================\n');
{
    const names = Array.from({ length: 20 }, (_, i) => `P${i + 1}`);
    const entries = [
        { description: 'Party', amount: 500, payers: [{ name: 'P1', amount: 500 }], splitAmong: names }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances (P1..P5):', Object.fromEntries(Object.entries(r.balances).slice(0, 5)));
    console.log('Transactions count:', r.transactions.length);
    console.log('');

    // 500 / 20 = 25 each. P1: 500-25=475
    assert(r.balances['P1'] === 475, 'P1 is owed 475');
    names.slice(1).forEach(name => {
        assert(r.balances[name] === -25, `${name} owes 25`);
    });
    assert(r.transactions.length === 19, '19 transactions');
    assertBalancesZero(r.balances, 'Balances sum to 0');
    assertSettlementBalanced(r.transactions, r.balances, 'Settlement covers all debts');
}

console.log('\n========================================');
console.log('SCENARIO 26: Many small entries between same pair');
console.log('A pays 10 for B, five times');
console.log('========================================\n');
{
    const names = ['A', 'B'];
    const entries = [];
    for (let i = 0; i < 5; i++) {
        entries.push({ description: `Item${i + 1}`, amount: 10, payers: [{ name: 'A', amount: 10 }], splitAmong: ['B'] });
    }
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    assert(r.balances['A'] === 50, 'A is owed 50');
    assert(r.balances['B'] === -50, 'B owes 50');
    assert(r.transactions.length === 1, '1 consolidated transaction');
    assert(r.transactions[0].amount === 50, 'B pays A 50');
    assert(r.totalSpent === 50, 'Total spent is 50');
}

console.log('\n========================================');
console.log('SCENARIO 27: Split among single person (not the payer)');
console.log('A pays 75, split only among C (B exists but not in split)');
console.log('========================================\n');
{
    const names = ['A', 'B', 'C'];
    const entries = [
        { description: 'Favor', amount: 75, payers: [{ name: 'A', amount: 75 }], splitAmong: ['C'] }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    assert(r.balances['A'] === 75, 'A is owed 75');
    assert(r.balances['B'] === 0, 'B is uninvolved');
    assert(r.balances['C'] === -75, 'C owes 75');
    assert(r.transactions.length === 1, '1 transaction');
    assertBalancesZero(r.balances, 'Balances sum to 0');
}

console.log('\n========================================');
console.log('SCENARIO 28: Multi-payer where one payer pays a tiny amount');
console.log('A pays 99.99, B pays 0.01 for 100. Split among A,B,C');
console.log('========================================\n');
{
    const names = ['A', 'B', 'C'];
    const entries = [
        {
            description: 'Almost solo', amount: 100,
            payers: [{ name: 'A', amount: 99.99 }, { name: 'B', amount: 0.01 }],
            splitAmong: ['A', 'B', 'C']
        }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    // 100/3 = 33.33 each
    // A: 99.99 - 33.33 = 66.66
    // B: 0.01 - 33.33 = -33.32
    // C: 0 - 33.33 = -33.33
    assertClose(r.balances['A'], 66.66, 'A is owed ~66.66');
    assertClose(r.balances['B'], -33.32, 'B owes ~33.32');
    assertClose(r.balances['C'], -33.33, 'C owes ~33.33');
    assertBalancesZero(r.balances, 'Balances sum to ~0');
    assertSettlementBalanced(r.transactions, r.balances, 'Settlement covers all debts');
}

console.log('\n========================================');
console.log('SCENARIO 29: Mixed entries — some with splitAmong, some without');
console.log('Entry1: A pays 80, split A+B. Entry2: B pays 60, no splitAmong (defaults to all)');
console.log('========================================\n');
{
    const names = ['A', 'B', 'C'];
    const entries = [
        { description: 'Private', amount: 80, payers: [{ name: 'A', amount: 80 }], splitAmong: ['A', 'B'] },
        { description: 'Group', amount: 60, payers: [{ name: 'B', amount: 60 }], splitAmong: [] } // empty = all
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    // Entry1: 80/2=40 each → A owes 40, B owes 40
    // Entry2: 60/3=20 each → A owes 20, B owes 20, C owes 20
    // paid: A=80, B=60
    // owes: A=60, B=60, C=20
    // balances: A=20, B=0, C=-20
    assert(r.balances['A'] === 20, 'A is owed 20');
    assert(r.balances['B'] === 0, 'B is settled');
    assert(r.balances['C'] === -20, 'C owes 20');
    assertBalancesZero(r.balances, 'Balances sum to 0');
    assertSettlementBalanced(r.transactions, r.balances, 'Settlement covers all debts');
}

console.log('\n========================================');
console.log('SCENARIO 30: Decimal amount with 5-way split (precision stress)');
console.log('A pays 99.99, split among 5 people');
console.log('========================================\n');
{
    const names = ['A', 'B', 'C', 'D', 'E'];
    const entries = [
        { description: 'Precision', amount: 99.99, payers: [{ name: 'A', amount: 99.99 }], splitAmong: names }
    ];
    const r = calculateBalances(names, entries);
    console.log('Balances:', r.balances);
    console.log('Transactions:', r.transactions);
    console.log('');

    // 99.99 / 5 = 19.998 → 20.00 each rounded
    // A: 99.99 - 20.00 = 79.99
    // Others: 0 - 20.00 = -20.00
    assertClose(r.balances['A'], 79.99, 'A is owed ~79.99');
    assertBalancesZero(r.balances, 'Balances sum to ~0');
    assertSettlementBalanced(r.transactions, r.balances, 'Settlement covers all debts');
}

// ============================================================
// RESULTS
// ============================================================

console.log('\n========================================');
console.log(`RESULTS: ${passCount}/${testCount} passed, ${failCount} failed`);
console.log('========================================\n');

if (failCount > 0) {
    process.exit(1);
}
