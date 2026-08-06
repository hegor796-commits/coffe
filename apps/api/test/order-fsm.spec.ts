import { OrderEvent, OrderStatus, canTransition, nextStatus } from '@coffee/shared';

describe('Машина состояний заказа', () => {
  it('offline: created → accepted → preparing → ready → completed', () => {
    expect(nextStatus(OrderStatus.Created, OrderEvent.Accept)).toBe(OrderStatus.Accepted);
    expect(nextStatus(OrderStatus.Accepted, OrderEvent.StartPreparing)).toBe(OrderStatus.Preparing);
    expect(nextStatus(OrderStatus.Preparing, OrderEvent.MarkReady)).toBe(OrderStatus.Ready);
    expect(nextStatus(OrderStatus.Ready, OrderEvent.Complete)).toBe(OrderStatus.Completed);
  });

  it('online: created → pending_payment → paid → accepted', () => {
    expect(nextStatus(OrderStatus.Created, OrderEvent.Pay)).toBe(OrderStatus.PendingPayment);
    expect(nextStatus(OrderStatus.PendingPayment, OrderEvent.Pay)).toBe(OrderStatus.Paid);
    expect(nextStatus(OrderStatus.Paid, OrderEvent.Accept)).toBe(OrderStatus.Accepted);
  });

  it('автоотмена возможна только до принятия', () => {
    expect(canTransition(OrderStatus.Created, OrderEvent.AutoCancel)).toBe(true);
    expect(canTransition(OrderStatus.Paid, OrderEvent.AutoCancel)).toBe(true);
    expect(canTransition(OrderStatus.Accepted, OrderEvent.AutoCancel)).toBe(false);
    expect(canTransition(OrderStatus.Ready, OrderEvent.AutoCancel)).toBe(false);
  });

  it('из терминальных статусов переходов нет', () => {
    expect(nextStatus(OrderStatus.Completed, OrderEvent.Complete)).toBeNull();
    expect(nextStatus(OrderStatus.Rejected, OrderEvent.Accept)).toBeNull();
    expect(nextStatus(OrderStatus.AutoCancelled, OrderEvent.Accept)).toBeNull();
  });

  it('нельзя пропускать этапы (ready нельзя из accepted)', () => {
    expect(canTransition(OrderStatus.Accepted, OrderEvent.MarkReady)).toBe(false);
    expect(canTransition(OrderStatus.Created, OrderEvent.Complete)).toBe(false);
  });

  it('клиент может отменить только до принятия', () => {
    expect(canTransition(OrderStatus.Created, OrderEvent.CancelByClient)).toBe(true);
    expect(canTransition(OrderStatus.Accepted, OrderEvent.CancelByClient)).toBe(false);
  });
});
