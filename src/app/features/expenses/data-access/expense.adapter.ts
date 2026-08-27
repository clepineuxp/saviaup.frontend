import { Expense } from '../models/expense.model';
import { ExpenseDto } from './expense.contracts';

export function mapExpenseDtoToModel(dto: ExpenseDto): Expense {
  return {
    id: dto.id,
    consecutiveNumber: dto.consecutiveNumber,
    name: dto.name,
    description: dto.description,
    amount: dto.amount,
    isCashOut: dto.isCashOut,
    paymentMethod: dto.paymentMethod,
    supplier: dto.supplier ? { id: dto.supplier.id, name: dto.supplier.name } : null,
    expenseDate: dto.expenseDate,
    status: dto.status,
    annulledReason: dto.annulledReason,
    annulledAt: dto.annulledAt,
    annulledByUserName: dto.annulledByUserName,
    createdByUserName: dto.createdByUserName,
    lastModifiedByUserName: dto.lastModifiedByUserName,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
