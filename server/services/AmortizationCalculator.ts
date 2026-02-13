/**
 * AmortizationCalculator - Logic for Loan Quotas and Penalties
 * Implements the French Amortization Method (Equal installments).
 */
export class AmortizationCalculator {
    /**
     * Calculates the monthly payment (PMT) using the French method.
     * Formula: P = [r * PV] / [1 - (1 + r)^-n]
     * @param principal Principal amount in cents
     * @param annualRate Annual interest rate (e.g., 12 for 12%)
     * @param termMonths Number of months
     */
    static calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
        if (annualRate === 0) return Math.ceil(principal / termMonths);

        const monthlyRate = annualRate / 12 / 100;
        const pmt = (monthlyRate * principal) / (1 - Math.pow(1 + monthlyRate, -termMonths));

        return Math.ceil(pmt);
    }

    /**
     * Generates a full amortization schedule.
     */
    static generateSchedule(principal: number, annualRate: number, termMonths: number, startDate: Date) {
        const monthlyPayment = this.calculateMonthlyPayment(principal, annualRate, termMonths);
        const monthlyRate = annualRate / 12 / 100;
        const schedule = [];

        let remainingBalance = principal;

        for (let i = 1; i <= termMonths; i++) {
            const interestPayment = Math.round(remainingBalance * monthlyRate);
            const principalPayment = i === termMonths ? remainingBalance : monthlyPayment - interestPayment;

            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + i);

            schedule.push({
                dueDate,
                amountDue: principalPayment + interestPayment,
                principalDue: principalPayment,
                interestDue: interestPayment,
                remainingBalance: Math.max(0, remainingBalance - principalPayment)
            });

            remainingBalance -= principalPayment;
        }

        return schedule;
    }

    /**
     * Calculates late penalties based on consecutive days overdue.
     * @param amount Principal due
     * @param daysOverdue Number of days past due
     * @param dailyRate Default daily penalty (e.g., 0.1 for 0.1% per day)
     */
    static calculatePenalty(amount: number, daysOverdue: number, dailyRate = 0.05): number {
        if (daysOverdue <= 0) return 0;
        // Simple progressive penalty: amount * rate * days
        return Math.round(amount * (dailyRate / 100) * daysOverdue);
    }
}
