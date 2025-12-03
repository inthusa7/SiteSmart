// src/app/technician/wallet/wallet.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

type TxType = 'topup' | 'customer_payment' | 'commission' | 'withdrawal' | 'manual_credit';
type TxStatus = 'completed' | 'pending' | 'failed';

type Tx = {
  id: number;
  type: TxType;
  title: string;
  date: string; // ISO date string (YYYY-MM-DD)
  amount: number; // positive amounts
  status?: TxStatus;
};

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './wallet.component.html',
  styleUrls: ['./wallet.component.css']
})
export class WalletComponent {
  // canonical state
  transactions: Tx[] = [];

  // derived balance (kept consistent by calling recalculateBalance())
  balance = 0;

  // forms
  withdrawForm!: FormGroup;
  addFundsForm!: FormGroup; // topup form
  simulatePaymentForm!: FormGroup; // simulate customer payment

  submittingWithdraw = false;
  submittingAdd = false;
  statusMsg = '';
  showWithdraw = false;

  // commission rate (10% default)
  commissionRate = 0.10;

  constructor(private fb: FormBuilder) {
    // forms
    this.withdrawForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(1)]],
      method: ['bank', [Validators.required]],
      account: ['', Validators.required]
    });

    this.addFundsForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(1)]],
      source: ['card', Validators.required]
    });

    this.simulatePaymentForm = this.fb.group({
      amount: [10000, [Validators.required, Validators.min(1)]],
      jobTitle: ['Job — Customer Payment', Validators.required]
    });

    // seed example transactions
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    this.transactions = [
      // topups increase wallet balance
      { id: 1, type: 'topup', title: 'Top-up (Card)', date: iso(new Date(today.getFullYear(), today.getMonth(), 3)), amount: 5000, status: 'completed' },
      // a past customer payment (income only)
      { id: 2, type: 'customer_payment', title: 'Job #101 — Customer Payment', date: iso(new Date(today.getFullYear(), today.getMonth(), 5)), amount: 10000, status: 'completed' },
      // commission for that job that *was* deducted
      { id: 3, type: 'commission', title: 'Commission (10%) for Job #101', date: iso(new Date(today.getFullYear(), today.getMonth(), 5)), amount: 1000, status: 'completed' },
      // older topup
      { id: 4, type: 'topup', title: 'Top-up (Card)', date: iso(new Date(today.getFullYear(), today.getMonth() - 1, 22)), amount: 2000, status: 'completed' }
    ];

    // compute initial balance from transactions (only topup/manual_credit minus commission/withdrawal)
    this.recalculateBalance();
  }

  /* ---------- Core business logic ---------- */

  /**
   * Recompute balance from transactions.
   * Wallet balance rules:
   *  - topup/manual_credit => +amount
   *  - commission/withdrawal => -amount
   *  - customer_payment => does NOT affect wallet balance (income only)
   */
  recalculateBalance() {
    let bal = 0;
    for (const t of this.transactions) {
      if (t.type === 'topup' || t.type === 'manual_credit') {
        bal += t.amount;
      } else if (t.type === 'commission' || t.type === 'withdrawal') {
        bal -= t.amount;
      } // customer_payment ignored for wallet arithmetic
    }
    this.balance = Math.round(bal * 100) / 100;
  }

  /**
   * Add a top-up (technician deposits money into wallet)
   */
  topUp() {
    if (this.addFundsForm.invalid) {
      this.addFundsForm.markAllAsTouched();
      return;
    }
    const amt = Number(this.addFundsForm.value.amount);
    const src = this.addFundsForm.value.source;
    this.submittingAdd = true;
    setTimeout(() => {
      this.submittingAdd = false;
      const tx: Tx = {
        id: Date.now(),
        type: 'topup',
        title: `Top-up (${src})`,
        date: new Date().toISOString().slice(0, 10),
        amount: amt,
        status: 'completed'
      };
      this.transactions.unshift(tx);
      this.addFundsForm.reset({ source: 'card' });
      this.recalculateBalance();
      this.statusMsg = `Top-up of Rs ${amt.toFixed(2)} added to wallet.`;
      setTimeout(() => (this.statusMsg = ''), 3000);
    }, 700);
  }

  /**
   * Simulate a customer payment.
   * - Customer payment is recorded (income) but does NOT increase wallet balance.
   * - Commission is attempted to be deducted from wallet. If wallet balance is sufficient, commission is deducted (commission tx added).
   * - If wallet balance is insufficient, commission is NOT deducted and user gets a message to top up (no commission tx created).
   */
  simulateCustomerPayment() {
    if (this.simulatePaymentForm.invalid) {
      this.simulatePaymentForm.markAllAsTouched();
      return;
    }

    const amt = Number(this.simulatePaymentForm.value.amount);
    const title = this.simulatePaymentForm.value.jobTitle || 'Customer Payment';

    // Always record the customer payment (income only)
    const paymentTx: Tx = {
      id: Date.now(),
      type: 'customer_payment',
      title,
      date: new Date().toISOString().slice(0, 10),
      amount: amt,
      status: 'completed'
    };
    this.transactions.unshift(paymentTx);

    // Calculate commission = commissionRate * amt
    const commissionAmt = Math.round((amt * this.commissionRate) * 100) / 100;

    // Check if wallet has enough balance to cover commission
    // Recalculate to ensure balance is current
    this.recalculateBalance();
    if (commissionAmt <= this.balance) {
      // Deduct commission from wallet
      const commissionTx: Tx = {
        id: Date.now() + 1,
        type: 'commission',
        title: `Commission (${(this.commissionRate * 100).toFixed(0)}%) for ${title}`,
        date: new Date().toISOString().slice(0, 10),
        amount: commissionAmt,
        status: 'completed'
      };
      this.transactions.unshift(commissionTx);
      this.recalculateBalance();
      this.statusMsg = `Received Rs ${amt.toFixed(2)} from customer. Commission Rs ${commissionAmt.toFixed(2)} deducted from wallet.`;
      setTimeout(() => (this.statusMsg = ''), 3500);
    } else {
      // Commission can't be deducted — inform technician to top-up
      this.statusMsg = `Customer paid Rs ${amt.toFixed(2)}. Commission Rs ${commissionAmt.toFixed(2)} could not be deducted due to insufficient wallet balance. Please top up the wallet.`;
      setTimeout(() => (this.statusMsg = ''), 6000);
      // commission tx NOT created until wallet has sufficient funds
    }

    // reset simulate form optionally
    this.simulatePaymentForm.reset({ amount: 0, jobTitle: '' });
  }

  /**
   * Request a withdrawal (deducts from wallet and adds a withdrawal tx)
   */
  requestWithdraw() {
    if (this.withdrawForm.invalid) {
      this.withdrawForm.markAllAsTouched();
      return;
    }
    const amt = Number(this.withdrawForm.value.amount);
    // ensure balance up-to-date
    this.recalculateBalance();
    if (amt > this.balance) {
      this.statusMsg = 'Insufficient balance for this withdrawal.';
      setTimeout(() => (this.statusMsg = ''), 3000);
      return;
    }

    this.submittingWithdraw = true;
    setTimeout(() => {
      this.submittingWithdraw = false;
      const tx: Tx = {
        id: Date.now(),
        type: 'withdrawal',
        title: `Withdrawal (${this.withdrawForm.value.method})`,
        date: new Date().toISOString().slice(0, 10),
        amount: amt,
        status: 'pending'
      };
      this.transactions.unshift(tx);
      this.withdrawForm.reset({ method: 'bank', account: '' });
      this.recalculateBalance();
      this.statusMsg = 'Withdrawal requested — processing (simulated).';
      setTimeout(() => (this.statusMsg = ''), 3000);
    }, 900);
  }

  /* ---------- Helpers & computed properties ---------- */

  txClass(tx: Tx) {
    if (tx.type === 'commission' || tx.type === 'withdrawal') return 'tx-debit';
    return 'tx-credit';
  }

  fmtDate(d: string) {
    return d;
  }

  private isSameMonth(dateIso: string) {
    const d = new Date(dateIso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  // totals for the current month for reporting (customer payments only for income)
  get totalMonthIncome(): number {
    return this.transactions
      .filter(t => t.type === 'customer_payment' && this.isSameMonth(t.date))
      .reduce((s, t) => s + t.amount, 0);
  }

  get totalMonthCommissionPaid(): number {
    return this.transactions
      .filter(t => t.type === 'commission' && this.isSameMonth(t.date))
      .reduce((s, t) => s + t.amount, 0);
  }

  get totalMonthTopups(): number {
    return this.transactions
      .filter(t => t.type === 'topup' && this.isSameMonth(t.date))
      .reduce((s, t) => s + t.amount, 0);
  }

  /**
   * Scroll to the withdraw card in the template and highlight briefly.
   */
  scrollToWithdraw() {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('withdraw');
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.add('highlight-pulse');
      setTimeout(() => el.classList.remove('highlight-pulse'), 800);
    }
  }
  toggleWithdraw() {
  this.showWithdraw = !this.showWithdraw;
}
// returns amount of the most recent topup transaction, or null if none
get lastTopupAmount(): number | null {
  const t = this.transactions.find(tx => tx.type === 'topup');
  return t ? t.amount : null;
}

// returns amount of the most recent commission transaction, or null if none
get lastCommissionAmount(): number | null {
  const t = this.transactions.find(tx => tx.type === 'commission');
  return t ? t.amount : null;
}

}
