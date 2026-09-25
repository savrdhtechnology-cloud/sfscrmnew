import type { FinanceRepository, FinancialTransaction } from "./service";

type Actor = { userId: string; role: string };

function map(row: Record<string, unknown>): FinancialTransaction {
  return {
    id: String(row.id),
    applicationId: String(row.application_id),
    transactionType: row.transaction_type as FinancialTransaction["transactionType"],
    amount: Number(row.amount),
    utrOrTransactionId: String(row.utr_or_transaction_id),
    status: row.status as FinancialTransaction["status"]
  };
}

export class D1FinanceRepository implements FinanceRepository {
  constructor(
    private readonly db: D1Database,
    private readonly actor: Actor
  ) {}

  async createPendingTransaction(input: Omit<FinancialTransaction, "id" | "status">) {
    const id = crypto.randomUUID();
    const auditId = crypto.randomUUID();

    const statements = [
      this.db.prepare(
        `INSERT INTO scp_financial_transactions(
          id, application_id, transaction_type, amount, utr_or_transaction_id,
          status, created_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, 'pending', ?6)`
      ).bind(
        id,
        input.applicationId,
        input.transactionType,
        input.amount,
        input.utrOrTransactionId,
        this.actor.userId
      ),
      this.db.prepare(
        `INSERT INTO scp_audit_log(
          actor_user_id, actor_role, action, entity_type, entity_id,
          after_data, correlation_id
        ) VALUES (?1, ?2, 'CREATE_PENDING_TRANSACTION',
          'scp_financial_transactions', ?3, ?4, ?5)`
      ).bind(
        this.actor.userId,
        this.actor.role,
        id,
        JSON.stringify({ ...input, status: "pending" }),
        auditId
      )
    ];

    await this.db.batch(statements);

    const row = await this.db
      .prepare("SELECT * FROM scp_financial_transactions WHERE id = ?1")
      .bind(id)
      .first<Record<string, unknown>>();

    if (!row) throw new Error("Transaction creation failed");
    return map(row);
  }

  async verifyTransaction(transactionId: string, financeUserId: string, notes?: string) {
    const verifier = await this.db
      .prepare("SELECT role, is_active FROM scp_users WHERE id = ?1")
      .bind(financeUserId)
      .first<{ role: string; is_active: number }>();

    if (!verifier || verifier.is_active !== 1 || !["finance", "owner"].includes(verifier.role)) {
      throw new Error("Only Finance or Owner can verify transactions");
    }

    const tx = await this.db
      .prepare("SELECT * FROM scp_financial_transactions WHERE id = ?1")
      .bind(transactionId)
      .first<Record<string, unknown>>();

    if (!tx || tx.status !== "pending") {
      throw new Error("Transaction not found or is not pending");
    }

    const correlationId = crypto.randomUUID();
    const statements = [
      this.db.prepare(
        `UPDATE scp_financial_transactions
         SET status='verified', verified_by=?1, verified_at=CURRENT_TIMESTAMP,
             verification_notes=?2
         WHERE id=?3 AND status='pending'`
      ).bind(financeUserId, notes ?? null, transactionId),
      this.db.prepare(
        `INSERT INTO scp_audit_log(
          actor_user_id, actor_role, action, entity_type, entity_id,
          before_data, after_data, correlation_id
        ) VALUES (?1, ?2, 'VERIFY_TRANSACTION',
          'scp_financial_transactions', ?3, ?4, ?5, ?6)`
      ).bind(
        financeUserId,
        verifier.role,
        transactionId,
        JSON.stringify(tx),
        JSON.stringify({ ...tx, status: "verified", verified_by: financeUserId }),
        correlationId
      )
    ];

    if (tx.transaction_type === "lender_disbursement") {
      statements.push(
        this.db.prepare(
          "UPDATE scp_loan_applications SET status='disbursed', updated_at=CURRENT_TIMESTAMP WHERE id=?1"
        ).bind(String(tx.application_id))
      );
    }

    await this.db.batch(statements);

    const row = await this.db
      .prepare("SELECT * FROM scp_financial_transactions WHERE id = ?1")
      .bind(transactionId)
      .first<Record<string, unknown>>();

    if (!row || row.status !== "verified") throw new Error("Verification failed");
    return map(row);
  }

  async createCommissionFromVerifiedDisbursement(args: {
    transactionId: string;
    beneficiaryType: "partner" | "employee" | "company";
    beneficiaryId?: string;
    rate: number;
    ruleSnapshot?: unknown;
  }) {
    if (args.rate < 0) throw new Error("Commission rate cannot be negative");

    const tx = await this.db.prepare(
      `SELECT * FROM scp_financial_transactions
       WHERE id=?1 AND transaction_type='lender_disbursement' AND status='verified'`
    ).bind(args.transactionId).first<Record<string, unknown>>();

    if (!tx) throw new Error("Commission requires a verified lender disbursement");

    const id = crypto.randomUUID();
    const amount = Math.round(Number(tx.amount) * args.rate * 100) / 100;

    await this.db.prepare(
      `INSERT INTO scp_commission_ledger(
        id, application_id, source_transaction_id, beneficiary_type,
        beneficiary_id, basis_amount, rate, commission_amount, rule_snapshot
      ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)`
    ).bind(
      id,
      String(tx.application_id),
      args.transactionId,
      args.beneficiaryType,
      args.beneficiaryId ?? null,
      Number(tx.amount),
      args.rate,
      amount,
      JSON.stringify(args.ruleSnapshot ?? {})
    ).run();

    return { id, commissionAmount: amount };
  }
}
