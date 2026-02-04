
const quantity = 25;
const workflowRate = 0.40; // Simulated value from DB (not multiplied by 100)

// Backend logic simulation
const rate = Number(workflowRate) || 0;
const safeQuantity = Number(quantity) || 0;
const amount = Math.round(safeQuantity * rate);

console.log("Scenario 1: Rate is 0.40 (dollars)");
console.log("Rate:", rate);
console.log("Amount (cents):", amount);
console.log("Formatted:", (amount / 100).toFixed(2));

const workflowRateCorrect = 40; // Simulated value from DB (multiplied by 100)
const rate2 = Number(workflowRateCorrect) || 0;
const amount2 = Math.round(safeQuantity * rate2);

console.log("\nScenario 2: Rate is 40 (cents)");
console.log("Rate:", rate2);
console.log("Amount (cents):", amount2);
console.log("Formatted:", (amount2 / 100).toFixed(2));
