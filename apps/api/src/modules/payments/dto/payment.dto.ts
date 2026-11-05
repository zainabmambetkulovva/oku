import { IsIn } from 'class-validator';
import { PaymentEventStatus } from '../providers/payment-provider';

export class SimulatePaymentDto {
  @IsIn(['SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED'])
  status: PaymentEventStatus;
}
